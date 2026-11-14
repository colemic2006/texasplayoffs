#!/usr/bin/env python3
"""
In-season pipeline: UIL brackets -> season workbook -> public/data/{year}.json

  python3 scripts/season.py prefill --year 2026   # pull teams/scores into the workbook
  python3 scripts/season.py build   --year 2026   # workbook -> public/data/2026.json

The workbook (season/{year}/{year}_season.xlsx) is the source of truth. prefill only
adds games and fills blank teams/scores; it never touches the Chapter column, so
the chapter assignments typed into the workbook are always kept.

Game sites (Site/Date columns) come from each MaxPreps matchup's details card, or are typed
in; `locate` turns them into map coordinates (game_sites.py) for the Brackets map.

Team names go through team_names.py: a source name ("Martin") becomes the site's name
("Arlington Martin") only when that is certain or a person confirmed it. Doubtful names
keep the source spelling, show as "Name (?)" on the site, and are listed on the
workbook's Team Names tab (and season/{year}/team_names_review.json) to be confirmed.

Bracket sources, in order:
  1. UIL bracket PDFs posted on uiltexas.org (parsed with uil_bracket.py)
  2. The MaxPreps bracket each UIL bracket page embeds (best effort; MaxPreps
     often refuses automated requests)
"""
import argparse, datetime, json, os, re, sys, tempfile, time, urllib.request
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from uil_bracket import parse as parse_pdf, norm, sim  # noqa: E402
from team_names import Resolver  # noqa: E402
import game_sites  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
CLASSES = ['1A D1', '1A D2', '2A D1', '2A D2', '3A D1', '3A D2',
           '4A D1', '4A D2', '5A D1', '5A D2', '6A D1', '6A D2']
ROUNDS = {1: 'Bi-District', 2: 'Area', 3: 'Regionals', 4: 'Quarterfinals', 5: 'Semifinals', 6: 'Championship'}
UIL = 'https://www.uiltexas.org'
UA = 'Mozilla/5.0 (compatible; texasplayoffs.com bracket sync)'
FIRST_ROW, LAST_ROW = 2, 801          # Games tab rows the template formats
COL = dict(week='A', cls='C', chapter='D', team1='E', score1='F', team2='G', score2='H', forfeit='I', notes='K',
           key1='M', key2='N',     # M/N: which source team each name came from (MaxPreps school id)
           site='O', date='P',     # game site ("Stadium, City") and date, from MaxPreps or typed in
           time='Q')               # kickoff ("7:00 PM")
NO_ID = '00000000-0000-0000-0000-000000000000'


def workbook_path(year):
    return ROOT / 'season' / str(year) / f'{year}_season.xlsx'


def fetch(url, binary=False):
    req = urllib.request.Request(url, headers={'User-Agent': UA})
    with urllib.request.urlopen(req, timeout=45) as r:
        data = r.read()
    return data if binary else data.decode('utf-8', 'replace')


# ── sources ──────────────────────────────────────────────────────────────

def uil_pdf_urls(year):
    """Bracket PDF links for this season found on UIL's football pages, newest per class."""
    pages = [f'{UIL}/football/playoff-brackets', f'{UIL}/football/archives'] + \
            [f'{UIL}/football/playoff-brackets/{c.replace(" ", "")}' for c in CLASSES]
    found = {}
    for p in pages:
        try:
            html = fetch(p)
        except Exception as e:
            print(f'  ! {p}: {e}')
            continue
        for href in re.findall(r'href="([^"]+\.pdf)"', html, re.I):
            m = re.search(rf'brackets/football/{year}_(\dA)-(D\d)[^/]*\.pdf$', href, re.I)
            if m:
                cls = f'{m.group(1).upper()} {m.group(2).upper()}'
                url = href if href.startswith('http') else UIL + href
                found.setdefault(cls, set()).add(url)
    # several revisions may be posted (…Bracket-1.pdf, …Bracket-2.pdf); take the highest
    rev = lambda u: [int(n) for n in re.findall(r'(\d+)\.pdf$', u)] or [0]
    return {c: max(urls, key=rev) for c, urls in found.items()}


# bracket slots that aren't a real team yet ("Winner G12", "W3", "TBD", ...)
PLACEHOLDER = re.compile(r'^((winner|loser)\s+(of\s+)?g(ame)?\s*\d+|[wr]\s*\d+|tbd|tba|bye|\?)$', re.I)


def real_teams(g):
    return all(g[k] and not PLACEHOLDER.match(g[k].strip()) for k in ('team1', 'team2'))


