"""
Map team names from the bracket sources (MaxPreps, UIL PDFs) to the site's full team names.

MaxPreps writes "Martin" where the site writes "Arlington Martin", and several schools
share a short name ("Highland Park" is both Amarillo and Dallas). A name is only changed
when there is no doubt; everything else goes to a review list to be confirmed by a person.

  season/team_names.json   confirmed names, kept across seasons:
                           {"mp:<MaxPreps school id>": "Site Name", "uil:<UIL name>": "Site Name"}

A source name resolves, in order, to:
  1. its confirmed name, if there is one
  2. automatically, only when either
       - exactly one longer name from past seasons ends with it, the extra words are a city
         seen in front of other schools too, that school played in the same conference since
         CONF_SINCE, no other school within one conference also ends with it, and the
         short name was never used on its own; or
       - it was used before under exactly this name and no school within one conference
         has a longer name ending with it;
     and no other team this season resolves to the same name (prefill checks that part)
  3. otherwise nothing: it keeps its source name and goes on the review list
"""
import glob, json, re
from pathlib import Path

from uil_bracket import norm

CONF_SINCE = 2022


def tokens(name):
    return norm(name).split()


class Resolver:
    def __init__(self, root, year):
        self.root = Path(root)
        self.path = self.root / 'season' / 'team_names.json'
        self.confirmed = json.loads(self.path.read_text()) if self.path.exists() else {}
        # every team name used in earlier seasons -> conferences it played in since CONF_SINCE
        self.history = {}
        self.seasons = {}
        for f in glob.glob(str(self.root / 'public' / 'data' / '[0-9]*.json')):
            y = int(Path(f).stem)
            if y >= year:
                continue
            for g in json.load(open(f))['games']:
                for t in (g.get('team1'), g.get('team2')):
                    if t:
                        self.seasons.setdefault(t, set()).add((y, g['classification'][:2]))
                        confs = self.history.setdefault(t, set())
                        if y >= CONF_SINCE:
                            confs.add(g['classification'][:2])

        # city prefixes seen in front of at least two different schools ("el paso", "fort worth");
        # a longer name only counts as a match when the extra words are one of these
        heads = {}
        for name in self.history:
            t = tokens(name)
            for i in range(1, min(3, len(t) - 1) + 1):
                heads.setdefault(' '.join(t[:i]), set()).add(' '.join(t[i:]))
        self.cities = {h for h, rest in heads.items() if len(rest) >= 2}

    def candidates(self, source_name):
        """Past full names that end with the source name, plus same-name entries."""
        st = tokens(source_name)
        out = []
        for name, confs in self.history.items():
            nt = tokens(name)
            if nt == st or (len(nt) > len(st) and nt[-len(st):] == st):
                out.append((name, confs))
        return out

    def resolve(self, key, source_name, cls):
        """Returns (name, how, suggestions); name is None when a person has to decide."""
        if key in self.confirmed:
            return self.confirmed[key], 'confirmed', []
        st = tokens(source_name)
        conf = cls[:2]
        cands = self.candidates(source_name)
        # one entry per school: "SA Brennan" and "San Antonio Brennan" are spellings of the same name
        longer = {}
        for n, c in cands:
            nt = tokens(n)
            if len(nt) > len(st):
                k = ' '.join(nt)
                if ' '.join(nt[:len(nt) - len(st)]) not in self.cities:
                    k = '?' + k   # not a known city in front: still offered, never chosen automatically
                best = longer.get(k)
                longer[k] = (max(best[0], n, key=len) if best else n, (best[1] if best else set()) | c)
        # schools that could be confused with this one: played within one conference of it
        # (or not since CONF_SINCE, so we can't tell)
        level = int(conf[0])
        near = {k: (n, c) for k, (n, c) in longer.items() if not c or any(abs(int(x[0]) - level) <= 1 for x in c)}
        same_conf = [n for k, (n, c) in near.items() if conf in c]
        if any(k.startswith('?') for k in near):
            same_conf = []
        exact = [n for n, c in cands if tokens(n) == st]
        # if the short name was also used on its own it may be a different school ("Hondo" vs "Rio Hondo")
        if len(same_conf) == 1 and len(near) == 1 and not exact:
            return same_conf[0], 'auto', []
        if not near and exact:
            # used before under exactly this name, and no nearby school ends with it
            return max(exact, key=len), 'auto', []
        sugg = sorted({n for n, c in longer.values()} | set(exact),
                      key=lambda n: (conf not in self.history.get(n, set()), -len(n)))
        return None, 'review', self._recommend_first(source_name, conf, sugg, exact)[:4]

    def _recommend_first(self, source_name, conf, sugg, exact):
        """Order suggestions so the most likely answer comes first (only a suggestion: a person decides)."""
        if not sugg:
            return []
        top = sugg[0]
        if exact and top not in exact:
            # short and long name in the same season and conference means two schools ("Hondo", "Rio Hondo")
            if any(self.seasons.get(top, set()) & self.seasons.get(e, set()) for e in exact):
                top = max(exact, key=len)
        return [top] + [n for n in sugg if n != top]

    def confirm(self, key, name):
        self.confirmed[key] = name
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self.path.write_text(json.dumps(dict(sorted(self.confirmed.items())), indent=2) + '\n')
