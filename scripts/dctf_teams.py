#!/usr/bin/env python3
"""
Link each team on the site to its page on Dave Campbell's Texas Football
(https://www.davecampbells.com/team/<slug>), for the game lists' "DCTF" buttons.

  python3 scripts/dctf_teams.py

Team pages come from the site's public sitemap (sitemaps/teams.xml; robots.txt allows it).
Its game pages can't be found the same way: schedules load through /api, which robots.txt
asks crawlers to stay out of, so the site links to team pages instead.

A slug is "<school name>-<mascot>" ("canadian-wildcats", "el-paso-irvin-rockets"). A team is
linked only when exactly one team page fits its name:
  - the mascot from its TexasBob.com home stadium ("Kilgore Bulldogs") settles a name shared
    with a college or private school ("kilgore-bulldogs", not "kilgore-rangers"), and a city
    the site leaves off ("Northbrook" -> "houston-northbrook-raiders");
  - otherwise the page must start with the name and have the fewest words after it, with no
    other page tied ("el-paso-tigers", not "el-paso-austin-panthers").
Names that still fit several pages, or none, get no button. Confirmed links go in
season/dctf_confirmed.json ({"Team name": "slug"}) and always win.
"""
import glob, json, re, sys, urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'public' / 'data' / 'dctf_teams.json'
CONFIRMED = ROOT / 'season' / 'dctf_confirmed.json'
SITEMAP = 'https://www.davecampbells.com/sitemaps/teams.xml'
UA = 'texasplayoffs.com team links (https://texasplayoffs.com)'


def slug(text):
    return re.sub(r'[^a-z0-9]+', '-', text.lower().replace("'", '').replace('.', '')).strip('-')


def site_teams():
    names = set()
    for f in glob.glob(str(ROOT / 'public' / 'data' / '[0-9]*.json')):
        for g in json.load(open(f))['games']:
            for t in (g.get('team1'), g.get('team2')):
                if t and not t.endswith('(?)'):
                    names.add(t)
    return names


def mascots():
    """Team name -> mascot slugs, from the TexasBob home stadium's home teams ("Godley Wildcats")."""
    homes = json.loads((ROOT / 'public' / 'data' / 'home_stadiums.json').read_text())['teams']
    stadiums = {s['id']: s for s in json.loads((ROOT / 'public' / 'data' / 'stadiums.json').read_text())['stadiums'] if 'id' in s}
    out = {}
    for team, h in homes.items():
        st = stadiums.get(h.get('stadium_id'), {})
        out[team] = {slug(ht) for ht in st.get('home_teams', [])}
    return out


def link(team, slugs, masc):
    s = slug(team)
    prefix = [x for x in slugs if x.startswith(s + '-')]
    inside = [x for x in slugs if f'-{s}-' in f'-{x}' and x not in prefix]
    # the home stadium's team ("Kilgore Bulldogs") names the page's ending
    # the home stadium's team of this name ("Kilgore Bulldogs", "Houston Northbrook Raiders")
    # gives the mascot; other teams sharing the stadium say nothing about this one
    ends = {m[m.find(s) + len(s):].strip('-') for m in masc.get(team, set()) if f'-{s}-' in f'-{m}'}
    ends = {re.sub(r'^(high-school-|high-|hs-)', '', e) for e in ends}   # "Kilgore High School Bulldogs"
    ends |= {m for m in masc.get(team, set()) if '-' not in m}         # just "Leopards"
    ends = {e for e in ends if e and len(e.split('-')) <= 2}
    if ends:
        hits = [x for x in prefix + inside if any(x.endswith('-' + e) and x.find(s) + len(s) + 1 + len(e) == len(x) for e in ends)]
        if len(hits) == 1:
            return hits[0]
    if not prefix:
        return None
    rest = {x: len(x[len(s):].strip('-').split('-')) for x in prefix}
    fewest = min(rest.values())
    best = [x for x, n in rest.items() if n == fewest]
    return best[0] if len(best) == 1 and fewest <= 2 else None


def main():
    req = urllib.request.Request(SITEMAP, headers={'User-Agent': UA})
    with urllib.request.urlopen(req, timeout=60) as r:
        xml = r.read().decode()
    slugs = re.findall(r'/team/([a-z0-9-]+)</loc>', xml)
    if len(slugs) < 500:
        sys.exit(f'only {len(slugs)} team pages in the sitemap; leaving {OUT.name} as it is')
    masc = mascots()
    confirmed = json.loads(CONFIRMED.read_text()) if CONFIRMED.exists() else {}
    teams = site_teams()
    links = {}
    for t in sorted(teams):
        x = confirmed.get(t) or link(t, slugs, masc)
        if x:
            links[t] = x
    OUT.write_text(json.dumps(dict(source='Team pages: Dave Campbell\'s Texas Football, davecampbells.com',
                                   teams=links), indent=1) + '\n')
    print(f'dctf: {len(links)} of {len(teams)} teams linked to a davecampbells.com team page')


if __name__ == '__main__':
    main()
