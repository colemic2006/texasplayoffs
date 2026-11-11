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
(ROOT / 'public' / 'data' / 'home_chapters_confirmed.json').write_text(json.dumps(dict(sorted(out.items())), indent=1) + '\n')
print(f'home chapters: {len(out)} schools in {len([c for c in lists if not c.startswith("_")])} chapters')
