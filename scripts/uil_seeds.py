"""District seeds from UIL bracket PDFs -> public/data/seeds.json.

Each first-round team on a UIL bracket carries a label like "W 1" or "F 12": the letter is
where it finished in its district (W = champion, R = runner-up, T = third, F = fourth) and
the number is the district. Those labels are matched to the site's own team names for that
season and class, so the front end can tell when a lower seed beat a higher one.

  python3 scripts/uil_seeds.py 2022 2023 2024 2025      # fetch the PDFs from UIL
  python3 scripts/uil_seeds.py 2025 --dir some/folder    # use PDFs already on disk
In season, before UIL posts the PDFs, the seeds come from the MaxPreps bracket UIL embeds on
its playoff pages (the same "W1", "F2" labels; MaxPreps only answers from GitHub Actions).
Classes already in seeds.json are skipped, so the season workflow can run this every time.
"""
import json, re, sys, tempfile, pathlib, urllib.request

sys.path.insert(0, str(pathlib.Path(__file__).parent))
from uil_bracket import _words, sim  # noqa: E402

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / 'public/data/seeds.json'
URL = 'https://www.uiltexas.org/files/athletics/brackets/football/{y}_{c}-{d}_FB_Bracket-{r}.pdf'
LABEL = re.compile(r'^([WRTF])\s*(\d)\s*(\d)?$')     # older PDFs space the digits: "R 1 2"
ALIAS = {'northside': 'san antonio', 'nrh': 'north richland hills', 'psja': 'pharr san juan alamo',
         'comal': 'san antonio', 'co.': 'county', 'sa': 'san antonio',
         'tlc': 'trinity leadership', 'ymla': 'young mens leadership academy',
         'pharr-san': 'psja', 'juan-alamo': 'high'}
PLACE = {'W': 1, 'R': 2, 'T': 3, 'F': 4}
CLASSES = [f'{c}A D{d}' for c in range(1, 7) for d in (1, 2)]


def seeds_from_pdf(path):
    """[(short name on the bracket, place 1-4, district, side, y)] for the first-round teams."""
    ws, width = _words(path)
    labels = [w for w in ws if LABEL.match(w['t'])]
    out = []
    for lab in labels:
        left = lab['cx'] < width / 2
        # the team name sits just inside the label, a few points above it
        near = [w for w in ws if w is not lab and not LABEL.match(w['t']) and -4 < lab['top'] - w['top'] < 12
                and ((w['x0'] > lab['x1'] - 2 and w['x0'] - lab['x1'] < 120) if left
                     else (w['x1'] < lab['x0'] + 2 and lab['x0'] - w['x1'] < 120))]
        if not near:
            continue
        n = min(near, key=lambda w: abs(lab['top'] - w['top'] - 3) + abs((w['x0'] - lab['x1']) if left else (lab['x0'] - w['x1'])) * 0.05)
        m = LABEL.match(lab['t'])
        out.append((n['t'].strip('* '), PLACE[m.group(1)], int(m.group(2) + (m.group(3) or '')), left, lab['top']))
    return out


def first_round_pairs(found):
    """Teams in bracket order down each side; neighbours (0-1, 2-3, ...) meet in the first round."""
    pairs = []
    for left in (True, False):
        side = sorted([f for f in found if f[3] == left], key=lambda f: f[4])
        pairs += [(side[i], side[i + 1]) for i in range(0, len(side) - 1, 2)]
    return pairs


def match(short, full):
    s = ' '.join(ALIAS.get(t.lower(), t) for t in short.split())
    return max(sim(short, full), sim(s, full))


def fetch_pdf(year, cls):
    c, d = cls.split()
    for r in (3, 2, 1, ''):
        url = URL.format(y=year, c=c, d=d, r=r).replace('-.pdf', '.pdf')
        try:
            with urllib.request.urlopen(url, timeout=60) as f:
                return f.read()
        except Exception:
            continue
    return None


SEED_TXT = re.compile(r'^([WRTF])\s*(\d{1,2})$')


