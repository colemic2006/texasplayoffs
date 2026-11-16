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

# schools named for their district or campus rather than their town
TOWN = {
    'A&M Consolidated': 'College Station', 'Aldine MacArthur': 'Houston', 'Alief Elsik': 'Houston', 'Alief Hastings': 'Houston',
    'Almeta Crawford': 'Fresno', 'Barbers Hill': 'Mont Belvieu', 'Barksdale Nueces Canyon': 'Barksdale', 'Bastrop Cedar Creek': 'Bastrop',
    'Big Sandy Harmony': 'Big Sandy', 'Birdville': 'North Richland Hills', 'Brackett': 'Brackettville', 'Brazosport Brazoswood': 'Clute',
    'Brook Hill': 'Bullard', 'Comal Pieper': 'San Antonio', 'Community': 'Nevada', 'Fort Bend Austin': 'Sugar Land',
    'Fort Bend Bush': 'Richmond', 'Fort Bend Clements': 'Sugar Land', 'Fort Bend Dulles': 'Sugar Land', 'Fort Bend Elkins': 'Missouri City',
    'Fort Bend Hightower': 'Missouri City', 'Fort Bend Kempner': 'Sugar Land', 'Fort Bend Marshall': 'Missouri City',
    'Fort Bend Travis': 'Richmond', 'Fort Bend Willowridge': 'Houston', 'Frenship Memorial': 'Lubbock', 'Fulshear Jordan': 'Fulshear',
    'Grand Oaks': 'Spring', 'Haltom': 'Haltom City', 'Immanuel Christian': 'El Paso', 'Irion County': 'Mertzon', 'Jesus Chapel': 'El Paso',
    'Kyle Lehman': 'Kyle', 'Lake Belton': 'Temple', 'Legacy Ranch': 'Liberty Hill', 'Life Oak Cliff': 'Dallas', 'Life Waxahachie': 'Waxahachie',
    'McAllenHigh': 'McAllen', 'New Diana': 'Diana', 'Northbrook': 'Houston', "O'Donnell": 'ODonnell', 'Pharr-San Juan-Alamo': 'Pharr',
    'Richmond Randle': 'Richmond', 'Richmond Tomas': 'Richmond', 'Rockwall-Heath': 'Rockwall', 'Ropes': 'Ropesville',
    'Rosenburg Lamar': 'Rosenberg', 'Rosenburg Terry': 'Rosenberg', 'S&S Consolidated': 'Sadler', 'Sands': 'Ackerly',
    'South Grand Prairie': 'Grand Prairie', 'Tarkington': 'Cleveland', 'Tidehaven': 'El Maton', 'Wichita Christian': 'Wichita Falls',
    'Young Mens Leadership Academy': 'San Antonio', 'Briscoe Fort Elliott': 'Briscoe', 'Cigarroa': 'Laredo', 'Fannindel': 'Ladonia',
    'Heritage': 'Frisco', 'Little Cypress-Mauriceville': 'Orange', 'Prairiland': 'Pattonville', 'Highland': 'Roscoe', 'West Texas Stinnett': 'Stinnett',
    'Klondike': 'Lamesa', 'Cotton Center': 'Cotton Center', 'Welch Dawson': 'Welch', 'Dawson': 'Dawson', 'Bruceville-Eddy': 'Eddy', 'West': 'West', 'Center Point': 'Center Point',
    'Sabine': 'Liberty City', 'Groesbeck': 'Groesbeck', 'Tornillo': 'Tornillo', 'Water Valley': 'Water Valley', 'Weimar': 'Weimar', 'Bishop Gorman': 'Tyler', 'Seguin': 'Seguin', 'San Antonio Sam Houston': 'San Antonio',
}
PREFIX = {'fw': 'Fort Worth', 'sa': 'San Antonio', 'cc': 'Corpus Christi', 'ep': 'El Paso', 'disd': 'Dallas'}


def town_of(team):
    if team in TOWN:
        return TOWN[team]
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
    if towns.get(k) is None:   # not looked up yet, or missed last time
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
    if sid in spot and name not in TOWN:
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
