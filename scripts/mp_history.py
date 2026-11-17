#!/usr/bin/env python3
"""
First-round game sites for past seasons from MaxPreps (the owner's bracket workbooks start at the
Area round). Runs from GitHub Actions (MaxPreps doesn't answer from elsewhere).

1. Finds each season's MaxPreps playoff bracket: Internet Archive snapshots of UIL's bracket pages
   carry the MaxPreps link UIL embedded that season; one bracket page links the other classes'.
2. Reads each first-round game's MaxPreps card for its site.
3. Matches the games to the site's week-1 games and writes season/history_sites_r1.json, which
   scripts/history_sites.py places on the map with the rest.

Progress is kept in season/history_mp.json, so a rerun picks up where the last one stopped.

  python3 scripts/mp_history.py 2022 2023 2024 2025
"""
import json, re, sys, time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / 'scripts'))
from season import fetch, read_card  # noqa: E402
from uil_seeds import match  # noqa: E402

STATE = ROOT / 'season' / 'history_mp.json'
OUT = ROOT / 'season' / 'history_sites_r1.json'
CLASSES = [f'{c}A D{d}' for c in range(1, 7) for d in (1, 2)]
MP = 'https://www.maxpreps.com/tournament/view.aspx'
state = json.loads(STATE.read_text()) if STATE.exists() else {}


def save():
    STATE.write_text(json.dumps(state, indent=1, sort_keys=True) + '\n')


def get(url, tries=3, wait=5):
    for i in range(tries):
        try:
            return fetch(url)
        except Exception as e:
            err = e
            time.sleep(wait * (i + 1))
    raise err


def title_of(html):
    m = re.search(r'<title>(.*?)</title>', html, re.S)
    return re.sub(r'\s+', ' ', m.group(1)).strip() if m else ''


def cls_of(title):
    m = re.search(r'Conference (\d)A D(\d)', title)
    return f'{m.group(1)}A D{m.group(2)}' if m else None


def find_brackets(year):
    """{class: bracket URL} for the season, from archived UIL pages and links between brackets."""
    found = state.setdefault('brackets', {}).setdefault(str(year), {})
    seeds = []
    for cls in CLASSES:
        if len(found) == len(CLASSES):
            break
        page = f'uiltexas.org/football/playoff-brackets/{cls.replace(" ", "")}'
        try:
            rows = json.loads(get(f'https://web.archive.org/cdx/search/cdx?url={page}&from={year}11&to={year + 1}01'
                                  f'&output=json&fl=timestamp&filter=statuscode:200&collapse=digest'))[1:]
        except Exception as e:
            print(f'  {year} {cls}: archive search failed ({e})'); continue
        for (ts,) in reversed(rows[-4:]):
            try:
                html = get(f'https://web.archive.org/web/{ts}id_/https://www.{page}', tries=2)
            except Exception:
                continue
            m = re.search(r'https?://www\.maxpreps\.com/tournament/view\.aspx\?[^"\'<\s]+', html)
            if m:
                seeds.append(m.group(0).replace('&amp;', '&')); break
        # one bracket page lists the others: stop once every class is known
        for url in seeds:
            if url in state.setdefault('read_pages', []):
                continue
            state['read_pages'].append(url)
            try:
                html = get(url)
            except Exception as e:
                print(f'  bracket page failed: {e}'); continue
            t = title_of(html)
            if str(year) in t and cls_of(t):
                found.setdefault(cls_of(t), url)
            tid = re.search(r'tournamentid=([0-9a-f-]{36})', url, re.I)
            ssid = re.search(r'ssid=([0-9a-f-]{36})', url, re.I)
            for b in set(re.findall(r'bracketid=([0-9a-f-]{36})', html, re.I)):
                if tid and ssid and not any(b in u for u in found.values()):
                    u = f'{MP}?tournamentid={tid.group(1)}&ssid={ssid.group(1)}&bracketid={b}'
                    try:
                        t2 = title_of(get(u))
                    except Exception:
                        continue
                    if str(year) in t2 and cls_of(t2):
                        found.setdefault(cls_of(t2), u)
                    time.sleep(1)
            save()
        time.sleep(2)
    print(f'{year}: brackets for {len(found)} of {len(CLASSES)} classes: {sorted(found)}')
    return found


def first_round(url):
    """[(team a, score a, team b, score b, card url)] for the bracket's first round."""
    from bs4 import BeautifulSoup
    soup = BeautifulSoup(get(url), 'html.parser')
    dated = [(r.select_one('abbr.start-date[title]'), r) for r in soup.select('div.round')]
    dated = [(d['title'][:10], r) for d, r in dated if d]
    if not dated:
        return []
    first = min(d for d, _ in dated)
    out = []
    for r in [r for d, r in dated if d == first]:
        for mu in r.select('li.matchup-container'):
            teams = mu.select('li.team')
            if len(teams) != 2:
                continue
            names, scores = [], []
            for t in teams:
                n = t.select_one('.name')
                names.append(n.get_text(strip=True) if n else '')
                el = t.select_one('[class*="score"]')
                txt = el.get_text(strip=True) if el else ''
                scores.append(int(txt) if txt.isdigit() else None)
            card = mu.select_one('[data-hover-card]')
            if all(names) and card:
                out.append((names[0], scores[0], names[1], scores[1],
                            'https://www.maxpreps.com' + card['data-hover-card'].replace('&amp;', '&')))
    return out


def main(years):
    cards = state.setdefault('cards', {})
    rows = []
    for year in years:
        games = json.loads((ROOT / f'public/data/{year}.json').read_text())['games']
        for cls, url in sorted(find_brackets(year).items()):
            site_games = [g for g in games if g['classification'] == cls and g['week'] == 1]
            try:
                fr = first_round(url)
            except Exception as e:
                print(f'  {year} {cls}: bracket failed ({e})'); continue
            used, got = set(), 0
            for a, sa, b, sb, card in fr:
                best = None
                for i, g in enumerate(site_games):
                    if i in used:
                        continue
                    for x, y, s1, s2 in ((g['team1'], g['team2'], g.get('score1'), g.get('score2')),
                                         (g['team2'], g['team1'], g.get('score2'), g.get('score1'))):
                        m1, m2 = match(a, x), match(b, y)
                        sc = m1 + m2 + (0.6 if (sa, sb) == (s1, s2) and sa is not None else 0)
                        if max(m1, m2) >= 0.8 and min(m1, m2) >= 0.3 and (not best or sc > best[0]):
                            best = (sc, i)
                if not best:
                    print(f'  {year} {cls}: no site game for {a} v {b}'); continue
                used.add(best[1]); g = site_games[best[1]]
                if card not in cards:
                    try:
                        info = read_card(card)
                        cards[card] = re.sub(r'^\s*Game Details\s*', '', info.get('site') or '').strip()
                    except Exception as e:
                        print(f'  card failed: {e}'); continue
                    time.sleep(1)
                    if len(cards) % 25 == 0:
                        save()
                if cards[card]:
                    rows.append(dict(year=year, classification=cls, week=1, team1=g['team1'], team2=g['team2'],
                                     site=cards[card], source_text='MaxPreps game card')); got += 1
            print(f'  {year} {cls}: {len(fr)} first-round games on MaxPreps, {got} with a site')
            save()
    old = json.loads(OUT.read_text()) if OUT.exists() else []
    keep = [r for r in old if r['year'] not in years]
    OUT.write_text(json.dumps(keep + rows, indent=1) + '\n')
    print(f'{len(rows)} first-round sites written')


if __name__ == '__main__':
    main([int(y) for y in sys.argv[1:]] or [2022, 2023, 2024, 2025])