def maxpreps_pairs(year, cls):
    """First-round pairings with seeds from the MaxPreps bracket on UIL's playoff page."""
    from bs4 import BeautifulSoup
    from season import fetch, UIL
    page = fetch(f'{UIL}/football/playoff-brackets/{cls.replace(" ", "")}')
    m = re.search(r'https://www\.maxpreps\.com/tournament/view\.aspx[^"]+', page)
    if not m:
        return []
    soup = BeautifulSoup(fetch(m.group(0).replace('&amp;', '&')), 'html.parser')
    if str(year) not in (soup.title.get_text() if soup.title else ''):
        return []
    # each round can be split into several blocks (one per half of the bracket); take every block
    # that starts on the first playoff date
    dated = [(r.select_one('abbr.start-date[title]'), r) for r in soup.select('div.round')]
    dated = [(d['title'][:10], r) for d, r in dated if d]
    if not dated:
        return []
    first = min(d for d, _ in dated)
    rounds = [r for d, r in dated if d == first]
    pairs = []
    for mu in [m for r in rounds for m in r.select('li.matchup-container')]:
        teams = mu.select('li.team')
        if len(teams) != 2:
            continue
        side = []
        for t in teams:
            name = t.select_one('.name').get_text(strip=True) if t.select_one('.name') else ''
            # the seed label sits in its own element ("W1", "F2"); find it without relying on a class name
            lab = next((SEED_TXT.match(x) for x in t.stripped_strings if SEED_TXT.match(x)), None)
            if not name or not lab:
                break
            side.append((name, PLACE[lab.group(1)], int(lab.group(2)), True, 0))
        if len(side) == 2:
            pairs.append(tuple(side))
    if not pairs and rounds[0].select('li.team'):
        t = rounds[0].select('li.team')[0]
        print(f'  ? {cls}: no seed labels found on MaxPreps; first team reads {list(t.stripped_strings)[:8]}')
    return pairs


def season_seeds(year, src_dir=None, have=()):
    games = json.load(open(ROOT / f'public/data/{year}.json'))['games']
    out, problems = {}, []
    for cls in CLASSES:
        teams = sorted({t for g in games if g['classification'] == cls for t in (g['team1'], g['team2']) if t})
        wk1 = {t for g in games if g['classification'] == cls and g['week'] == 1 for t in (g['team1'], g['team2']) if t}
        if not teams or (cls in have and len(have[cls]) >= len(wk1)):   # seeds don't change once a bracket is out
            continue
        if src_dir:
            p = pathlib.Path(src_dir) / f'{year}_{cls.replace(" ", "-")}.pdf'
            data = p.read_bytes() if p.exists() else None
        else:
            data = fetch_pdf(year, cls)
        if data:
            with tempfile.NamedTemporaryFile(suffix='.pdf') as f:
                f.write(data); f.flush()
                pairs = first_round_pairs(seeds_from_pdf(f.name))
        elif not src_dir:
            try:
                pairs = maxpreps_pairs(year, cls)
            except Exception as e:
                pairs = []
                problems.append(f'{cls}: MaxPreps: {e}')
            if not pairs:
                problems.append(f'{cls}: no PDF or MaxPreps seeds yet'); continue
            print(f'  {cls}: seeds from MaxPreps ({len(pairs)} first-round games)')
        else:
            problems.append(f'{cls}: no PDF'); continue
        # match each bracket first-round pairing to a site week-1 game, best overall fit first
        site = [(g['team1'], g['team2']) for g in games if g['classification'] == cls and g['week'] == 1]
        first = sorted({t for g in site for t in g})
        cand = []
        for pa in pairs:
            if 'BYE' in (pa[0][0].upper(), pa[1][0].upper()):
                continue
            for g in site:
                for x, y in ((g[0], g[1]), (g[1], g[0])):
                    cand.append((match(pa[0][0], x) + match(pa[1][0], y), pa, (x, y)))
        cand.sort(key=lambda c: -c[0])
        taken, used = {}, set()
        for sc, pa, g in cand:
            if id(pa) in used or g[0] in taken or g[1] in taken:
                continue
            if sc < 1.0 or (max(match(pa[0][0], g[0]), match(pa[1][0], g[1])) < 0.8
                                and min(match(pa[0][0], g[0]), match(pa[1][0], g[1])) < 0.3):
                continue
            used.add(id(pa))
            for (short, place, dist, *_), t in zip(pa, g):
                taken[t] = short
                out.setdefault(cls, {})[t] = dict(place=place, district=dist)
                if match(short, t) < 0.6:
                    problems.append(f'{cls}: check "{short}" = {t} (matched by opponent)')
        for pa in pairs:
            if id(pa) not in used and 'BYE' not in (pa[0][0].upper(), pa[1][0].upper()):
                problems.append(f'{cls}: bracket game {pa[0][0]} v {pa[1][0]} not matched')
        missing = [t for t in first if t not in taken]
        if missing:
            problems.append(f'{cls}: no seed found for {", ".join(missing)}')
    return out, problems


def main(argv):
    src = None
    if '--dir' in argv:
        i = argv.index('--dir'); src = argv[i + 1]; argv = argv[:i] + argv[i + 2:]
    data = json.load(open(OUT)) if OUT.exists() else {}
    for y in argv:
        if not (ROOT / f'public/data/{y}.json').exists():
            continue
        seeds, problems = season_seeds(int(y), src, have=data.get(str(y), {}))
        n = sum(len(v) for v in seeds.values())
        print(f'{y}: {n} seeded teams in {len(seeds)} classes')
        for p in problems:
            print('  !', p)
        if seeds:
            data.setdefault(str(y), {}).update(seeds)
    json.dump(data, open(OUT, 'w'), indent=1, sort_keys=True)


if __name__ == '__main__':
    main(sys.argv[1:])
