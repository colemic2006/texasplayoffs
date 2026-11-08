// Pin colors when several chapters are picked on a map; unassigned games keep slate blue
export const UNASSIGNED = '#2c4a6e'
export const PALETTE = ['#c1440e', '#d4920a', '#2e7d4f', '#7b3fa0', '#c2185b', '#00838f', '#6d4c41', '#558b2f', '#e65100', '#283593']

// picked: chapter codes and/or 'none'; a chapter keeps its color while it stays picked
export function colorFor(picked, c) {
  return c === 'none' ? UNASSIGNED : PALETTE[picked.filter(x => x !== 'none').indexOf(c) % PALETTE.length]
}
