// A game's round name. Six-man (1A, since 2014; "Six Man" before) has fewer teams and starts at the
// Area round, played the same week as 11-man bi-district, so its weeks are named one round later.
const ELEVEN = { 1: 'Bi-District', 2: 'Area', 3: 'Regionals', 4: 'Quarterfinals', 5: 'Semifinals', 6: 'State Final' }
const SIX = { 1: 'Area', 2: 'Regionals', 3: 'Quarterfinals', 4: 'Semifinals', 5: 'Semifinals', 6: 'State Final' }

export function isSixMan(g) {
  const c = g?.classification || ''
  return /six/i.test(c) || (c.startsWith('1A') && (g.year == null || g.year >= 2014))
}

export function roundName(g) {
  return (isSixMan(g) ? SIX : ELEVEN)[g.week] || `Week ${g.week}`
}
