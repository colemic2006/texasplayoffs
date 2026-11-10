import { useEffect, useMemo, useState } from 'react'
import { canonicalize } from './components/TeamsView'

let cached = null
// State finals each team played: from the season files' championship round where we have
// them (2010 on), else the championship list (winner listed first, or the higher score).
// { 'Albany': [{ year, cls, won, opp }, ...] }, newest first
export function useFinals(allData, years) {
  const [champGames, setChampGames] = useState(cached || {})
  useEffect(() => {
    if (cached) return
    fetch(`${import.meta.env.BASE_URL}data/championship_games.json?v=${__BUILD_TIME__}`)
      .then(r => r.ok ? r.json() : null).then(d => { if (d) { cached = d; setChampGames(d) } }).catch(() => {})
  }, [])
  return useMemo(() => {
    const out = {}
    const add = (year, cls, win, lose) => {
      if (!win || !lose) return
      for (const [t, won] of [[win, true], [lose, false]]) {
        const k = canonicalize(t)
        ;(out[k] = out[k] || []).push({ year: Number(year), cls, won, opp: canonicalize(won ? lose : win) })
      }
    }
    const fromSeasons = new Set()
    for (const y of years) {
      const fin = (allData[y]?.games || []).filter(g => g.week === 6 && (g.round === 'State Final' || g.round === 'Championship') && g.winner)
      if (!fin.length) continue
      fromSeasons.add(String(y))
      for (const g of fin) add(y, g.classification, g.winner, g.winner === g.team1 ? g.team2 : g.team1)
    }
    for (const byYear of Object.values(champGames)) {
      for (const [y, games] of Object.entries(byYear)) {
        if (fromSeasons.has(y)) continue
        for (const g of games) {
          const firstWon = g.score1 == null || g.score2 == null || g.score1 >= g.score2
          add(y, g.classification === '6M' ? 'Six-Man' : g.classification, firstWon ? g.team1 : g.team2, firstWon ? g.team2 : g.team1)
        }
      }
    }
    for (const k in out) out[k].sort((a, b) => b.year - a.year)
    return out
  }, [champGames, allData, years])
}
