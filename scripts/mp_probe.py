"""One-off probe (run from GitHub Actions): how MaxPreps links to past seasons' playoff brackets."""
import re, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))
from bs4 import BeautifulSoup
from season import fetch, UIL, read_card

page = fetch(f'{UIL}/football/playoff-brackets/6AD1')
m = re.search(r'https://www\.maxpreps\.com/tournament/view\.aspx[^"]+', page)
url = m.group(0).replace('&amp;', '&')
print('BRACKET', url)
html = fetch(url)
soup = BeautifulSoup(html, 'html.parser')
print('TITLE', soup.title.get_text(strip=True) if soup.title else '')
for a in soup.select('a[href]'):
    h = a['href']
    if re.search(r'tournament|bracket|ssid|season|20\d\d', h, re.I):
        print('LINK', a.get_text(' ', strip=True)[:60], '|', h[:200])
for o in soup.select('option'):
    print('OPTION', o.get('value', '')[:200], '|', o.get_text(strip=True)[:60])
for s in set(re.findall(r'[\w-]*(?:ssid|tournamentid|seasonid|sportseasonid)[\w-]*=?["\':]*\s*["\']?[\w-]{6,40}', html, re.I)):
    print('ID', s[:120])
# one game: the bracket link and the hover card
mu = soup.select_one('li.matchup-container')
card = mu.select_one('[data-hover-card]') if mu else None
link = next((a['href'] for a in mu.select('a[href]') if '/football/game/' in a['href']), None) if mu else None
print('GAME LINK', link)
if card:
    print('CARD', read_card('https://www.maxpreps.com' + card['data-hover-card'].replace('&amp;', '&')))
if link:
    g = fetch(('https://www.maxpreps.com' + link) if link.startswith('/') else link)
    i = g.lower().find('location')
    print('GAME PAGE location context:', re.sub(r'\s+', ' ', re.sub(r'<[^>]+>', ' ', g[max(0, i - 300):i + 600]))[:700])
    for k in ('venue', 'stadium', '"location"'):
        j = g.find(k)
        if j >= 0:
            print('KEY', k, g[j - 100:j + 300].replace('\n', ' '))
# try the same bracket URL for a past season by guessing common query keys
for y in (2025, 2022):
    for q in (f'&year={y}', f'&season={y}-{y + 1 - 2000:02d}' if False else f'&season={y}'):
        try:
            t = BeautifulSoup(fetch(url + q), 'html.parser').title
            print('TRY', q, '->', t.get_text(strip=True)[:80] if t else '')
        except Exception as e:
            print('TRY', q, 'failed', e)
