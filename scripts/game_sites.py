"""
Place game sites on the map: site text -> stadium (stadiums.json) -> coordinates.

Coordinates come from OpenStreetMap's Nominatim, looked up once per site and kept in
season/geocode_cache.json, so the site's map never has to look anything up itself.
"""
import datetime, json, re, time, urllib.parse, urllib.request
from pathlib import Path

from uil_bracket import norm

ROOT = Path(__file__).resolve().parent.parent
CACHE = ROOT / 'season' / 'geocode_cache.json'
UA = 'texasplayoffs.com season map (https://texasplayoffs.com)'
RETRY_MISS_DAYS = 3


def load_stadiums():
    return json.loads((ROOT / 'public' / 'data' / 'stadiums.json').read_text())['stadiums']


def find_stadium(site, stadiums):
    """The stadium a site names, only when exactly one fits ("Ratliff Stadium, Odessa")."""
    s = f' {norm(site)} '
    named = [st for st in stadiums if f' {norm(st["name"])} ' in s]
    in_city = [st for st in named if st.get('city') and f' {norm(st["city"])} ' in s]
    for group in (in_city, named):
        if len({(st['name'], st.get('city')) for st in group}) == 1:
            return group[0]
    return None


def query_for(site, stadium):
    if stadium and stadium.get('address'):
        return f"{stadium['address']}, {stadium.get('city', '')}, Texas {stadium.get('zip', '')}".strip()
    return re.sub(r'\s+', ' ', f'{site}, Texas')


def nominatim(q):
    url = 'https://nominatim.openstreetmap.org/search?' + urllib.parse.urlencode(
        dict(q=q, format='json', limit=1, countrycodes='us'))
    req = urllib.request.Request(url, headers={'User-Agent': UA})
    with urllib.request.urlopen(req, timeout=30) as r:
        hits = json.loads(r.read())
    return (float(hits[0]['lat']), float(hits[0]['lon'])) if hits else None


def locate(sites):
    """Look up coordinates for any site not in the cache yet. Returns how many were added."""
    cache = json.loads(CACHE.read_text()) if CACHE.exists() else {}
    stadiums = load_stadiums()
    today = datetime.date.today()
    added = 0
    for site in sorted(set(sites)):
        hit = cache.get(site)
        if hit and ('lat' in hit or (today - datetime.date.fromisoformat(hit['missed'])).days < RETRY_MISS_DAYS):
            continue
        st = find_stadium(site, stadiums)
        tries = [query_for(site, st)] + ([f"{st['name']}, {st['city']}, Texas"] if st else [])
        coords = None
        for q in tries:
            try:
                coords = nominatim(q)
            except Exception as e:
                print(f'  ! geocode {q}: {e}')
            time.sleep(1.1)   # Nominatim allows one request a second
            if coords:
                break
        entry = dict(stadium_id=st.get('id') if st else None, stadium=st['name'] if st else None,
                     address=query_for(site, st), map_link=(st or {}).get('map_link', ''))
        if coords:
            entry.update(lat=round(coords[0], 5), lng=round(coords[1], 5))
            added += 1
        else:
            entry['missed'] = today.isoformat()
            print(f'  ! no location found for "{site}"')
        cache[site] = entry
    CACHE.parent.mkdir(parents=True, exist_ok=True)
    CACHE.write_text(json.dumps(cache, indent=1, sort_keys=True) + '\n')
    return added


def place(game, cache):
    """Copy a site's coordinates and stadium onto a game for the map."""
    hit = cache.get(game.get('site') or '')
    if hit and 'lat' in hit:
        game.update(lat=hit['lat'], lng=hit['lng'])
        if hit.get('stadium'):
            game['stadium'] = hit['stadium']
        if hit.get('map_link'):
            game['map_link'] = hit['map_link']
