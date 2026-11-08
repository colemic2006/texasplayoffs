#!/usr/bin/env python3
"""
Link each team on the site to its home stadium, from TexasBob.com's school list
(Robert McSpadden, used with permission).

  python3 scripts/link_home_stadiums.py SCHOOL_LIST.json

SCHOOL_LIST.json: [[stadium_id, city, school, stadium], ...] read from
https://texasbob.com/stadium/school_list.php?sort=1..26

A team is linked only when its name matches exactly one school:
  - city + school ("Arlington" + "Martin High School" = "Arlington Martin"), or
  - the town's own school ("Anna High School" in Anna = "Anna"), or
  - a name of two or more words that no other school in the list shares ("Byron Nelson").
A bare name that schools in several towns use ("Trinity": Euless or Trinity), or a one-word
name, is never linked automatically.
Anything else is left unlinked and listed in season/home_stadium_review.csv to be
confirmed; confirmed links go in season/home_stadiums_confirmed.json
({"Team name": stadium_id}) and always win.
"""
import csv, glob, json, re, sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from uil_bracket import norm  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'public' / 'data' / 'home_stadiums.json'
CONFIRMED = ROOT / 'season' / 'home_stadiums_confirmed.json'
REVIEW = ROOT / 'season' / 'home_stadium_review.csv'
SUFFIX = re.compile(r'\s+(jr\.?\s*/\s*sr\.?\s+high school|junior[- ]senior high school|high school|secondary school|'
                    r'school|h\.?\s*s\.?)$', re.I)


def site_teams():
    teams = set(json.loads((ROOT / 'public' / 'data' / 'home_chapters.json').read_text()))
    for f in glob.glob(str(ROOT / 'public' / 'data' / '[0-9]*.json')):
        for g in json.load(open(f))['games']:
            for t in (g.get('team1'), g.get('team2')):
                if t and not t.endswith('(?)'):
                    teams.add(t)
    return teams


def main(school_list):
    rows = json.load(open(school_list))
    stadiums = {s['id']: s for s in json.loads((ROOT / 'public' / 'data' / 'stadiums.json').read_text())['stadiums'] if 'id' in s}
    certain, bare = {}, {}
    for sid, city, school, stad in rows:
        core = SUFFIX.sub('', school).strip()
        c, n = norm(city), norm(core)
        entry = (sid, city, school)
        for form in {f'{c} {n}', f'{n} high'} | ({n} if n == c else set()):
            certain.setdefault(form, []).append(entry)
        bare.setdefault(n, []).append(entry)

    confirmed = json.loads(CONFIRMED.read_text()) if CONFIRMED.exists() else {}
    links, review = {}, []
    for team in sorted(site_teams()):
        if team in confirmed:
            links[team] = (confirmed[team], 'confirmed')
            continue
        k = norm(team)
        options = lambda entries: '; '.join(f'{e[2]} ({e[1]}) -> {stadiums.get(e[0], {}).get("name", e[0])} [id {e[0]}]'
                                            for e in entries)
        # a bare school name ("Trinity") used by schools in more than one town could be any of them
        if len({e[1] for e in bare.get(k, [])}) > 1:
            review.append((team, 'several schools with this name', options(bare[k])))
            continue
        hits = {e[0]: e for e in certain.get(k, [])}
        how = 'city + school'
        if not hits and k in bare:
            if len(k.split()) < 2:
                # one-word names ("King") are too often used for several schools to trust
                review.append((team, 'one-word name: which school?', options(bare[k])))
                continue
            hits = {e[0]: e for e in bare[k]}
            how = 'only school with this name'
        if len(hits) == 1:
            links[team] = (next(iter(hits)), how)
        elif len(hits) > 1:
            review.append((team, 'school listed at more than one stadium', options(hits.values())))

    out = {}
    for team, (sid, how) in links.items():
        s = stadiums.get(sid)
        if s:
            out[team] = dict(stadium_id=sid, stadium=s['name'], city=s.get('city', ''), how=how)
    OUT.write_text(json.dumps(dict(
        source='Home stadiums from TexasBob.com school list (Robert McSpadden, used with permission)',
        teams=out), indent=1, ensure_ascii=False) + '\n')
    REVIEW.parent.mkdir(parents=True, exist_ok=True)
    with open(REVIEW, 'w', newline='') as f:
        w = csv.writer(f)
        w.writerow(['team', 'why it needs a person', 'options'])
        w.writerows(review)
    total = len(site_teams())
    print(f'{len(out)} of {total} teams linked; {len(review)} to confirm; '
          f'{total - len(out) - len(review)} with no school on Texas Bob\'s list')


if __name__ == '__main__':
    main(sys.argv[1])
