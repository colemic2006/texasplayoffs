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
RULES = 2   # bump when the matching rules change, so earlier misses are tried again


SCHOOLS = ROOT / 'season' / 'texasbob_schools.json'   # [[stadium_id, city, school, stadium], ...]
REVIEW = 'sites_review.json'
NOT_A_PLACE = re.compile(r'\b(bi[- ]?district|area|regional|quarterfinals?|semifinals?|playoffs?|championship|'
                         r'round \d|\d(st|nd|rd|th) round|uil|state|game|tba|tbd|[1-6]a[- ]?d[12]|neutral site)\b', re.I)


def load_stadiums():
    return json.loads((ROOT / 'public' / 'data' / 'stadiums.json').read_text())['stadiums']


def load_schools():
    return json.loads(SCHOOLS.read_text()) if SCHOOLS.exists() else []


def clean_site(raw):
    """The place in MaxPreps' free-text site, or '' when it doesn't name one."""
    t = re.sub(r'^\s*game details\s*', '', raw or '', flags=re.I)
    t = re.sub(r'\b[^.]*\bis home\b[^.]*\.?', '', t, flags=re.I)                 # "Silsbee is home."
    t = re.sub(r'\b\d{1,2}(:\d\d)?\s*(am|pm|p|a)\b(\s*c[sd]t)?', '', t, flags=re.I)   # "6pm CST"
    t = re.sub(r'^.*?\b(neutral site at|game played at|played at|at)\b\s*', '', t, flags=re.I) \
        if re.search(r'\b(neutral site at|game played at|played at|at)\b', t, re.I) else t
    t = re.sub(r'\s*[-–]\s*(round|bi|uil).*$', '', t, flags=re.I)
    t = re.sub(r'\s+', ' ', t).strip(' ,.;:-')
    rest = NOT_A_PLACE.sub('', t)
    return t if re.search(r'[a-z]{3}', rest, re.I) else ''


SCHOOL_WORDS = re.compile(r'\s+(high school|h\.?s\.?|isd|high|junior high|school)$', re.I)


def team_town(core, teams):
    """If one of the teams is the school called `core`, the town its site name puts it in
    ("Frisco Panther Creek" -> "frisco"; "Wylie" -> "wylie"); '' if neither team is that school."""
    for t in teams:
        nt = norm(t)
        if nt == core:
            return core
        if nt.endswith(' ' + core):
            return nt[:-len(core) - 1]
    return ''


def find_school_stadium(site, schools, teams=()):
    """'Groom High School' / 'Seminole HS' / 'Bovina' -> that school's (or town's only) stadium.
    When the school is one of the teams playing, its stadium must be in that team's town."""
    x = norm(SCHOOL_WORDS.sub('', site))
    if not x:
        return None, ''
    rows = [r for r in schools if norm(re.sub(r'\s+(high school|school|secondary school)$', '', r[2], flags=re.I)) == x]
    rows += [r for r in schools if norm(f'{r[1]} {r[2]}'.replace(' High School', '')) == x]
    town = team_town(x, teams)
    if town and rows:
        rows = [r for r in rows if norm(r[1]) == town or town == x]
        if town == x and len({r[0] for r in rows}) > 1:
            rows = [r for r in rows if norm(r[1]) == town] or rows
        if not rows:
            return None, "site names a team's school, but not in that team's town"
    by_school = {r[0] for r in rows}
    if len(by_school) == 1:
        return next(iter(by_school)), 'school'
    if by_school:
        return None, 'several schools with this name'
    in_town = {r[0] for r in schools if norm(r[1]) == x}
    if len(in_town) == 1:
        return next(iter(in_town)), 'town'
    return None, ('several stadiums in this town' if in_town else '')


def plays_there(st, teams):
    """Does a team in the game call this stadium home, or come from its city?"""
    home = ' '.join(norm(h) for h in st.get('home_teams', []))
    for t in teams:
        nt = norm(t)
        if st.get('city') and nt.startswith(norm(st['city'])):
            return True
        core = nt.split()[-1] if nt else ''
        if nt and (f' {nt} ' in f' {home} ' or (len(nt.split()) == 1 and f' {core} ' in f' {home} ')):
            return True
    return False


def find_stadium(site, stadiums, teams=()):
    """The stadium a site names, only when exactly one fits ("Ratliff Stadium, Odessa").
    Several stadiums with the name are narrowed by the city in the text, then by the teams
    playing; a shortened name ("Newsom Stadium" for "Vernon Newsom Stadium") counts when
    only one stadium has it."""
    s = f' {norm(site)} '
    named = [st for st in stadiums if f' {norm(st["name"])} ' in s]
    if not named:
        words = norm(re.split(r'[,(;]| - | in ', site)[0])
        if len(words.split()) >= 2:
            named = [st for st in stadiums if f' {words} ' in f' {norm(st["name"])} ']
    in_city = [st for st in named if st.get('city') and f' {norm(st["city"])} ' in s]
    for group in (in_city, named, [st for st in named if plays_there(st, teams)]):
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


