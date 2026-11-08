// "Clyde Bulldog Stadium, Clyde, TX": a game site with its town (game.city from scripts/game_sites.py)
export function placeName(game, stadium) {
  const name = game.stadium || stadium?.name || game.site || ''
  const city = game.city || stadium?.city || ''
  if (!name) return ''
  const hasState = /\b(TX|Texas)\b/.test(name)
  // the site text already ends with the town ("Farris Stadium, San Antonio", "San Angelo")
  const endsWithCity = city && new RegExp(`(^|[,(]\\s*|\\bin\\s+)${city.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\)?$`, 'i').test(name.trim())
  if (!city || hasState || endsWithCity) return hasState ? name : `${name}${city ? ', TX' : ''}`
  return `${name}, ${city}, TX`
}
