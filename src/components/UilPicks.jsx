import React, { useMemo } from 'react'
import { chapterColor } from '../chapterColors'
import { useHomeChapters } from '../homeChapters'
import { UilTag } from '../uilPick'
import { CHAPTER_CENTERS, roundTripMiles } from '../chapterCenters'

const ROUNDS = { 1: 'Bi-District', 2: 'Area', 3: 'Regionals', 4: 'Quarterfinals', 5: 'Semifinals', 6: 'State Final' }

// Games where UIL, not the two schools, picked the officiating chapter (workbook "UIL pick" column)
export default function UilPicks({ data }) {
  const home = useHomeChapters(data?.games?.[0]?.year)
  const rounds = useMemo(() => {
    const by = {}
    for (const g of data?.games || []) if (g.uil_pick) (by[g.week] = by[g.week] || []).push(g)
    return Object.entries(by).map(([w, gs]) => ({ week: +w, games: gs.sort((a, b) => a.classification.localeCompare(b.classification)) }))
      .sort((a, b) => a.week - b.week)
  }, [data])
  const total = rounds.reduce((n, r) => n + r.games.length, 0)
  if (!total) return null

  const chip = c => ({ fontFamily:'var(--mono)', fontSize:10, padding:'2px 6px', borderRadius:3, background:chapterColor(c), color:'#fff', whiteSpace:'nowrap' })
  return (
    <div style={{ marginBottom:48 }}>
      <div style={{ fontFamily:'var(--mono)', fontSize:10, letterSpacing:'0.18em', textTransform:'uppercase', color:'var(--mid)', marginBottom:6 }}>Playoff Selections</div>
      <div style={{ fontFamily:"'Bebas Neue', sans-serif", fontSize:30, color:'var(--ink)', marginBottom:6, paddingBottom:12, borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', gap:12 }}>
        <div style={{ width:4, height:28, borderRadius:2, background:'var(--burnt)' }} />
        UIL-Assigned Games
      </div>
      <div style={{ fontSize:13, color:'var(--mid)', lineHeight:1.55, margin:'10px 0 14px', maxWidth:800 }}>
        Normally the two schools' coaches choose the chapter for a playoff game. In these {total} games, UIL assigned the officials instead.
      </div>
      <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:10, padding:'6px 16px 10px' }}>
        {rounds.map(r => (
          <div key={r.week}>
            <div style={{ fontFamily:'var(--mono)', fontSize:9, letterSpacing:'0.12em', textTransform:'uppercase', color:'var(--mid)', padding:'10px 0 4px' }}>
              {ROUNDS[r.week] || `Week ${r.week}`} · {r.games.length} game{r.games.length === 1 ? '' : 's'}
            </div>
            {r.games.map((g, i) => {
              const hs = [...new Set([home[g.team1], home[g.team2]].filter(Boolean))]
              const played = g.score1 != null && g.score2 != null
              const name = <>{g.team1}{played && <span style={{ color:'var(--mid)' }}> {g.score1}</span>} v {g.team2}{played && <span style={{ color:'var(--mid)' }}> {g.score2}</span>}</>
              return (
                <div key={i} style={{ display:'flex', gap:10, alignItems:'center', flexWrap:'wrap', fontSize:13, padding:'6px 0', borderBottom:'1px dashed var(--border)' }}>
                  <span style={{ flex:1, minWidth:200 }}>
                    {g.mp_url ? <a href={g.mp_url} target="_blank" rel="noreferrer" style={{ color:'var(--ink)', textDecoration:'none' }}>{name}</a> : name}
                    <span style={{ color:'var(--mid)', fontSize:11 }}> · {g.classification}</span>
                  </span>
                  {hs.length > 0 && <span style={{ fontFamily:'var(--mono)', fontSize:10, color:'var(--mid)' }} title="The schools' home chapters">home: {hs.join(' / ')}</span>}
                  {g.chapter && <span style={chip(g.chapter)}>worked by: {g.chapter}</span>}
                  {(m => <span style={{ fontFamily:'var(--mono)', fontSize:11, color:'var(--ink)', minWidth:112, textAlign:'right' }}
                    title={m == null ? 'Game site not mapped yet' : `About ${Math.round(m / 2)} miles each way from ${CHAPTER_CENTERS[g.chapter]?.[0] || g.chapter} to ${g.site || 'the game site'}`}>
                    {m == null ? '—' : `~${Math.round(m).toLocaleString()} mi round trip`}</span>)(roundTripMiles(g))}
                  <UilTag game={g} />
                </div>
              )
            })}
          </div>
        ))}
      </div>
      <div style={{ fontFamily:'var(--mono)', fontSize:10, color:'var(--mid)', marginTop:8, lineHeight:1.6 }}>
        Only games known to be UIL assignments are listed; others may not have been reported yet.
        Miles are estimated driving miles, round trip, from the chapter's main city to the game site (straight-line distance × 1.2).
      </div>
    </div>
  )
}
