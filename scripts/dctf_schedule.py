#!/usr/bin/env python3
"""
Game days, kickoffs and sites from Dave Campbell's Texas Football "game times and locations"
article, for games MaxPreps and UIL haven't posted yet. It only fills empty cells in the season
workbook (or updates a value it filled itself), and records each fill as the job's own in
maxpreps_cards.json, so MaxPreps takes over quietly once it posts the game.

  python3 scripts/dctf_schedule.py [year] [url]

The article URL is kept in season/<year>/dctf_schedule.json ({"url": ...}).
"""
import datetime, html, json, re, sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
import season  # noqa: E402
from uil_seeds import match  # noqa: E402

DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
LINE = re.compile(r'^(?P<a>.+?)\s*\(\d+-\d+(?:-\d+)?\)\s+vs\.?\s+(?P<b>.+?)\s*\(\d+-\d+(?:-\d+)?\)\s*,\s*(?P<rest>.+)$')
ROMAN = {'I': 1, 'II': 2}


def lines(url):
    page = season.fetch(url)
    page = re.sub(r'<script.*?</script>|<style.*?</style>', '', page, flags=re.S)
    text = html.unescape(re.sub(r'<[^>]+>', '\n', page))
    return [l.strip() for l in text.split('\n') if l.strip()]


def parse(url):
    """[(class, team a, team b, day name, 'H:MM PM', 'Stadium, Town')] for every matchup line."""
    out, cls, div = [], None, None
    for l in lines(url):
        m = re.match(r'^Class (\d)A$', l)
        if m:
            cls, div = m.group(1) + 'A', None; continue
        m = re.match(r'^DIVISION (I{1,2})$', l, re.I)
        if m:
            div = ROMAN[m.group(1).upper()]; continue
        m = LINE.match(l)
        if not (m and cls and div):
            continue
        rest = m.group('rest')
        t = re.search(r'(\d{1,2}):(\d\d)\s*([ap])\.?m\.?', rest, re.I)
        d = next((x for x in DAYS if re.search(rf'\b{x}\b', rest)), None)
        s = re.search(r'\bat\s+(.+?)[’\']s?\s+(.+?)\s*$', rest) or re.search(r'\bat\s+(.+?)\s*$', rest)
        site = ''
        if s and s.lastindex == 2:
            site = f'{s.group(2).strip()}, {s.group(1).strip()}'
        elif s:
            site = s.group(1).strip()
        out.append(dict(cls=f'{cls} D{div}', a=m.group('a').strip(), b=m.group('b').strip(), day=d,
                        time=f'{int(t.group(1))}:{t.group(2)} {t.group(3).upper()}M' if t else '',
                        site=site, raw=l))
    return out


def main(year, url=None):
    cfg = season.ROOT / 'season' / str(year) / 'dctf_schedule.json'
    url = url or (json.loads(cfg.read_text()).get('url') if cfg.exists() else None)
    if not url:
        print('dctf: no article URL set'); return
    games = parse(url)
    print(f'dctf: {len(games)} matchups in the article')
    wb, path = season.open_workbook(year)
    ws = wb['Games']
    rows = [r for r in season.read_rows(ws) if r['week'] and r['cls'] and r['team1'] and r['team2']]
    # Monday of week 1, from the earliest bi-district date on file
    w1 = sorted(str(r['date'])[:10] for r in rows if int(r['week']) == 1 and r['date'])
    if not w1:
        print('dctf: no week 1 dates to anchor the calendar'); return
    d0 = datetime.date.fromisoformat(w1[0]); monday1 = d0 - datetime.timedelta(days=d0.weekday())
    cards = json.loads(season.cards_path(year).read_text()) if season.cards_path(year).exists() else {}
    filled, unmatched, used = 0, [], set()
    for g in games:
        open_rows = [r for r in rows if r['cls'] == g['cls'] and r['score1'] is None and r['row'] not in used]
        best = None
        for r in open_rows:
            for x, y in ((r['team1'], r['team2']), (r['team2'], r['team1'])):
                m1, m2 = match(g['a'], x), match(g['b'], y)
                # both teams must match: with one team matching, an earlier round's line (the same
                # team's last game) was copied onto its next game
                if max(m1, m2) >= 0.8 and min(m1, m2) >= 0.6 and (not best or m1 + m2 > best[0]):
                    best = (m1 + m2, r)
        if not best:
            unmatched.append(g['raw']); continue
        r = best[1]; used.add(r['row'])
        key = f"{r['cls']}|{r['key1']}|{r['key2']}"
        card = cards.setdefault(key, {})
        vals = dict(site=g['site'], time=g['time'])
        if g['day']:
            day = monday1 + datetime.timedelta(days=7 * (int(r['week']) - 1) + DAYS.index(g['day']))
            vals['date'] = day.isoformat()
        for k, v in vals.items():
            if not v:
                continue
            old = str(r[k] or '')[:10] if k == 'date' else str(r[k] or '')
            # fill an empty cell, or update one this script filled that MaxPreps hasn't taken over
            mine = not old or (old == card.get(f'dctf_{k}') and old == card.get(f'filled_{k}'))
            if mine and old != v:
                ws[f'{season.COL[k]}{r["row"]}'] = r[k] = v
                card[f'dctf_{k}'] = card[f'filled_{k}'] = v
                filled += 1
    if filled:   # don't rewrite the workbook when nothing changed
        wb.save(path)
        season.cards_path(year).write_text(json.dumps(cards, indent=1, sort_keys=True) + '\n')
    print(f'dctf: {filled} cells filled; {len(unmatched)} matchups not matched to a game')
    for u in unmatched:
        print('  ?', u)


if __name__ == '__main__':
    y = int(sys.argv[1]) if len(sys.argv) > 1 else datetime.date.today().year
    main(y, sys.argv[2] if len(sys.argv) > 2 else None)
