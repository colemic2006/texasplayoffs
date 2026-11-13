#!/usr/bin/env python3
"""
Each school's home chapter, from the lists the site owner gives (season/home_chapter_lists.json:
{chapter code: {name as given: team name on the site}}), written to
public/data/home_chapters_confirmed.json ({team name: chapter code}) for the team pages.

  python3 scripts/home_chapters.py
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
lists = json.loads((ROOT / 'season' / 'home_chapter_lists.json').read_text())
out = {}
for ch, schools in lists.items():
    if ch.startswith('_'):
        continue
    for given, team in schools.items():
        if team in out and out[team] != ch:
            raise SystemExit(f'{team} is listed under both {out[team]} and {ch}')
        out[team] = ch
aliases = ROOT / 'season' / 'home_chapter_aliases.json'
if aliases.exists():
    for team, ch in json.loads(aliases.read_text()).items():
        if not team.startswith('_'):
            out.setdefault(team, ch)
(ROOT / 'public' / 'data' / 'home_chapters_status.json').write_text(json.dumps(dict(
    complete=lists.get('_complete', []), partial=lists.get('_partial', [])), indent=1) + '\n')
(ROOT / 'public' / 'data' / 'home_chapters_confirmed.json').write_text(json.dumps(dict(sorted(out.items())), indent=1) + '\n')
print(f'home chapters: {len(out)} schools in {len([c for c in lists if not c.startswith("_")])} chapters')

# How many schools on the site have a home chapter yet: for the coverage chart on the Teams page
import glob, re
CODES = {'ABI','AMA','AUS','BEA','STX','COM','CSC','CTX','DAL','ELP','FTW','HOU','NTX','PBC','PVC','RGV',
         'SAT','SAN','SFA','SPC','TYL','WAC','WACO','ETX'}
last = {}
for f in sorted(glob.glob(str(ROOT / 'public' / 'data' / '[0-9]*.json'))):
    year = int(Path(f).stem)
    for g in json.loads(Path(f).read_text()).get('games', []):
        for t in (g.get('team1'), g.get('team2')):
            if not t or t.endswith('(?)') or re.fullmatch(r'\d+', t) or (t.upper() in CODES and t != 'Waco'):
                continue
            last[t] = max(last.get(t, 0), year)
schools = set(last) | set(out)
homes = json.loads((ROOT / 'public' / 'data' / 'home_stadiums.json').read_text())['teams']
stadiums = {s['id']: s for s in json.loads((ROOT / 'public' / 'data' / 'stadiums.json').read_text())['stadiums'] if 'id' in s}
def town(t):
    s = stadiums.get((homes.get(t) or {}).get('stadium_id'))
    return dict(town=s.get('city', ''), county=s.get('county', '')) if s else {}
current = max(last.values()) if last else None
missing = sorted(t for t in schools if t not in out)
(ROOT / 'public' / 'data' / 'home_chapter_coverage.json').write_text(json.dumps(dict(
    total=len(schools), with_chapter=len(schools) - len(missing),
    current_year=current,
    current_total=sum(1 for t in last if last[t] == current),
    current_missing=sum(1 for t in missing if last.get(t) == current),
    missing=[dict(name=t, last_playoffs=last.get(t), **town(t)) for t in missing]), indent=1) + '\n')
print(f'coverage: {len(schools) - len(missing)} of {len(schools)} schools have a home chapter')