def games_from_pdf(url, cls):
    with tempfile.NamedTemporaryFile(suffix='.pdf') as f:
        f.write(fetch(url, binary=True)); f.flush()
        games, issues = parse_pdf(f.name)
    for i in issues:
        if 'state final' not in i:
            print(f'  ! {cls}: {i}')
    out = []
    for g in games:
        s1 = s2 = None
        if g['ws'] is not None:
            s1, s2 = (g['ws'], g['ls']) if g['winner'] == g['team1'] else (g['ls'], g['ws'])
        # 1A has one round fewer and an open week before the final, which is played with everyone else's
        week = 6 if cls.startswith('1A') and g['round'] == 5 else g['round']
        out.append(dict(week=week, cls=cls, team1=g['team1'], team2=g['team2'], score1=s1, score2=s2,
                        key1=f"uil:{g['team1']}", key2=f"uil:{g['team2']}"))
    return out


def games_from_maxpreps(cls, year):
    from bs4 import BeautifulSoup
    page = fetch(f'{UIL}/football/playoff-brackets/{cls.replace(" ", "")}')
    m = re.search(r'https://www\.maxpreps\.com/tournament/view\.aspx[^"]+', page)
    if not m:
        return []
    soup = BeautifulSoup(fetch(m.group(0).replace('&amp;', '&')), 'html.parser')
    title = soup.title.get_text() if soup.title else ''
    if str(year) not in title:
        print(f'  ! {cls}: MaxPreps bracket is for another season ({title.strip()[:60]})')
        return []
    starts = sorted({a['title'][:10] for a in soup.select('abbr.start-date[title]')})
    if not starts:
        return []
    first = datetime.date.fromisoformat(starts[0])
    first -= datetime.timedelta(days=first.weekday())   # playoff weeks run Monday-Sunday
    out = []
    for rnd in soup.select('div.round'):
        d = rnd.select_one('abbr.start-date[title]')
        if not d:
            continue
        week = min(6, 1 + (datetime.date.fromisoformat(d['title'][:10]) - first).days // 7)
        for mu in rnd.select('li.matchup-container'):
            teams = mu.select('li.team')
            if len(teams) != 2:
                continue
            names = [(t.select_one('.name').get_text(strip=True) if t.select_one('.name') else '') for t in teams]
            if not all(names):
                continue
            scores = []
            for t in teams:
                el = t.select_one('[class*="score"]')
                txt = el.get_text(strip=True) if el else ''
                scores.append(int(txt) if txt.isdigit() else None)
            ids = [t.get('data-school-id') for t in teams]
            keys = [f'mp:{i}' if i and i != NO_ID else f'mp-name:{cls}:{n}' for i, n in zip(ids, names)]
            card = mu.select_one('[data-hover-card]')
            out.append(dict(week=week, cls=cls, team1=names[0], team2=names[1], score1=scores[0], score2=scores[1],
                            key1=keys[0], key2=keys[1],
                            card=('https://www.maxpreps.com' + card['data-hover-card'].replace('&amp;', '&')) if card else None))
    return out


# ── workbook ─────────────────────────────────────────────────────────────

def open_workbook(year, create=False):
    from openpyxl import load_workbook
    path = workbook_path(year)
    if not path.exists():
        if not create:
            sys.exit(f'No workbook at {path}')
        import subprocess
        path.parent.mkdir(parents=True, exist_ok=True)
        subprocess.run([sys.executable, str(Path(__file__).parent / 'season_template.py'), str(path), str(year)], check=True)
    return load_workbook(path), path


def read_rows(ws):
    rows = []
    for r in range(FIRST_ROW, LAST_ROW + 1):
        v = {k: ws[f'{c}{r}'].value for k, c in COL.items()}
        v['row'] = r
        for k in ('chapter', 'team1', 'team2', 'cls', 'forfeit', 'notes', 'key1', 'key2', 'site', 'date', 'time'):
            v[k] = str(v[k]).strip() if v[k] not in (None, '') else None
        rows.append(v)
    return rows


REVIEW_SHEET = 'Team Names'


def cards_path(year):
    return ROOT / 'season' / str(year) / 'maxpreps_cards.json'


def read_card(url):
    """Date and site from a MaxPreps matchup details card (empty strings when not set yet)."""
    from bs4 import BeautifulSoup
    soup = BeautifulSoup(json.loads(fetch(url)).get('html', ''), 'html.parser')
    date = soup.select_one('abbr.date[title]')
    desc = ''
    share = soup.select_one('[data-social-json]')
    if share:
        try:
            desc = json.loads(share['data-social-json']).get('description', '')
        except ValueError:
            pass
    site = ''
    el = soup.select_one('[class*="location"], [class*="venue"], [class*="site"]')
    if el:
        site = el.get_text(' ', strip=True)
    if not site:
        m = re.search(r'\bat ([^.()]+?(?:\([^)]*\))?)\s*\.?\s*$', desc)
        if m and 'date has not been set' not in desc:
            site = m.group(1).strip()
    t = re.search(r'@\s*(\d{1,2})(?::(\d\d))?\s*([ap])\b', desc, re.I)
    kickoff = f"{int(t.group(1))}:{t.group(2) or '00'} {t.group(3).upper()}M" if t else ''
    return dict(date=date['title'][:10] if date and not date['title'].startswith('1900') else '',
                time=kickoff, site=site, description=desc)


def date_set(info):
    """MaxPreps shows a placeholder date (the round's first day) until a game's date is set."""
    return bool(info.get('date')) and 'date has not been set' not in info.get('description', '')


def changes_path(year):
    return ROOT / 'season' / str(year) / 'changes.json'


def load_changes(year):
    return json.loads(changes_path(year).read_text()) if changes_path(year).exists() else []


def save_changes(year, changes):
    changes_path(year).write_text(json.dumps(changes, indent=1) + '\n')


def now_iso():
    return datetime.datetime.now(datetime.timezone.utc).isoformat(timespec='minutes')


def scores_path(year):
    return ROOT / 'season' / str(year) / 'filled_scores.json'


# scores the job itself wrote, per game ("cls|key1|key2" -> [score1, score2]): those follow the
# source when it corrects them; a score typed in by hand is kept and flagged instead
FILLED_SCORES = {}


def score_text(r, s1, s2):
    return f"{r['team1']} {s1}, {r['team2']} {s2}"


def set_score(year, ws, r, s1, s2, source_label):
    """Fill or correct a game's score from the source. Returns True when the workbook changed."""
    key = f"{r['cls']}|{r['key1']}|{r['key2']}"
    cur = (r['score1'], r['score2'])
    if cur == (s1, s2):
        FILLED_SCORES.setdefault(key, [s1, s2])
        return False
    if cur == (None, None) or FILLED_SCORES.get(key) == list(cur):
        ws[f'{COL["score1"]}{r["row"]}'], ws[f'{COL["score2"]}{r["row"]}'] = s1, s2
        r['score1'], r['score2'] = s1, s2
        FILLED_SCORES[key] = [s1, s2]
        print(f'  {"score from" if cur == (None, None) else "score corrected by"} {source_label}: {score_text(r, s1, s2)}')
        return True
    game = dict(classification=r['cls'], week=r['week'], team1=r['team1'], team2=r['team2'])
    note_conflict(year, game, 'score', score_text(r, *cur), score_text(r, s1, s2))
    return False


def note_conflict(year, game, field, shown, source):
    """The source (MaxPreps / UIL) now lists a different value than one the owner set by hand."""
    changes = load_changes(year)
    for c in changes:
        if c.get('status') == 'conflict' and c['field'] == field and c['new'] == source and \
                {c['team1'], c['team2']} == {game['team1'], game['team2']} and c['classification'] == game['classification']:
            return   # already flagged
    changes.append(dict(game, field=field, old=shown, new=source, at=now_iso(), status='conflict'))
    save_changes(year, changes)
    print(f'  ! {game["team1"]} v {game["team2"]}: source now lists {field} {source!r}; the site keeps {shown!r} (set by hand)')


def card_score(desc, g):
    """(team1 score, team2 score) in the source game's order, from a final card's description, or None."""
    m = re.search(r'^The (.+?) varsity football team (won|lost|tied)\b.*?\bagainst (.+?) by a score of (\d+)\s*-\s*(\d+)', desc or '')
    if not m:
        return None
    clean = lambda s: re.sub(r'\s*\(.*?\)', '', s).strip()
    subject, opponent = clean(m.group(1)), clean(m.group(3))
    a, b = int(m.group(4)), int(m.group(5))
    mine, theirs = (max(a, b), min(a, b)) if m.group(2) == 'won' else (min(a, b), max(a, b)) if m.group(2) == 'lost' else (a, b)
    t1, t2 = clean(g['team1']), clean(g['team2'])
    s1, s2 = sim(subject, t1), sim(subject, t2)
    if max(s1, s2) < 0.8 or s1 == s2:
        return None   # can't tell whose score is whose: leave it for the bracket page
    # until a new game is played, MaxPreps' card for it still describes the team's last game:
    # the opponent must be this game's other team, or the score is from a different game
    if sim(opponent, t2 if s1 > s2 else t1) < 0.8:
        return None
    return (mine, theirs) if s1 > s2 else (theirs, mine)


def fill_sites(year, ws, placed):
    """Fill Site/Date cells from MaxPreps details cards. A card is read again on each run (at
    most every 10 minutes) until the game has a site, a set date and a kickoff time. A site typed in by hand is kept; the
    date follows MaxPreps (a placeholder date is never used)."""
    cards = json.loads(cards_path(year).read_text()) if cards_path(year).exists() else {}
    now = datetime.datetime.now(datetime.timezone.utc)
    filled = 0
    for r, g in placed:
        if r['site'] and r['site'].lower().startswith('game details'):
            # raw card text from before sites were cleaned up
            ws[f'{COL["site"]}{r["row"]}'] = r['site'] = game_sites.clean_site(r['site']) or None
            filled += 1
        if not g.get('card'):
            continue
        key = f"{g['cls']}|{g['key1']}|{g['key2']}"
        seen = cards.get(key, {})
        recent = seen.get('read') and (now - datetime.datetime.fromisoformat(seen['read'])).total_seconds() < 12 * 60   # the job runs every 15 minutes
        played = r.get('score1') is not None and r.get('score2') is not None
        if played and r.get('date'):
            try:   # keep reading a finished game's card for 3 days, to catch corrected scores
                played = (datetime.date.today() - datetime.date.fromisoformat(str(r['date'])[:10])).days > 3
            except ValueError:
                pass
        # games not yet played are read again on every run, so a moved date, kickoff or site
        # is caught within 15 minutes (a complete card used to be read only once)
        if seen.get('read') and (recent or played):
            info = seen          # just read, or already played
        else:
            try:
                info = read_card(g['card'])
            except Exception as e:
                print(f'  ! card for {g["team1"]} v {g["team2"]}: {e}')
                continue
            info['read'] = now.isoformat(timespec='seconds')
            info.update({k: v for k, v in seen.items() if k.startswith('filled_')})   # keep what the job wrote
            cards[key] = info
            time.sleep(1.0)   # be gentle with MaxPreps
        # final score from the card ("... won Thursday's home playoff game against X by a score of 35-14"),
        # for when the bracket page hasn't posted it yet; only fills an empty score
        fin = card_score(info.get('description', ''), g)
        if fin:
            s1, s2 = fin if r['key1'] == g['key1'] else fin[::-1]
            if set_score(year, ws, r, s1, s2, 'MaxPreps card'):
                filled += 1
        site = game_sites.clean_site(info.get('site'))
        prev_site = game_sites.clean_site(seen.get('site'))
        game = dict(classification=r['cls'], week=r['week'], team1=r['team1'], team2=r['team2'])
        if site and not r['site']:
            ws[f'{COL["site"]}{r["row"]}'] = r['site'] = site
            cards.setdefault(key, info)['filled_site'] = site
            filled += 1
        elif site and site != r['site']:
            # the source moved the game: follow it when the site shown is the source's old one
            # (or one the job filled in); a site typed in by hand is kept and flagged instead
            if r['site'] in (prev_site, seen.get('filled_site')):
                ws[f'{COL["site"]}{r["row"]}'] = r['site'] = site
                cards.setdefault(key, info)['filled_site'] = site
                filled += 1
            elif site != prev_site:
                note_conflict(year, game, 'site', r['site'], site)
        # dates and kickoffs: the job only ever changes values it filled in itself
        # (remembered per game as filled_date / filled_time); the owner's are never touched
        for k, val in (('date', info['date'] if date_set(info) else ''),
                       ('time', info.get('time', '') if date_set(info) else '')):
            if k == 'time' and 'time' not in info:
                continue   # card saved before kickoffs were read: says nothing about the time
            old = str(r[k] or '')[:10] if k == 'date' else str(r[k] or '')
            if not val and old:
                continue   # MaxPreps drops the kickoff once a game is under way: never erase a known value
            mine = not old or old == cards.get(key, {}).get(f'filled_{k}')
            if mine and old != val:
                ws[f'{COL[k]}{r["row"]}'] = r[k] = val or None
                cards.setdefault(key, info)[f'filled_{k}'] = val
                filled += 1
            elif not mine and val and old != val and val != (seen.get(k) if date_set(seen) else ''):
                # the source changed a value the owner set by hand: keep the owner's, flag it
                note_conflict(year, game, k, old, val)
    cards_path(year).write_text(json.dumps(cards, indent=1, sort_keys=True) + '\n')
    with_site = sum(1 for c in cards.values() if game_sites.clean_site(c.get('site')))
    print(f'  cards: {len(cards)} read, {with_site} with a site')
    return filled


def review_path(year):
    return ROOT / 'season' / str(year) / 'team_names_review.json'


def take_answers(wb, resolver):
    """Move answers typed on the Team Names tab into the confirmed list. Returns how many."""
    if REVIEW_SHEET not in wb.sheetnames:
        return 0
    ws, n = wb[REVIEW_SHEET], 0
    for r in range(3, ws.max_row + 1):
        key, source, rec, answer = (ws[f'{c}{r}'].value for c in 'ABEG')
        answer = str(answer).strip() if answer not in (None, '') else ''
        if key and answer:
            resolver.confirm(key, rec if answer.upper() == 'OK' else answer)
            n += 1
    return n


def write_review(wb, year, review):
    from openpyxl.styles import Font, PatternFill, Alignment
    if REVIEW_SHEET in wb.sheetnames:
        del wb[REVIEW_SHEET]
    ws = wb.create_sheet(REVIEW_SHEET, 1)
    ws['B1'] = ('Team names to confirm. In "Your answer" type OK to use the recommended name, or type the '
                'correct name. Until then the game shows "Name (?)" on the site and is not merged with any other team.')
    ws['B1'].font = Font(name='Arial', size=10, bold=True)
    ws['B1'].alignment = Alignment(wrap_text=True)
    ws.merge_cells('B1:G1'); ws.row_dimensions[1].height = 34
    for i, (h, w) in enumerate([('Source id', 6), ('Name as written', 24), ('Class', 8), ('Opponent', 22),
                                ('Recommended', 30), ('Other options', 44), ('Your answer', 30)]):
        c = ws.cell(row=2, column=i + 1, value=h)
        c.font = Font(name='Arial', size=10, bold=True, color='FFFFFF')
        c.fill = PatternFill('solid', fgColor='1F1B16')
        ws.column_dimensions[c.column_letter].width = w
    for r, e in enumerate(review, 3):
        for col, v in zip('ABCDEF', (e['key'], e['source_name'], e['classification'], e['opponent'],
                                     e['recommended'], ', '.join(e['other_options']))):
            ws[f'{col}{r}'] = v; ws[f'{col}{r}'].font = Font(name='Arial', size=10)
        ws[f'G{r}'].fill = PatternFill('solid', fgColor='FFF2B3')
    ws.column_dimensions['A'].hidden = True
    ws.freeze_panes = 'B3'
    review_path(year).write_text(json.dumps(review, indent=2) + '\n')


def prefill(year):
    wb, path = open_workbook(year, create=True)
    ws = wb['Games']
    if not ws['M1'].value:
        ws['M1'], ws['N1'] = 'Team 1 source', 'Team 2 source'
        ws.column_dimensions['M'].hidden = ws.column_dimensions['N'].hidden = True
    if not ws['O1'].value:
        ws['O1'], ws['P1'] = 'Site (Stadium, City)', 'Date'
        ws.column_dimensions['O'].width, ws.column_dimensions['P'].width = 34, 12
    if not ws['Q1'].value:
        ws['Q1'] = 'Time'; ws.column_dimensions['Q'].width = 10
    resolver = Resolver(ROOT, year)
    FILLED_SCORES.clear()
    if scores_path(year).exists():
        FILLED_SCORES.update(json.loads(scores_path(year).read_text()))
    answered = take_answers(wb, resolver)
    rows = read_rows(ws)
    fetched = {}
    pdfs = uil_pdf_urls(year)
    for cls in CLASSES:
        if cls in pdfs:
            try:
                fetched[cls] = games_from_pdf(pdfs[cls], cls)
                print(f'  {cls}: {len(fetched[cls])} games from {pdfs[cls].rsplit("/", 1)[-1]}')
                continue
            except Exception as e:
                print(f'  ! {cls}: PDF failed ({e})')
        try:
            fetched[cls] = games_from_maxpreps(cls, year)
            print(f'  {cls}: {len(fetched[cls])} games from MaxPreps')
        except Exception as e:
            print(f'  ! {cls}: no bracket available ({e})')
        time.sleep(8)  # be gentle with MaxPreps

    # site names for every source team; anything uncertain is left for a person
    games_all = [g for gs in fetched.values() for g in gs if real_teams(g)]
    resolved, sources = {}, {}
    for g in games_all:
        for i, o in ((1, 2), (2, 1)):
            key = g[f'key{i}']
            sources[key] = dict(source_name=g[f'team{i}'], classification=g['cls'], opponent=g[f'team{o}'])
            resolved[key] = resolver.resolve(key, g[f'team{i}'], g['cls'])
    # a school already on the workbook under a settled name (a rename or merge done by hand) keeps
    # that name in its new games, instead of coming back as the source spelling with a "(?)"
    on_file = {}
    for r in rows:
        for s in (1, 2):
            k, n = r[f'key{s}'], r[f'team{s}']
            if k and n and k in sources and n != sources[k]['source_name']:
                on_file.setdefault(k, set()).add(n)
    for k, names in on_file.items():
        if resolved.get(k, (None,))[0] is None and len(names) == 1:
            resolved[k] = (next(iter(names)), 'workbook', [])
    taken = {}
    for key, (name, how, _) in resolved.items():
        if name:
            taken.setdefault(name, []).append(key)
    for name, keys in taken.items():
        auto = [k for k in keys if resolved[k][1] == 'auto']
        if len(keys) > 1 and auto:   # two schools this season would get the same name: ask
            for k in auto:
                resolved[k] = (None, 'review', [name])
    display = {k: (n or sources[k]['source_name']) for k, (n, how, _) in resolved.items()}
    review = [dict(key=k, **sources[k], recommended=(s[0] if s else sources[k]['source_name']),
                   other_options=s[1:])
              for k, (n, how, s) in sorted(resolved.items(), key=lambda kv: (sources[kv[0]]['classification'], sources[kv[0]]['source_name']))
              if n is None]

    # keep names still waiting from brackets that couldn't be read this time
    old_review = json.loads(review_path(year).read_text()) if review_path(year).exists() else None
    review += [e for e in (old_review or []) if e['key'] not in resolved and e['key'] not in resolver.confirmed]

    added = updated = renamed = 0
    conflicts, placed = [], []
    for cls, games in fetched.items():
        for g in games:
            if not real_teams(g):
                continue
            t1, t2 = display[g['key1']], display[g['key2']]
            match = None
            for r in rows:
                if r['week'] == g['week'] and r['cls'] == cls and r['team1'] and r['team2']:
                    if r['key1'] and r['key2']:
                        if {r['key1'], r['key2']} == {g['key1'], g['key2']}:
                            match = (r, r['key1'] == g['key1'])
                            break
                        continue
                    straight = min(max(sim(r['team1'], g['team1']), sim(r['team1'], t1)),
                                   max(sim(r['team2'], g['team2']), sim(r['team2'], t2)))
                    crossed = min(max(sim(r['team1'], g['team2']), sim(r['team1'], t2)),
                                  max(sim(r['team2'], g['team1']), sim(r['team2'], t1)))
                    if max(straight, crossed) >= 0.85:
                        match = (r, straight >= crossed)
                        break
            if match is None:
                r = next((r for r in rows if not r['week'] and not r['team1'] and not r['team2'] and not r['cls']), None)
                if r is None:
                    sys.exit('Games tab is full')
                for k, v in (('week', g['week']), ('cls', cls), ('team1', t1), ('team2', t2),
                             ('score1', g['score1']), ('score2', g['score2']), ('key1', g['key1']), ('key2', g['key2'])):
                    ws[f'{COL[k]}{r["row"]}'] = v
                    r[k] = v
                added += 1
                placed.append((r, g))
                continue
            r, straight = match
            placed.append((r, g))
            # remember where each name came from, and swap in the site name once it is settled;
            # a name typed into the workbook by hand (anything but the source spelling) is left alone
            for side, src in ((1, 1 if straight else 2), (2, 2 if straight else 1)):
                key = g[f'key{src}']
                if r[f'key{side}'] != key:
                    ws[f'{COL[f"key{side}"]}{r["row"]}'] = r[f'key{side}'] = key
                    updated += 1
                if r[f'team{side}'] == g[f'team{src}'] and display[key] != g[f'team{src}']:
                    ws[f'{COL[f"team{side}"]}{r["row"]}'] = r[f'team{side}'] = display[key]
                    renamed += 1
            s1, s2 = (g['score1'], g['score2']) if straight else (g['score2'], g['score1'])
            if s1 is None:
                continue
            before = (r['score1'], r['score2'])
            if set_score(year, ws, r, s1, s2, 'bracket'):
                updated += 1
            elif before != (s1, s2):
                conflicts.append(f'row {r["row"]} {cls} wk{g["week"]}: workbook {r["team1"]} {before[0]}-{before[1]} {r["team2"]}, UIL {s1}-{s2}')
    sited = fill_sites(year, ws, placed)
    scores_path(year).write_text(json.dumps(FILLED_SCORES, indent=1, sort_keys=True) + '\n')
    if added or updated or renamed or answered or sited or review != old_review:
        write_review(wb, year, review)
        wb.calculation.fullCalcOnLoad = True
        wb.save(path)
    print(f'prefill: {added} games added, {updated} scores/sources filled, {renamed} names settled, '
          f'{answered} answers taken, {sited} sites/dates filled, {len(review)} names to confirm')
    for c in conflicts:
        print('  score differs (left as is):', c)


CHANGE_FIELDS = ('date', 'time', 'site')
CHANGE_DAYS = 4   # a change stays highlighted this long, or until the game is played


def game_key(g):
    return (g['classification'], int(g['week']), frozenset((g['team1'], g['team2'])))


def log_changes(year, games):
    """Compare each game's date, kickoff and site with the published file; log what changed
    (whoever changed it: the source, the owner's workbook or a fix) and attach recent changes."""
    dest = ROOT / 'public' / 'data' / f'{year}.json'
    before = {game_key(g): g for g in json.loads(dest.read_text()).get('games', [])} if dest.exists() else {}
    changes = load_changes(year)
    norm = lambda v: re.sub(r'[^a-z0-9:/]', '', str(v or '').lower())
    stamp = now_iso()
    for g in games:
        old = before.get(game_key(g))
        if not old:
            continue
        if old.get('score1') is not None and (old['score1'], old['score2']) != (g['score1'], g['score2']):
            # same team order as before (game_key ignores order)
            o1, o2 = (old['score1'], old['score2']) if old['team1'] == g['team1'] else (old['score2'], old['score1'])
            changes.append(dict(classification=g['classification'], week=g['week'], team1=g['team1'], team2=g['team2'],
                                field='score', old=f"{g['team1']} {o1}, {g['team2']} {o2}",
                                new=f"{g['team1']} {g['score1']}, {g['team2']} {g['score2']}" if g['score1'] is not None else '',
                                at=stamp, status='changed'))
            print(f'  * {g["team1"]} v {g["team2"]}: score {o1}-{o2} -> {g["score1"]}-{g["score2"]}')
        for f in CHANGE_FIELDS:
            if old.get(f) and norm(old.get(f)) != norm(g.get(f)):
                changes.append(dict(classification=g['classification'], week=g['week'], team1=g['team1'], team2=g['team2'],
                                    field=f, old=old.get(f), new=g.get(f) or '', at=stamp, status='changed'))
                print(f'  * {g["team1"]} v {g["team2"]}: {f} {old.get(f)!r} -> {g.get(f)!r}')
    # a hand-set value that now matches the source is no longer a conflict
    shown = lambda g, f: f"{g['team1']} {g['score1']}, {g['team2']} {g['score2']}" if f == 'score' else g.get(f)
    changes = [c for c in changes if not (c.get('status') == 'conflict' and any(
        game_key(c) == game_key(g) and norm(shown(g, c['field'])) == norm(c['new']) for g in games))]
    save_changes(year, changes)
    cutoff = datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(days=CHANGE_DAYS)
    by_game = {}
    for c in changes:
        if datetime.datetime.fromisoformat(c['at']) >= cutoff:
            by_game.setdefault(game_key(c), []).append({k: c[k] for k in ('field', 'old', 'new', 'at', 'status')})
    # a change matters through the game's day (Central time); after that it's dropped
    today = (datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(hours=6)).date().isoformat()
    for g in games:
        recent = by_game.get(game_key(g))
        if recent and g.get('date') and str(g['date'])[:10] < today:
            recent = None
        # schedule changes matter until the game is played; score corrections stay up through game day
        if recent and g['score1'] is not None:
            recent = [c for c in recent if c['field'] == 'score']
        if recent:
            g['changes'] = recent


def build(year, force=False):
    wb, path = open_workbook(year)
    ws = wb['Games']
    names = {}
    for r in range(2, 200):
        code, name = wb['Lists'][f'A{r}'].value, wb['Lists'][f'B{r}'].value
        if code:
            names[str(code).strip()] = name
    unsure = {e['key']: e['source_name'] for e in json.loads(review_path(year).read_text())} \
        if review_path(year).exists() else {}
    flag = lambda name, key: f'{name} (?)' if key in unsure and name == unsure[key] else name
    geo = json.loads(game_sites.CACHE.read_text()) if game_sites.CACHE.exists() else {}
    games = []
    for r in read_rows(ws):
        if not (r['week'] and r['cls'] and r['team1'] and r['team2']):
            continue
        r['team1'], r['team2'] = flag(r['team1'], r['key1']), flag(r['team2'], r['key2'])
        week = int(r['week'])
        s1, s2 = r['score1'], r['score2']
        forfeit = (r['forfeit'] or '').upper() == 'Y'
        winner = r['team1'] if (s1 is not None and s2 is not None and s1 > s2) else \
                 r['team2'] if (s1 is not None and s2 is not None and s2 > s1) else None
        g = dict(year=year, classification=r['cls'], week=week, round=ROUNDS[week],
                 chapter=None if forfeit else r['chapter'], team1=r['team1'], score1=s1,
                 team2=r['team2'], score2=s2, winner=winner)
        if r['site']:
            g['site'] = r['site']
            game_sites.place(g, geo)
        if r['date']:
            g['date'] = str(r['date'])[:10]
        if r['time']:
            g['time'] = str(r['time'])
        games.append(g)
    games.sort(key=lambda g: (g['week'], CLASSES.index(g['classification']) if g['classification'] in CLASSES else 99))
    log_changes(year, games)

    chapters = {}
    for g in games:
        if not g['chapter']:
            continue
        c = chapters.setdefault(g['chapter'], dict(code=g['chapter'], name=names.get(g['chapter']) or g['chapter'], total=0, weeks={}))
        w = c['weeks'].setdefault(str(g['week']), dict(total=0, classifications={}))
        c['total'] += 1; w['total'] += 1
        w['classifications'][g['classification']] = w['classifications'].get(g['classification'], 0) + 1
    chapter_list = sorted(chapters.values(), key=lambda c: -c['total'])

    played = sum(1 for g in games if g['score1'] is not None)
    assigned = sum(1 for g in games if g['chapter'])
    finals = sum(1 for g in games if g['week'] == 6 and g['score1'] is not None)
    out = dict(year=year,
               season=dict(status='complete' if finals >= 10 else 'in_progress',
                           updated=datetime.datetime.now(datetime.timezone.utc).isoformat(timespec='minutes'),
                           games=len(games), played=played, assigned=assigned,
                           weeks={str(w): dict(games=sum(1 for g in games if g['week'] == w),
                                               assigned=sum(1 for g in games if g['week'] == w and g['chapter']))
                                  for w in range(1, 7)}),
               chapters=chapter_list, games=games)
    dest = ROOT / 'public' / 'data' / f'{year}.json'
    if dest.exists() and 'season' not in json.loads(dest.read_text()) and not force:
        sys.exit(f'{dest.name} was not made by this script (hand-curated season); refusing to overwrite. Use --force.')
    if dest.exists():
        # keep the old "updated" date when nothing else changed, so reruns don't create commits
        old = json.loads(dest.read_text())
        if old.get('season', {}).get('updated'):
            old_updated = old['season']['updated']
            old['season']['updated'] = out['season']['updated']
            if old == out:
                out['season']['updated'] = old_updated
    dest.write_text(json.dumps(out, indent=2) + '\n')
    idx_path = ROOT / 'public' / 'data' / 'index.json'
    idx = json.loads(idx_path.read_text())
    if year not in idx['years']:
        idx['years'] = sorted(idx['years'] + [year])
        idx_path.write_text(json.dumps(idx, indent=2) + '\n')
    print(f'build: {len(games)} games ({played} played, {assigned} with a chapter) -> {dest.relative_to(ROOT)}')


def locate(year):
    """Look up map coordinates for game sites that don't have them yet."""
    wb, _ = open_workbook(year)
    games = [(r['site'], r['team1'], r['team2']) for r in read_rows(wb['Games']) if r['site'] and r['team1'] and r['team2']]
    rp = ROOT / 'season' / str(year) / game_sites.REVIEW
    added = game_sites.locate(games, rp)
    waiting = json.loads(rp.read_text())
    print(f'locate: {added} new sites placed; {len(set(games)) - len(waiting)} of {len(set(games))} games with a site '
          f'are on the map, {len(waiting)} need a person (see {rp.relative_to(ROOT)})')


def review_issue(year):
    """Keep one GitHub issue listing the team names waiting for confirmation (closed when none)."""
    import os
    token, repo = os.environ.get('GITHUB_TOKEN'), os.environ.get('GITHUB_REPOSITORY')
    if not (token and repo):
        sys.exit('GITHUB_TOKEN and GITHUB_REPOSITORY are needed')
    review = json.loads(review_path(year).read_text()) if review_path(year).exists() else []
    title = f'{year}: team names to confirm'

    def api(method, url, body=None):
        req = urllib.request.Request(f'https://api.github.com/repos/{repo}{url}', method=method,
                                     data=json.dumps(body).encode() if body else None,
                                     headers={'Authorization': f'Bearer {token}', 'Accept': 'application/vnd.github+json'})
        with urllib.request.urlopen(req, timeout=30) as r:
            return json.loads(r.read() or 'null')

    issue = next((i for i in api('GET', '/issues?state=open&per_page=100')
                  if i['title'] == title and 'pull_request' not in i), None)
    if not review:
        if issue:
            api('PATCH', f"/issues/{issue['number']}", dict(state='closed', state_reason='completed'))
        print('no names to confirm')
        return
    lines = [f'{len(review)} team names from the brackets could not be matched to the site\'s names with certainty. '
             'They show as "Name (?)" on the site until confirmed, and are not merged with any other team.', '',
             f'Confirm them on the **Team Names** tab of `season/{year}/{year}_season.xlsx` '
             '(type OK to accept the recommendation, or the correct name), then upload the workbook.', '',
             '| Name as written | Class | Opponent | Recommended | Other options |', '|---|---|---|---|---|']
    lines += [f"| {e['source_name']} | {e['classification']} | {e['opponent']} | {e['recommended']} | "
              f"{', '.join(e['other_options'])} |" for e in review]
    body = dict(title=title, body='\n'.join(lines))
    if issue:
        api('PATCH', f"/issues/{issue['number']}", body)
    else:
        api('POST', '/issues', body)
    print(f'issue updated: {len(review)} names')


if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('command', choices=['prefill', 'locate', 'build', 'review-issue'])
    today = datetime.date.today()
    # the playoffs run Nov-Dec; Jan-Jun still belongs to the previous season
    ap.add_argument('--year', type=int, default=today.year if today.month >= 7 else today.year - 1)
    ap.add_argument('--force', action='store_true', help='build: overwrite a hand-curated year file')
    a = ap.parse_args()
    {'prefill': lambda: prefill(a.year), 'locate': lambda: locate(a.year), 'build': lambda: build(a.year, a.force),
     'review-issue': lambda: review_issue(a.year)}[a.command]()
