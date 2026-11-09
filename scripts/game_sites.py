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
RULES = 5   # bump when the matching rules change: every site is looked up again under the new rules


SCHOOLS = ROOT / 'season' / 'texasbob_schools.json'   # [[stadium_id, city, school, stadium], ...]
CONFIRMED = ROOT / 'season' / 'site_names.json'     # confirmed: {"site as MaxPreps writes it": "Stadium, City"}
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


PLACE_KEYS = ('city', 'town', 'village', 'hamlet', 'suburb', 'municipality')


def nominatim(q, town='', zipcode=''):
    """Coordinates for a search (text, or a dict of structured fields). With a town or ZIP
    given, a result only counts if it is in that town or ZIP code -- a search for "Crosby,
    Texas" must not land in Crosby County."""
    params = dict(q) if isinstance(q, dict) else dict(q=q)
    params.update(format='json', limit=5, countrycodes='us', addressdetails=1)
    url = 'https://nominatim.openstreetmap.org/search?' + urllib.parse.urlencode(params)
    req = urllib.request.Request(url, headers={'User-Agent': UA})
    with urllib.request.urlopen(req, timeout=30) as r:
        hits = json.loads(r.read())
    for h in hits:
        a = h.get('address', {})
        if a.get('state') not in (None, 'Texas'):
            continue
        if town or zipcode:
            in_town = town and any(norm(a.get(k, '')) == norm(town) for k in PLACE_KEYS)
            in_zip = zipcode and a.get('postcode', '').startswith(zipcode)
            if not (in_town or in_zip):
                continue
        return float(h['lat']), float(h['lon'])
    return None


DISTRICT = re.compile(r'^(.+?)\s+C?ISD\s+(.+)$')


def resolve(site, stadiums, schools, teams=()):
    """(stadium or None, how) for a site; a town alone gives (None, 'town:<name>').
    "Katy ISD Legacy Stadium" is read as "Legacy Stadium, Katy"; if that isn't a known
    stadium it is looked up as written ("Tully Stadium, Spring Branch") -- never placed
    at the district's town, which may be somewhere else entirely."""
    m = DISTRICT.match(site)
    if m:
        district, rest = m.group(1).strip(), m.group(2).strip()
        st, how = resolve_plain(f'{rest}, {district}', stadiums, schools, teams)
        if st:
            return st, how
        return None, f'district:{rest}, {district}'
    st, how = resolve_plain(site, stadiums, schools, teams)
    if st or how.startswith(('town:', 'address:')) or ',' not in site:
        return st, how
    # "Groom High School, Football Field": try each part on its own
    for part in [p.strip() for p in site.split(',') if p.strip()]:
        pst, phow = resolve_plain(part, stadiums, schools, teams)
        if pst or phow.startswith('town:'):
            return pst, phow
    return st, how


def resolve_plain(site, stadiums, schools, teams=()):
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


def town_in(text):
    """The town in an address ("285 St. Hwy 95, Smithville, TX 78957" -> "Smithville")."""
    parts = [re.sub(r'\b(TX|Texas)\b|\d{5}', '', p).strip(' .') for p in text.split(',')[1:]]
    parts = [p for p in parts if p]
    return parts[-1] if parts else ''


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
        conf = json.loads(CONFIRMED.read_text() if CONFIRMED.exists() else '{}')
        known_now = conf.get(site) or next((conf[p.strip()] for p in site.split(',') if p.strip() in conf), None)
        if hit and known_now not in (None, hit.get('confirmed_as')):
            hit = None   # newly confirmed: look it up again
        if hit and hit.get('rules') == RULES and ('lat' in hit or
                                                  (today - datetime.date.fromisoformat(hit['missed'])).days < RETRY_MISS_DAYS):
            continue
        confirmed = json.loads(CONFIRMED.read_text()) if CONFIRMED.exists() else {}
        # a confirmed name for the whole site, or for one part of it ("Lowrey Field, PlainsCapital Park")
        known = confirmed.get(site) or next((confirmed[p.strip()] for p in site.split(',') if p.strip() in confirmed), None)
        st, how = resolve(known or site, stadiums, schools, (t1, t2))
        if known and not st and not how.startswith(('town:', 'address:')):
            how = 'address:' + known   # a confirmed place is looked up as written
        # each try: (search, how it was placed, town and ZIP the result must be in)
        if st:
            c, z = st.get('city', ''), st.get('zip', '')
            tries = [(query_for(site, st), how, c, z), (f"{st['name']}, {c}, Texas", how, c, z),
                     (dict(city=c, state='Texas', postalcode=z) if z else dict(city=c, state='Texas'),
                      how + ' (town only)', c, z)]
        elif how.startswith('town:'):
            tries = [(dict(city=how[5:], state='Texas'), 'town (approximate)', how[5:], '')]
        elif how.startswith('district:'):
            # "Tully Stadium, Spring Branch": only the stadium itself counts, never the district's "town"
            tries = [(how[9:] + ', Texas', 'stadium found by name', '', '')]
        elif how.startswith('address:'):
            text = how[8:]
            t, z = town_in(text), (re.findall(r'\b(\d{5})\b', text) or [''])[-1]
            tries = [(text if re.search(r'\b(TX|Texas)\b', text) else text + ', Texas', 'address in site text', t, z)]
            if ',' in text and t:
                tries.append((dict(city=t, state='Texas'), 'town (approximate)', t, z))
        else:
            tries = []
        # the town the game is in, for "Stadium, Town, TX"
        town = (st or {}).get('city') or (how[5:] if how.startswith('town:') else '') or \
            (town_in(how[8:]) if how.startswith('address:') else '')
        coords = None
        for q, q_how, want_town, want_zip in tries:
            try:
                coords = nominatim(q, want_town, want_zip)
            except Exception as e:
                print(f'  ! geocode {q}: {e}')
            time.sleep(1.1)   # Nominatim allows one request a second
            if coords:
                how = q_how
                break
        entry = dict(stadium_id=st.get('id') if st else None, stadium=st['name'] if st else None,
                     address=query_for(site, st) if st else '', map_link=(st or {}).get('map_link', ''), how=how)
        entry['rules'] = RULES
        if coords:
            entry.update(lat=round(coords[0], 5), lng=round(coords[1], 5))
            added += 1
        else:
            entry.update(missed=today.isoformat())
        entry['site'] = site
        if town:
            entry['city'] = town
        if known:
            entry['confirmed_as'] = known
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
        if hit.get('city'):
            game['city'] = hit['city']
