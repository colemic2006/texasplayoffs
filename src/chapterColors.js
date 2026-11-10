// Pin colors when several chapters are picked on a map; unassigned games are LSU gold
export const UNASSIGNED = '#FDD023'
export const PALETTE = ['#461D7C', '#00838f', '#2e7d4f', '#c2185b', '#2c4a6e', '#e65100', '#6d4c41', '#558b2f', '#283593', '#00695c']

// picked: chapter codes and/or 'none'; a chapter keeps its color while it stays picked
export function colorFor(picked, c) {
  return c === 'none' ? UNASSIGNED : PALETTE[picked.filter(x => x !== 'none').indexOf(c) % PALETTE.length]
}
