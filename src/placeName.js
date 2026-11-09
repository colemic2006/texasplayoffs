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

// "11/13/2026 · 7:00 PM" (date and kickoff as known; '' when neither is)
export function gameWhen(game) {
  const d = game.date ? `${game.date.slice(5, 7)}/${game.date.slice(8, 10)}/${game.date.slice(0, 4)}` : ''
  return [d, game.time].filter(Boolean).join(' · ')
}
