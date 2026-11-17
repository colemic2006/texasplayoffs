"""One-off probe (run from GitHub Actions): find past seasons' MaxPreps bracket links in Internet
Archive snapshots of UIL's playoff-bracket pages, and check those brackets still carry game sites."""
import json, re, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))
from bs4 import BeautifulSoup
from season import fetch, read_card

for year in (2025, 2024, 2023, 2022, 2021):
    for cls in ('6AD1', '2AD2'):
        page = f'uiltexas.org/football/playoff-brackets/{cls}'
        try:
            rows = json.loads(fetch(f'https://web.archive.org/cdx/search/cdx?url={page}&from={year}11&to={year + 1}01'
                                    f'&output=json&fl=timestamp&filter=statuscode:200&collapse=digest'))
        except Exception as e:
            print(year, cls, 'CDX failed', e); continue
        stamps = [r[0] for r in rows[1:]]
        print(year, cls, 'snapshots:', len(stamps), stamps[:3])
        found = None
        for ts in stamps[::-1][:4]:
            try:
                html = fetch(f'https://web.archive.org/web/{ts}id_/https://www.{page}')
            except Exception as e:
                print('  snapshot failed', ts, e); continue
            m = re.search(r'https?://www\.maxpreps\.com/tournament/view\.aspx[^"\'<\s]+', html)
            if m:
                found = m.group(0).replace('&amp;', '&'); print('  ', ts, found); break
        if not found:
            continue
        try:
            soup = BeautifulSoup(fetch(found), 'html.parser')
            print('   title:', soup.title.get_text(strip=True)[:90] if soup.title else '')
            mus = soup.select('li.matchup-container')
            print('   matchups:', len(mus))
            cards = [mu.select_one('[data-hover-card]') for mu in mus]
            cards = [c for c in cards if c][:3]
            for c in cards:
                print('   card:', read_card('https://www.maxpreps.com' + c['data-hover-card'].replace('&amp;', '&')))
        except Exception as e:
            print('   bracket fetch failed', e)
