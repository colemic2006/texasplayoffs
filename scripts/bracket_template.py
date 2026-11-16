#!/usr/bin/env python3
"""
UIL's bracket order for each class, from a past season's bracket PDFs: the first-round lines
top to bottom (left side, then right side) as district-finish labels ("W10", "R9", ...). The
order is fixed by UIL, so with this season's seeds the site can lay out a bracket in UIL's order
before UIL posts the new PDFs (MaxPreps lists games in a different order).
  python3 scripts/bracket_template.py <dir with <year>_<class>.pdf> <year>
writes public/data/bracket_template.json  {class: [label, ...]}
"""
import json, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))
from uil_seeds import seeds_from_pdf, CLASSES  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
src, year = Path(sys.argv[1]), sys.argv[2]
out = {}
for cls in CLASSES:
    p = src / f'{year}_{cls.replace(" ", "-")}.pdf'
    if not p.exists():
        print(f'  ! {cls}: no PDF'); continue
    found = seeds_from_pdf(str(p))
    order = sorted([f for f in found if f[3]], key=lambda f: f[4]) + sorted([f for f in found if not f[3]], key=lambda f: f[4])
    out[cls] = [f"{'WRTF'[f[1] - 1]}{f[2]}" for f in order]
    print(f'  {cls}: {len(out[cls])} lines')
(ROOT / 'public/data/bracket_template.json').write_text(json.dumps(dict(source=f'UIL {year} bracket PDFs', classes=out), indent=1) + '\n')
