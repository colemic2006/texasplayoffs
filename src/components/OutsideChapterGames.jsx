import React, { useMemo } from 'react'
import { useHomeChapters, useHomeChapterStatus } from '../homeChapters'
import { roundTripMiles } from '../chapterCenters'
import { chapterColor } from '../chapterColors'
import { placeName } from '../placeName'

const ROUNDS = { 1: 'Bi-District', 2: 'Area', 3: 'Regionals', 4: 'Quarterfinals', 5: 'Semifinals', 6: 'State Final' }
const fmt = n => Math.round(n).toLocaleString()

// Games where both schools share a home chapter but a different chapter worked the game
export default function OutsideChapterGames({ data }) {
  const home = useHomeChapters()
  const status = useHomeChapterStatus()
  const names = { ELP: 'El Paso', BEA: 'Beaumont', COM: 'Commerce', PVC: 'Pecan Valley', STX: 'South Texas', RGV: 'Rio Grande Valley', DAL: 'Dallas', FTW: 'Fort Worth', WAC: 'Waco', CSC: 'College Station', ...Object.fromEntries((data?.chapters || []).map(c => [c.code, c.name])) }
  const name = c => names[c] || c
  const { rows, shared, listed } = useMemo(() => {
    const games = data?.games || []
    const sharedGames = games.filter(g => g.chapter && home[g.team1] && home[g.team1] === home[g.team2])
    const rows = sharedGames.filter(g => g.chapter !== home[g.team1]).map(g => {
      const worked = roundTripMiles(g), local = roundTripMiles({ ...g, chapter: home[g.team1] })
      return { ...g, home: home[g.team1], worked, extra: worked != null && local != null ? worked - local : null }
    }).sort((a, b) => a.week - b.week || (b.extra ?? 0) - (a.extra ?? 0))
    return { rows, shared: sharedGames.length, listed: [...new Set(Object.values(home))].sort() }
  }, [data, home])
  if (!listed.length || !shared) return null

  const chip = c => (
    <span style={{ display:'inline-flex', alignItems:'center', gap:5, fontFamily:'var(--mono)', fontSize:10, padding:'2px 7px', borderRadius:3,
                   background:chapterColor(c), color:'#fff', whiteSpace:'nowrap' }}>{name(c)}</span>
  )
  const th = { fontFamily:'var(--mono)', fontSize:9, letterSpacing:'0.12em', textTransform:'uppercase', color:'var(--mid)', padding:'8px 10px', textAlign:'left', borderBottom:'1px solid var(--border)', whiteSpace:'nowrap' }
  const td = { padding:'8px 10px', borderBottom:'1px solid var(--border)', fontSize:12, verticalAlign:'top' }
  const totalExtra = rows.reduce((s, r) => s + (r.extra || 0), 0)

  return (
    <div style={{ marginBottom:48 }}>
      <div style={{ fontFamily:'var(--mono)', fontSize:10, letterSpacing:'0.18em', textTransform:'uppercase', color:'var(--mid)', marginBottom:6 }}>Playoff Selections</div>
      <div style={{ fontFamily:"'Bebas Neue', sans-serif", fontSize:30, color:'var(--ink)', marginBottom:6, paddingBottom:12, borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', gap:12 }}>
        <div style={{ width:4, height:28, borderRadius:2, background:'var(--burnt)' }} />
        Home Chapter Passed Over
      </div>
      <div style={{ fontSize:13, color:'var(--mid)', lineHeight:1.55, margin:'10px 0 14px', maxWidth:780 }}>
        Games where both schools are normally served by the same chapter, but the teams picked officials from another chapter.
        {' '}<strong style={{ color:'var(--ink)' }}>{rows.length} of {shared}</strong> such matchups went to an outside chapter
        {totalExtra > 0 && <>, adding about <strong style={{ color:'var(--ink)' }}>{fmt(totalExtra)} round-trip miles</strong> over using the home chapter</>}.
      </div>
      {rows.length === 0 ? (
        <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:10, padding:'18px 20px', fontSize:13, color:'var(--mid)' }}>
          Every game between two schools from the same chapter is being worked by that chapter.
        </div>
      ) : (
        <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:10, overflowX:'auto' }}>
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead><tr>
              <th style={th}>Round</th><th style={th}>Game</th><th style={th}>Both schools' chapter</th><th style={th}>Worked by</th>
              <th style={{ ...th, textAlign:'right' }}>Round trip</th><th style={{ ...th, textAlign:'right' }}>Extra miles</th>
            </tr></thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i}>
                  <td style={{ ...td, fontFamily:'var(--mono)', fontSize:10, color:'var(--mid)', whiteSpace:'nowrap' }}>{ROUNDS[r.week]}</td>
                  <td style={td}>
                    <div style={{ fontWeight:600 }}>{r.team1} v {r.team2}</div>
                    <div style={{ fontSize:11, color:'var(--mid)' }}>{r.classification}{r.site ? ` · ${placeName(r)}` : ''}</div>
                  </td>
                  <td style={td}>{chip(r.home)}</td>
                  <td style={td}>{chip(r.chapter)}</td>
                  <td style={{ ...td, textAlign:'right', fontFamily:'var(--mono)' }}>{r.worked != null ? `${fmt(r.worked)} mi` : '—'}</td>
                  <td style={{ ...td, textAlign:'right', fontFamily:'var(--mono)', color: r.extra > 0 ? 'var(--burnt)' : 'var(--mid)', fontWeight: r.extra > 0 ? 600 : 400 }}>
                    {r.extra != null ? `${r.extra > 0 ? '+' : ''}${fmt(r.extra)} mi` : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div style={{ fontFamily:'var(--mono)', fontSize:10, color:'var(--mid)', marginTop:8, lineHeight:1.6 }}>
        {status.missing.length > 0 && <>Still waiting on school lists from: {status.missing.map(name).join(', ')}.{' '}</>}
        {status.partial.length > 0 && <>Partial list so far: {status.partial.map(name).join(', ')}.{' '}</>}
        Games involving those chapters' schools may be missing from this list until their lists come in.
        Extra miles compare the estimated round trip from the chapter that worked the game with one from the schools' home chapter.
      </div>
    </div>
  )
}
