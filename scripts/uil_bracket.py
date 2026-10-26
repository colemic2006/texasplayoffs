"""Parse a UIL football bracket PDF into a list of games.

The PDF is a drawn bracket: seeds on the outer edges, each later round a column
of "winner short-name / score" pairs moving inward, semis and final in the centre.
Games are rebuilt from that layout; short names are resolved to the full names of
the two teams that fed the game. Works on in-season PDFs too (unplayed games come
back with no score)."""
import re, difflib, pdfplumber

SCORE = re.compile(r'^\*?(\d{1,3})\s*-\s*(\d{1,3})\*?(?:\s*\(?(\d?\s*OT)\)?)?$', re.I)
LABEL = re.compile(r'^[WR]\s*\d{1,2}$')
SKIP = re.compile(r'^(Region \d|State Champion|\d{4} Football Conference.*|[A-Z] Division ?\d?|\d|[A-Z] \d{1,2}|Forfeit)$', re.I)
ABBR = {'sa': 'san antonio', 'fb': 'fort bend', 'cc': 'corpus christi', 'ep': 'el paso', 'ft': 'fort',
        'gp': 'galena park', 'cy': 'cypress', 'dc': 'dallas christian'}

def norm(s):
    s = (s or '').lower().replace('Å', 'a').replace('&', ' and ')
    s = re.sub(r"[^a-z0-9 ]", ' ', s)
    return ' '.join(ABBR.get(t, t) for t in s.split())

def sim(short, full):
    a, b = norm(short), norm(full)
    if not a or not b: return 0
    if a == b: return 1.0
    if short.isupper() and 2 <= len(short) <= 5:
        init = ''.join(t[0] for t in re.split(r'[\s-]+', full) if t)
        if init.upper() == short: return 0.95
    ta, tb = set(a.split()), set(b.split())
    if ta <= tb: return 0.9 + 0.05 * len(ta) / len(tb)
    if tb <= ta: return 0.85 + 0.05 * len(tb) / len(ta)
    return difflib.SequenceMatcher(None, a, b).ratio() * 0.9

def _words(path):
    p = pdfplumber.open(path).pages[0]
    out = []
    for w in p.extract_words(keep_blank_chars=True, x_tolerance=2, y_tolerance=2):
        t = w['text'].strip()
        if t:
            out.append(dict(t=t, x0=w['x0'], x1=w['x1'], top=w['top'], cx=(w['x0'] + w['x1']) / 2))
    return out, p.width

def _cluster(vals, gap=25):
    vals = sorted(vals); groups = [[vals[0]]]
    for v in vals[1:]:
        (groups[-1].append(v) if v - groups[-1][-1] < gap else groups.append([v]))
    return [sum(g) / len(g) for g in groups]

