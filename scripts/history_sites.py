#!/usr/bin/env python3
"""
Game sites for past seasons, from the owner's season bracket workbooks (Area round on; the
bracket workbooks don't list first-round sites). season/history_sites.json holds the sites as
pulled from those workbooks; this places them on the map (game_sites.py, same rules as the
current season) and writes site, coordinates and stadium onto the games in public/data/<year>.json.

  python3 scripts/history_sites.py
"""
import json, sys
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / 'scripts'))
import game_sites  # noqa: E402

rows = json.loads((ROOT / 'season/history_sites.json').read_text())
review = ROOT / 'season' / 'history_sites_review.json'
added = game_sites.locate([(r['site'], r['team1'], r['team2']) for r in rows], review)
cache = json.loads(game_sites.CACHE.read_text())
by_year = defaultdict(list)
for r in rows:
    by_year[r['year']].append(r)
for year, rs in sorted(by_year.items()):
    p = ROOT / 'public' / 'data' / f'{year}.json'
    data = json.loads(p.read_text())
    idx = {(g['classification'], g['team1'], g['team2']): g for g in data['games']}
    placed = 0
    for r in rs:
        g = idx.get((r['classification'], r['team1'], r['team2']))
        if not g:
            print(f'  ? {year} {r["classification"]} {r["team1"]} v {r["team2"]}: not in {p.name}'); continue
        g['site'] = r['site']
        game_sites.place(g, cache)
        placed += g.get('lat') is not None
    p.write_text(json.dumps(data, indent=2))   # same layout as the rest of the season files
    print(f'{year}: {len(rs)} games with a site, {placed} on the map')
print(f'{added} new sites looked up')
