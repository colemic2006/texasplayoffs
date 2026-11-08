#!/usr/bin/env python3
"""
Parse TexasBob.com stadium pages into public/data/stadiums.json.

Stadium data courtesy of Robert McSpadden, TexasBob.com (used with permission).

  python3 scripts/texasbob_stadiums.py PAGES_DIR

PAGES_DIR holds the saved pages, one per stadium, named <id>.html
(https://texasbob.com/stadium/stadium.php?id=<id>). Records already in stadiums.json
that Texas Bob doesn't have are kept as they are.
"""
import html, json, re, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'public' / 'data' / 'stadiums.json'


def text(s):
    return re.sub(r'\s+', ' ', html.unescape(re.sub(r'<[^>]+>', ' ', s or ''))).strip()


def field(page, label):
    m = re.search(rf'<strong>\s*{label}:?\s*</strong>\s*(?::\s*)?([^<]*)', page)
    return text(m.group(1)) if m else ''


def yes_no(v):
    return {'yes': True, 'no': False}.get(v.lower())


def parse(page, sid):
    name = re.search(r'<h1><strong>(.*?)</strong></h1>', page, re.S)
    if not name or not text(name.group(1)):
        return None
    rec = dict(id=sid, name=text(name.group(1)))
    m = re.search(r'region_index\.php\?region=(\d+)">\s*<button[^>]*>(.*?)</button>', page, re.S)
    if m:
        rec['region'] = text(m.group(2))
    m = re.search(r'Address Map Link:\s*</strong>\s*<a href="([^"]*)"[^>]*>(.*?)</a>', page, re.S)
    if m:
        rec['map_link'] = m.group(1).strip()
        addr = text(m.group(2))
        a = re.match(r'(.*?)\s*--\s*(.*?),\s*Texas\s*(\d{5})?', addr)
        if a:
            rec.update(address=a.group(1), city=a.group(2), state='Texas', zip=a.group(3) or '')
        else:
            rec['address'] = addr
    owner = re.search(r'<strong>Owner:</strong>(.*?)</div>', page, re.S)
    if owner and text(owner.group(1)):
        rec['owner'] = text(owner.group(1))
    m = re.search(r'County:\s*</strong>\s*<a[^>]*>(.*?)</a>', page, re.S)
    if m and text(m.group(1)):
        rec['county'] = text(m.group(1))
    cap = re.sub(r'[^\d]', '', field(page, 'Capacity'))
    if cap:
        rec['capacity'] = int(cap)
    for key, label in (('stadium_type', 'Stadium Type'), ('year_opened', 'Year Opened'),
                       ('surface', 'Playing Surface'), ('wheelchair_access', 'Wheelchair Access')):
        v = field(page, label)
        if v:
            rec[key] = int(v) if key == 'year_opened' and v.isdigit() else v
    for key, label in (('track', 'Track'), ('soccer', 'Soccer'), ('video_scoreboard', 'Video Scoreboard'),
                       ('press_box_elevator', 'Press Box Elevator')):
        v = yes_no(field(page, label))
        if v is not None:
            rec[key] = v
    grid = re.search(r'Home Teams:\s*</strong>(.*?)<!--Team Grid end-->', page, re.S)
    if grid:
        teams = [text(t) for t in re.findall(r'<div class="col-lg-6">(.*?)</div>', grid.group(1), re.S)]
        rec['home_teams'] = [t for t in teams if t]
    upd = field(page, 'Last update')
    if upd:
        rec['texasbob_updated'] = upd
    rec['source'] = f'https://texasbob.com/stadium/stadium.php?id={sid}'
    return rec


def key(r):
    return tuple(text(str(r.get(k, ''))).lower() for k in ('name', 'city'))


def main(pages_dir):
    pages = sorted(Path(pages_dir).glob('*.html'), key=lambda p: int(p.stem))
    recs, skipped = [], []
    for p in pages:
        r = parse(p.read_text(errors='replace'), int(p.stem))
        (recs.append(r) if r else skipped.append(p.stem))
    old = json.loads(OUT.read_text())['stadiums'] if OUT.exists() else []
    new_keys = {key(r) for r in recs}
    kept = [r for r in old if key(r) not in new_keys]
    stadiums = sorted(recs + kept, key=lambda r: (r.get('city', ''), r.get('name', '')))
    # one stadium per line keeps the file small and its diffs readable
    lines = ',\n'.join('  ' + json.dumps(r, ensure_ascii=False) for r in stadiums)
    OUT.write_text('{\n "source": "Stadium data courtesy of Robert McSpadden, TexasBob.com (used with permission)",\n'
                   f' "_count": {len(stadiums)},\n "stadiums": [\n{lines}\n ]\n}}\n')
    print(f'{len(recs)} stadiums from Texas Bob, {len(kept)} kept from the old file '
          f'(not on Texas Bob), {len(skipped)} pages without a stadium: {skipped[:10]}')


if __name__ == '__main__':
    main(sys.argv[1])
