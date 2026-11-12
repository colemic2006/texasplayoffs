// Pin colors when several chapters are picked on a map; unassigned games are LSU gold
export const UNASSIGNED = '#FDD023'
export const PALETTE = ['#461D7C', '#00838f', '#2e7d4f', '#c2185b', '#2c4a6e', '#e65100', '#6d4c41', '#558b2f', '#283593', '#00695c']

// picked: chapter codes and/or 'none'; a chapter keeps its color while it stays picked
export function colorFor(picked, c) {
  return c === 'none' ? UNASSIGNED : PALETTE[picked.filter(x => x !== 'none').indexOf(c) % PALETTE.length]
}

// One fixed color per chapter for the bracket tree (white text reads on all of them)
export const CHAPTER_COLORS = {
  ABI: '#c62828', AMA: '#6a1b9a', AUS: '#e65100', BEA: '#00695c', COM: '#5d4037',
  CSC: '#8e1d4f', CTX: '#2e7d32', DAL: '#1565c0', ELP: '#b8860b', ETX: '#546e7a',
  FTW: '#283593', HOU: '#00838f', NTX: '#ad1457', PBC: '#827717', PVC: '#4e342e',
  RGV: '#d84315', SAN: '#1b1b1b', SAT: '#37474f', SFA: '#5e35b1', SPC: '#9e2a2b',
  STX: '#0277bd', TYL: '#33691e', WAC: '#c2185b',
}
export const chapterColor = c => CHAPTER_COLORS[c] || '#461D7C'