def resolve(site, stadiums, schools, teams=()):
    """(stadium or None, how) for a site; a town alone gives (None, 'town:<name>')."""
    st = find_stadium(site, stadiums, teams)
    if st:
        return st, 'stadium'
    sid, how = find_school_stadium(site, schools, teams)
    if sid:
        st = next((s for s in stadiums if s.get('id') == sid), None)
        if st:
            return st, how
    towns = {norm(r[1]): r[1] for r in schools}
    unsure = how in ('several schools with this name', "site names a team's school, but not in that team's town")
    if norm(site) in towns and not unsure:
        return None, 'town:' + towns[norm(site)]
    if re.search(r'\b\d{5}\b|^\s*\d+\s+\w|,\s*\d+\s+\w', site):
        return None, 'address:' + site          # a street address in the site text
    m = re.search(r'\(([^)]+)\)|\bin ([A-Za-z .]+?),?\s*(?:TX|Texas)\b|[-,;]\s*([A-Za-z .]+?),?\s*(?:TX|Texas)\b', site)
    if m and not unsure:
        town = norm(next(g for g in m.groups() if g))
        if town in towns:
            return None, 'town:' + towns[town]   # an unknown stadium in a stated town
    return None, how or 'no stadium, school or town matched'


def cache_key(site, team1, team2):
    # the same words can mean different places for different games ("Panther Creek High School")
    return f'{site} || {team1} v {team2}'


def locate(games, review_path=None):
    """games: [(site, team1, team2)]. Look up coordinates for any not in the cache yet; returns
    how many were added. Games whose site can't be placed with certainty go to review_path."""
    cache = json.loads(CACHE.read_text()) if CACHE.exists() else {}
    stadiums, schools = load_stadiums(), load_schools()
    today = datetime.date.today()
    added = 0
    for site, t1, t2 in sorted(set(games)):
        key = cache_key(site, t1, t2)
        hit = cache.get(key)
        if hit and ('lat' in hit or (hit.get('rules') == RULES and
                                     (today - datetime.date.fromisoformat(hit['missed'])).days < RETRY_MISS_DAYS)):
            continue
        st, how = resolve(site, stadiums, schools, (t1, t2))
        if st:
            tries = [(query_for(site, st), how), (f"{st['name']}, {st['city']}, Texas", how),
                     (f"{st['city']}, Texas", how + ' (town only)')]
        elif how.startswith('town:'):
            tries = [(f"{how[5:]}, Texas", 'town (approximate)')]
        elif how.startswith('address:'):
            tries = [(how[8:] if re.search(r'\b(TX|Texas)\b', how) else how[8:] + ', Texas', 'address in site text')]
        else:
            tries = []
        coords = None
        for q, q_how in tries:
            try:
                coords = nominatim(q)
            except Exception as e:
                print(f'  ! geocode {q}: {e}')
            time.sleep(1.1)   # Nominatim allows one request a second
            if coords:
                how = q_how
                break
        entry = dict(stadium_id=st.get('id') if st else None, stadium=st['name'] if st else None,
                     address=query_for(site, st) if st else '', map_link=(st or {}).get('map_link', ''), how=how)
        if coords:
            entry.update(lat=round(coords[0], 5), lng=round(coords[1], 5))
            added += 1
        else:
            entry.update(missed=today.isoformat(), rules=RULES)
        entry['site'] = site
        cache[key] = entry
    CACHE.parent.mkdir(parents=True, exist_ok=True)
    CACHE.write_text(json.dumps(cache, indent=1, sort_keys=True) + '\n')
    if review_path:
        review = [dict(site=s, game=f'{a} v {b}', why=cache[cache_key(s, a, b)].get('how', ''))
                  for s, a, b in sorted(set(games)) if 'lat' not in cache.get(cache_key(s, a, b), {})]
        Path(review_path).write_text(json.dumps(review, indent=1) + '\n')
    return added


def place(game, cache):
    """Copy a site's coordinates and stadium onto a game for the map."""
    hit = cache.get(cache_key(game.get('site') or '', game['team1'], game['team2']))
    if hit and 'lat' in hit:
        game.update(lat=hit['lat'], lng=hit['lng'])
        if hit.get('stadium'):
            game['stadium'] = hit['stadium']
        if hit.get('map_link'):
            game['map_link'] = hit['map_link']
