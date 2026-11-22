import React, { useMemo, useState } from 'react'
import { useHomeChapters, useHomeChapterStatus } from '../homeChapters'
import { chapterColor } from '../chapterColors'

const ROUNDS = { 1: 'Bi-District', 2: 'Area', 3: 'Regionals', 4: 'Quarterfinals', 5: 'Semifinals', 6: 'State Final' }
const pct = (n, of) => of ? Math.round(100 * n / of) : 0

// Per round: games between two schools from the same home chapter, and how many of those
// were worked by that chapter
export default function LocalMatchups({ data }) {
  const home = useHomeChapters(data?.games?.[0]?.year)
  const status = useHomeChapterStatus()
  const [open, setOpen] = useState(null)
  const [show, setShow] = useState('all')   // all | kept | away
  const [ch, setCh] = useState('')          // a chapter, as home chapter or the one that worked it
  const rounds = useMemo(() => {
    const byWeek = {}
    for (const g of data?.games || []) {
      if (!g.chapter) continue
      const w = byWeek[g.week] || (byWeek[g.week] = { assigned: 0, local: [], kept: [] })
      w.assigned++
      const h1 = home[g.team1], h2 = home[g.team2]
      if (h1 && h1 === h2) {
        w.local.push({ ...g, home: h1 })
        if (g.chapter === h1) w.kept.push(g)
      }
    }
    return Object.entries(byWeek).map(([w, r]) => ({ week: +w, ...r })).sort((a, b) => a.week - b.week)
  }, [data, home])
  if (!rounds.some(r => r.local.length)) return null

  const th = { fontFamily:'var(--mono)', fontSize:9, letterSpacing:'0.12em', textTransform:'uppercase', color:'var(--mid)', padding:'8px 10px', textAlign:'right', borderBottom:'1px solid var(--border)' }
  const td = { padding:'9px 10px', borderBottom:'1px solid var(--border)', fontSize:13, textAlign:'right', fontFamily:'var(--mono)' }
  return (
    <div style={{ marginBottom:48 }}>
      <div style={{ fontFamily:'var(--mono)', fontSize:10, letterSpacing:'0.18em', textTransform:'uppercase', color:'var(--mid)', marginBottom:6 }}>Playoff Selections</div>
      <div style={{ fontFamily:"'Bebas Neue', sans-serif", fontSize:30, color:'var(--ink)', marginBottom:6, paddingBottom:12, borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', gap:12 }}>
        <div style={{ width:4, height:28, borderRadius:2, background:'var(--burnt)' }} />
        Local Matchup, Local Chapter
      </div>
      <div style={{ fontSize:13, color:'var(--mid)', lineHeight:1.55, margin:'10px 0 14px', maxWidth:800 }}>
        Games where both schools are served by the same chapter during the regular season, and how often they picked that chapter to work their playoff game.
      </div>
      <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:10, overflowX:'auto' }}>
        <table style={{ width:'100%', borderCollapse:'collapse' }}>
          <thead><tr>
            <th style={{ ...th, textAlign:'left' }}>Round</th>
            <th style={th}>Same-chapter matchups</th>
            <th style={{ ...th, color:'var(--burnt)' }}>Picked their home chapter</th>
            <th style={{ ...th, width:'28%' }}></th>
          </tr></thead>
          <tbody>
            {rounds.map(r => {
              const p = pct(r.kept.length, r.local.length)
              return (
                <React.Fragment key={r.week}>
                  <tr onClick={() => setOpen(open === r.week ? null : r.week)} style={{ cursor: r.local.length ? 'pointer' : 'default' }}>
                    <td style={{ ...td, textAlign:'left', fontFamily:'DM Sans' }}>
                      <strong>{ROUNDS[r.week]}</strong> <span style={{ color:'var(--mid)', fontSize:11 }}>· Week {r.week}</span>
                      {r.local.length > 0 && <span style={{ color:'var(--burnt)', fontSize:11, marginLeft:6 }}>{open === r.week ? '▾' : '▸'} games</span>}
                    </td>
                    <td style={td}>{r.local.length} <span style={{ color:'var(--mid)', fontSize:11 }}>({pct(r.local.length, r.assigned)}%)</span></td>
                    <td style={{ ...td, color:'var(--burnt)', fontWeight:700 }}>{r.local.length ? `${r.kept.length} of ${r.local.length} · ${p}%` : '—'}</td>
                    <td style={{ ...td, paddingLeft:4 }}>
                      {r.local.length > 0 && (
                        <div style={{ display:'flex', height:10, borderRadius:5, overflow:'hidden', background:'var(--gold)' }} title={`${r.kept.length} kept their home chapter, ${r.local.length - r.kept.length} went elsewhere`}>
                          <div style={{ width:`${p}%`, background:'var(--burnt)' }} />
                        </div>
                      )}
                    </td>
                  </tr>
                  {open === r.week && (
                    <tr><td colSpan={4} style={{ padding:'4px 10px 12px 18px', borderBottom:'1px solid var(--border)', background:'rgba(70,29,124,0.03)' }}>
                      {(() => {
                        const chs = [...new Set(r.local.flatMap(g => [g.home, g.chapter]))].sort()
                        const list = r.local.filter(g => (show === 'all' || (show === 'kept') === (g.chapter === g.home))
                          && (!ch || g.home === ch || g.chapter === ch))
                        const chip = on => ({ fontFamily:'var(--mono)', fontSize:10, padding:'3px 8px', borderRadius:3, cursor:'pointer',
                          border:`1px solid ${on ? 'var(--burnt)' : 'var(--border)'}`, background: on ? 'var(--burnt)' : 'transparent', color: on ? '#fff' : 'var(--mid)' })
                        const n = k => r.local.filter(g => (!ch || g.home === ch || g.chapter === ch) && (k === 'all' || (k === 'kept') === (g.chapter === g.home))).length
                        return <>
                          <div style={{ display:'flex', gap:6, alignItems:'center', flexWrap:'wrap', padding:'8px 0' }}>
                            {[['all', 'All'], ['kept', '✓ Home chapter worked it'], ['away', '✕ Went elsewhere']].map(([k, l]) => (
                              <button key={k} onClick={() => setShow(k)} style={chip(show === k)}>{l} ({n(k)})</button>
                            ))}
                            <select value={chs.includes(ch) ? ch : ''} onChange={e => setCh(e.target.value)}
                              style={{ fontFamily:'var(--mono)', fontSize:10, padding:'3px 6px', borderRadius:3, border:'1px solid var(--border)', background:'var(--surface)', color:'var(--ink)', marginLeft:4 }}>
                              <option value="">All chapters</option>
                              {chs.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                          </div>
                          {list.length === 0 && <div style={{ fontSize:12, color:'var(--mid)', padding:'4px 0' }}>No games match.</div>}
                          {list.map((g, i) => (
                        <div key={i} style={{ display:'flex', gap:10, alignItems:'center', fontSize:12, borderBottom:'1px dashed var(--border)',
                          ...(g.chapter !== g.home
                            ? { padding:'6px 8px', margin:'2px 0', background:'rgba(253,208,35,0.28)', borderLeft:'4px solid var(--gold)', borderRadius:4 }
                            : { padding:'4px 0' }) }}
                          title={g.chapter !== g.home ? `Both schools are ${g.home} schools, but ${g.chapter} worked the game` : undefined}>
                          <span style={{ flex:1, minWidth:0, fontWeight: g.chapter !== g.home ? 700 : 400 }}>{g.team1} v {g.team2} <span style={{ color:'var(--mid)', fontWeight:400 }}>· {g.classification}</span>
                            {g.chapter !== g.home && <span style={{ fontFamily:'var(--mono)', fontSize:9, letterSpacing:'0.1em', textTransform:'uppercase', color:'var(--burnt)', marginLeft:8, fontWeight:700 }}>{g.uil_pick ? 'UIL assigned an outside chapter' : 'Coaches picked an outside chapter'}</span>}</span>
                          <span style={{ fontFamily:'var(--mono)', fontSize:10, padding:'2px 6px', borderRadius:3, background:chapterColor(g.home), color:'#fff' }} title="Both schools' home chapter">both schools: {g.home}</span>
                          <span style={{ fontFamily:'var(--mono)', fontSize:10, padding:'2px 6px', borderRadius:3, background:chapterColor(g.chapter), color:'#fff' }}>worked by: {g.chapter}</span>
                          <span style={{ fontFamily:'var(--mono)', fontSize:10, width:16, textAlign:'center', color: g.chapter === g.home ? 'var(--sage)' : 'var(--burnt)', fontWeight:700 }}>{g.chapter === g.home ? '✓' : '✕'}</span>
                        </div>
                          ))}
                        </>
                      })()}
                    </td></tr>
                  )}
                </React.Fragment>
              )
            })}
          </tbody>
        </table>
      </div>
      <div style={{ fontFamily:'var(--mono)', fontSize:10, color:'var(--mid)', marginTop:8, lineHeight:1.6 }}>
        Counts only games that have a chapter assigned and where both schools' home chapters are on file.
        {status.missing.length > 0 && <> Still waiting on school lists from: {status.missing.join(', ')}, so their schools' games aren't counted yet.</>}
      </div>
    </div>
  )
}
