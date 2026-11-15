#!/usr/bin/env python3
"""
Where each school with a known home chapter is, for the chapter coverage map:
public/data/chapter_schools.json  {"schools": [{name, chapter, lat, lng, at}], "unplaced": [...]}

A school is placed at its home stadium when that stadium has hosted a playoff game we've mapped
(season/geocode_cache.json), otherwise at the middle of its town (season/town_coords.json,
looked up on OpenStreetMap and cached the first time a town is needed).

  python3 scripts/chapter_map.py
"""
import json, sys, time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / 'scripts'))

home = json.loads((ROOT / 'public/data/home_chapters_confirmed.json').read_text())
teams = json.loads((ROOT / 'public/data/home_stadiums.json').read_text())['teams']
stadiums = json.loads((ROOT / 'public/data/stadiums.json').read_text())['stadiums']
cache = json.loads((ROOT / 'season/geocode_cache.json').read_text())
TOWNS = ROOT / 'season/town_coords.json'
towns = json.loads(TOWNS.read_text()) if TOWNS.exists() else {}

# stadium id -> spot, from every mapped game site
spot = {}
for v in cache.values():
    if v.get('stadium_id') and v.get('lat') is not None:
        spot.setdefault(v['stadium_id'], (v['lat'], v['lng']))
cities = {(s.get('city') or '').lower() for s in stadiums}

PREFIX = {'fw': 'Fort Worth', 'sa': 'San Antonio', 'cc': 'Corpus Christi', 'ep': 'El Paso', 'disd': 'Dallas'}


def town_of(team):
    h = teams.get(team)
    if h and h.get('city'):
        return h['city']
    w = team.replace(' High', '').split()
    if w and w[0].lower() in PREFIX:
        return PREFIX[w[0].lower()]
    for n in range(min(3, len(w)), 0, -1):
        if ' '.join(w[:n]).lower() in cities:
            return ' '.join(w[:n])
    return ' '.join(w[:2]) if len(w) > 1 else (w[0] if w else '')


def town_spot(town):
    k = town.lower()
    if k not in towns:
        try:
            import game_sites
            ll = game_sites.nominatim(dict(city=town, state='Texas'), town)
            time.sleep(1.1)   # OpenStreetMap asks for at most one lookup a second
        except Exception as e:
            print(f'  ! {town}: {e}')
            return None
        towns[k] = list(ll) if ll else None
    return towns[k]


out, unplaced = [], []
for name, ch in sorted(home.items()):
    h = teams.get(name) or {}
    sid = h.get('stadium_id')
    if sid in spot:
        lat, lng = spot[sid]; at = 'stadium'
    else:
        ll = town_spot(town_of(name))
        if not ll:
            unplaced.append(dict(name=name, chapter=ch)); continue
        lat, lng = ll; at = 'town'
    out.append(dict(name=name, chapter=ch, lat=round(lat, 5), lng=round(lng, 5), at=at))

TOWNS.write_text(json.dumps(towns, indent=1, sort_keys=True) + '\n')
(ROOT / 'public/data/chapter_schools.json').write_text(json.dumps(dict(schools=out, unplaced=unplaced), indent=1) + '\n')
print(f'chapter map: {len(out)} schools placed ({sum(s["at"] == "stadium" for s in out)} at their stadium), {len(unplaced)} not placed')
