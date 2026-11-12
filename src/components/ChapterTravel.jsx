import React, { useMemo, useState } from 'react'
import { CHAPTER_CENTERS, ROAD_FACTOR, roundTripMiles } from '../chapterCenters'
import { chapterColor } from '../chapterColors'
import { placeName } from '../placeName'

const ROUNDS = { 1: 'Bi-District', 2: 'Area', 3: 'Regionals', 4: 'Quarterfinals', 5: 'Semifinals', 6: 'State Final' }
const fmt = n => Math.round(n).toLocaleString()

export default function ChapterTravel({ data }) {
  const [open, setOpen] = useState(null)
  const { rows, weeks, totals } = useMemo(() => {
    const by = {}
    const weeks = new Set()
    for (const g of data?.games || []) {
      const m = roundTripMiles(g)
      if (m == null) continue
      weeks.add(g.week)
      const r = by[g.chapter] || (by[g.chapter] = { code: g.chapter, weeks: {}, total: 0, games: [] })
      r.weeks[g.week] = (r.weeks[g.week] || 0) + m
      r.total += m
      r.games.push({ ...g, miles: m })
    }
    const rows = Object.values(by).sort((a, b) => b.total - a.total)
    rows.forEach(r => r.games.sort((a, b) => a.week - b.week || b.miles - a.miles))
    const ws = [...weeks].sort((a, b) => a - b)
    const totals = { weeks: Object.fromEntries(ws.map(w => [w, rows.reduce((s, r) => s + (r.weeks[w] || 0), 0)])), all: rows.reduce((s, r) => s + r.total, 0) }
    return { rows, weeks: ws, totals }
  }, [data])
  if (!rows.length) return null
  const max = rows[0].total

  const th = { fontFamily:'var(--mono)', fontSize:9, letterSpacing:'0.12em', textTransform:'uppercase', color:'var(--mid)', padding:'8px 10px', textAlign:'right', borderBottom:'1px solid var(--border)', whiteSpace:'nowrap' }
  const td = { padding:'7px 10px', borderBottom:'1px solid var(--border)', fontSize:12, textAlign:'right', fontFamily:'var(--mono)', whiteSpace:'nowrap' }

  return (
    <div style={{ marginBottom:48 }}>
      <div style={{ fontFamily:'var(--mono)', fontSize:10, letterSpacing:'0.18em', textTransform:'uppercase', color:'var(--mid)', marginBottom:6 }}>Crew Travel</div>
      <div style={{ fontFamily:"'Bebas Neue', sans-serif", fontSize:30, color:'var(--ink)', marginBottom:6, paddingBottom:12, borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', gap:12 }}>
        <div style={{ width:4, height:28, borderRadius:2, background:'var(--burnt)' }} />
        Round-Trip Miles by Chapter
      </div>
      <div style={{ fontSize:13, color:'var(--mid)', lineHeight:1.55, margin:'10px 0 14px', maxWidth:760 }}>
        Estimated driving miles from each chapter's center city to every game site it works, and back, one trip per game.
        All chapters together: <strong style={{ color:'var(--ink)' }}>{fmt(totals.all)} miles</strong>. Click a chapter to see its games.
      </div>
      <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:10, overflowX:'auto' }}>
        <table style={{ width:'100%', borderCollapse:'collapse' }}>
          <thead>
            <tr>
              <th style={{ ...th, textAlign:'left' }}>Chapter</th>
              {weeks.map(w => <th key={w} style={th}>Wk {w}<div style={{ fontSize:8, letterSpacing:'0.06em', opacity:0.7 }}>{ROUNDS[w]}</div></th>)}
              <th style={th}>Games</th>
              <th style={th}>Per game</th>
              <th style={{ ...th, color:'var(--burnt)' }}>Season total</th>
              <th style={{ ...th, width:'22%' }}></th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <React.Fragment key={r.code}>
                <tr onClick={() => setOpen(open === r.code ? null : r.code)} style={{ cursor:'pointer', background: open === r.code ? 'rgba(70,29,124,0.06)' : 'transparent' }}>
                  <td style={{ ...td, textAlign:'left', fontFamily:'DM Sans' }}>
                    <span style={{ display:'inline-block', width:8, height:8, borderRadius:2, background:chapterColor(r.code), marginRight:6 }} />
                    <strong style={{ fontFamily:'var(--mono)', fontSize:11 }}>{r.code}</strong>
                    <span style={{ color:'var(--mid)', fontSize:11, marginLeft:6 }}>from {CHAPTER_CENTERS[r.code]?.[0]}</span>
                  </td>
                  {weeks.map(w => <td key={w} style={td}>{r.weeks[w] ? fmt(r.weeks[w]) : '—'}</td>)}
                  <td style={td}>{r.games.length}</td>
                  <td style={td}>{fmt(r.total / r.games.length)}</td>
                  <td style={{ ...td, color:'var(--burnt)', fontWeight:600 }}>{fmt(r.total)}</td>
                  <td style={{ ...td, paddingLeft:4 }}>
                    <div style={{ height:8, borderRadius:4, background:chapterColor(r.code), width:`${Math.max(2, 100 * r.total / max)}%` }} />
                  </td>
                </tr>
                {open === r.code && (
                  <tr><td colSpan={weeks.length + 5} style={{ padding:'4px 10px 12px 26px', borderBottom:'1px solid var(--border)', background:'rgba(70,29,124,0.03)' }}>
                    {r.games.map((g, i) => (
                      <div key={i} style={{ display:'flex', gap:10, fontSize:12, padding:'4px 0', borderBottom:'1px dashed var(--border)' }}>
                        <span style={{ fontFamily:'var(--mono)', fontSize:10, color:'var(--mid)', width:42 }}>Wk {g.week}</span>
                        <span style={{ flex:1, minWidth:0 }}>{g.team1} v {g.team2}<span style={{ color:'var(--mid)' }}> · {g.classification} · {placeName(g)}</span></span>
                        <span style={{ fontFamily:'var(--mono)', fontWeight: g.miles > 600 ? 700 : 400, color: g.miles > 600 ? 'var(--burnt)' : 'var(--ink)' }}>{fmt(g.miles)} mi</span>
                      </div>
                    ))}
                  </td></tr>
                )}
              </React.Fragment>
            ))}
            <tr>
              <td style={{ ...td, textAlign:'left', fontFamily:'var(--mono)', fontSize:10, letterSpacing:'0.1em', textTransform:'uppercase', color:'var(--mid)' }}>All chapters</td>
              {weeks.map(w => <td key={w} style={{ ...td, fontWeight:600 }}>{fmt(totals.weeks[w])}</td>)}
              <td style={td}>{rows.reduce((s, r) => s + r.games.length, 0)}</td>
              <td style={td}>{fmt(totals.all / rows.reduce((s, r) => s + r.games.length, 0))}</td>
              <td style={{ ...td, color:'var(--burnt)', fontWeight:700 }}>{fmt(totals.all)}</td>
              <td style={td}></td>
            </tr>
          </tbody>
        </table>
      </div>
      <div style={{ fontFamily:'var(--mono)', fontSize:10, color:'var(--mid)', marginTop:8, lineHeight:1.6 }}>
        Estimates: straight-line distance from the chapter's center city to the game site, times {ROAD_FACTOR} for roads, doubled for the return trip.
        Counted once per game (one crew), not per official or per vehicle. Games without a site yet aren't counted.
      </div>
    </div>
  )
}
