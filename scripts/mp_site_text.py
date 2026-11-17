"""Tidy a site as people type it into MaxPreps ("At Floydada", "Comalander Std", "Game site is
Shelbyville") so the map lookup can read it; '' when it names no place ("TBA")."""
import re

ALIAS = {   # shorthand for stadiums already on the map (season/site_coords.json)
    'tyler-rose stadium': 'Rose Stadium, Tyler', 'abilene shotwell stadium': 'Shotwell Stadium, Abilene',
    'comalander stadium': 'Comalander Stadium, San Antonio', 'acu, wildcat stadium': 'Wildcat Stadium (ACU), Abilene',
    'umhb crusader stadium': 'Crusader Stadium, Belton', 'heroes stadium': 'Heroes Stadium, San Antonio',
    'victoria memorial stadium': 'Memorial Stadium, Victoria', 'jacksonville tomato bowl': 'Tomato Bowl, Jacksonville',
}
NOT_A_PLACE = re.compile(r'^(tba|tbd|bi-district championship|round \d.*|area championship|regional .*)$', re.I)


def tidy(t):
    s = re.sub(r'\s+', ' ', t or '').strip().rstrip('.')
    s = re.sub(r'^(the game site is|game site is|game at|location|bi-district championship\s*@|@|at)\s+', '', s, flags=re.I)
    s = re.sub(r'\s*-\s*\d{1,2}:\d\d\s*[ap]m.*$', '', s, flags=re.I)      # "- 6:00 PM MST"
    s = re.sub(r'\bStd\b\.?', 'Stadium', s)
    s = s.strip(' ,-')
    if not s or NOT_A_PLACE.match(s):
        return ''
    return ALIAS.get(s.lower(), s)