def parse(path):
    ws, W = _words(path)
    mid = W / 2
    scores = [w for w in ws if SCORE.match(w['t'])]
    names = [w for w in ws if not SCORE.match(w['t']) and not LABEL.match(w['t']) and not SKIP.match(w['t'])
             and w['top'] > 45]
    center = [s for s in scores if abs(s['cx'] - mid) < 40]
    side = {'L': [s for s in scores if s['cx'] < mid - 40], 'R': [s for s in scores if s['cx'] > mid + 40]}
    used = set()

    def name_for(s, xtol=70):
        c = [n for n in names if id(n) not in used and 3 < s['top'] - n['top'] < 30 and abs(n['cx'] - s['cx']) < xtol]
        if not c:
            return None
        n = min(c, key=lambda n: abs(s['top'] - n['top'] - 15) + abs(n['cx'] - s['cx']) * 0.4)
        used.add(id(n)); return n['t'].strip('* ').lstrip('*')

    def entry(s):
        m = SCORE.match(s['t'])
        return dict(short=name_for(s), hi=int(m.group(1)), lo=int(m.group(2)), ot=bool(m.group(3)), y=s['top'], raw=s['t'])

    games, issues = [], []
    finals = {}
    for sd in 'LR':
        cols = _cluster([s['cx'] for s in side[sd]])
        cols = cols if sd == 'L' else cols[::-1]          # outermost first
        if sd == 'L':
            seeds = [n for n in names if n['cx'] < cols[0] - 45]
        else:
            seeds = [n for n in names if n['cx'] > cols[0] + 45]
        for n in seeds: used.add(id(n))
        prev = [dict(team=n['t'].strip('* ').lstrip('*'), y=n['top']) for n in sorted(seeds, key=lambda n: n['top'])]
        for r, cx in enumerate(cols, 1):
            col = sorted([s for s in side[sd] if abs(s['cx'] - cx) < 15], key=lambda s: s['top'])
            entries = [entry(s) for s in col]
            byes = sum(1 for i in range(0, len(prev) - 1, 2) if 'BYE' in ((prev[i]['team'] or '').upper(), (prev[i + 1]['team'] or '').upper()))
            if len(prev) != 2 * (len(entries) + byes) and r == 1 and entries:
                issues.append(f'{sd} round {r}: {len(prev)} teams for {len(entries)} results')
            nxt, pool = [], list(entries)
            for i in range(0, len(prev) - 1, 2):
                a, b = prev[i], prev[i + 1]
                ymid = (a['y'] + b['y']) / 2
                if 'BYE' in ((a['team'] or '').upper(), (b['team'] or '').upper()):
                    nxt.append(dict(team=b['team'] if (a['team'] or '').upper() == 'BYE' else a['team'], y=ymid)); continue
                near = [e for e in pool if min(a['y'], b['y']) - 12 <= e['y'] <= max(a['y'], b['y']) + 30]
                if not near:
                    # matchup is set but not played yet
                    if a['team'] and b['team']:
                        games.append(dict(round=r, team1=a['team'], team2=b['team'], winner=None, loser=None,
                                          ws=None, ls=None, ot=False, short=None))
                    nxt.append(dict(team=None, y=ymid)); continue
                e = min(near, key=lambda e: abs(e['y'] - ymid)); pool.remove(e)
                g = _resolve(e, a['team'], b['team'], r, issues)
                games.append(g); nxt.append(dict(team=g['winner'], y=e['y']))
            prev = nxt
        if len(prev) > 2:
            # next round on this side is set (both teams known) but has no scores yet
            r = len(cols) + 1
            for i in range(0, len(prev) - 1, 2):
                a, b = prev[i]['team'], prev[i + 1]['team']
                if a and b:
                    games.append(dict(round=r, team1=a, team2=b, winner=None, loser=None, ws=None, ls=None, ot=False, short=None))
            prev = []
        finals[sd] = prev
    # centre: semis are top/bottom, final is the middle one
    center.sort(key=lambda s: s['top'])
    if not games:
        return games, issues
    nround = max(g['round'] for g in games)
    if not center:
        for sd in 'LR':
            if len(finals[sd]) == 2 and all(p['team'] for p in finals[sd]):
                games.append(dict(round=nround + 1, team1=finals[sd][0]['team'], team2=finals[sd][1]['team'],
                                  winner=None, loser=None, ws=None, ls=None, ot=False, short=None))
        return games, issues
    if any(len(finals[sd]) != 2 for sd in 'LR'):
        issues.append(f"side finals: L={len(finals['L'])} R={len(finals['R'])}; centre not parsed")
        center = []
    if len(center) == 3:
        semi_t, fin, semi_b = [entry(s) for s in center]
        st = _resolve(semi_t, *[p['team'] for p in finals['L']], nround + 1, issues)
        sb = _resolve(semi_b, *[p['team'] for p in finals['R']], nround + 1, issues)
        games += [st, sb, _resolve(fin, st['winner'], sb['winner'], nround + 2, issues)]
    elif len(center) == 2:
        semi_t, semi_b = [entry(s) for s in center]
        games += [_resolve(semi_t, *[p['team'] for p in finals['L']], nround + 1, issues),
                  _resolve(semi_b, *[p['team'] for p in finals['R']], nround + 1, issues)]
        issues.append('no state final score in PDF')
    else:
        issues.append(f'{len(center)} centre scores')
    return games, issues

def _resolve(e, a, b=None, rnd=0, issues=None, *extra):
    if b is None or extra or not isinstance(rnd, int):
        raise ValueError('bad feeders')
    if a is None or b is None:
        issues.append(f"round {rnd}: result {e['raw']} but a feeder game is unresolved")
        a, b = a or '?', b or '?'
    sa, sb = sim(e['short'], a), sim(e['short'], b)
    w, l = (a, b) if sa >= sb else (b, a)
    if e['short'] is None or max(sa, sb) < 0.5:
        issues.append(f"round {rnd}: can't tell winner of {a} vs {b} from '{e['short']}' {e['raw']}")
    return dict(round=rnd, team1=a, team2=b, winner=w, loser=l, ws=e['hi'], ls=e['lo'], ot=e['ot'], short=e['short'])
