import React, { useEffect, useMemo, useState } from 'react'
import { useHomeChapters, useHomeChapterStatus } from '../homeChapters'
import { chapterColor } from '../chapterColors'
import { roundName } from '../roundName'

const ROUNDS = { 1: 'Bi-District', 2: 'Area', 3: 'Regionals', 4: 'Quarterfinals', 5: 'Semifinals', 6: 'State Final' }
const pct = (n, of) => of ? Math.round(100 * n / of) : 0

// Per round: games between two schools from the same home chapter, and how many of those
// were worked by that chapter
export default function LocalMatchups({ data, allData = {}, years = [], loadAllYears }) {
  const home = useHomeChapters(data?.games?.[0]?.year)
  const current = useHomeChapters()
  const [past, setPast] = useState({})
  useEffect(() => {
    loadAllYears?.()
    fetch(`${import.meta.env.BASE_URL}data/home_chapters_past.json?v=${__BUILD_TIME__}`).then(r => r.ok ? r.json() : {}).then(setPast).catch(() => {})
  }, [])
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
  // every season on file: same-chapter matchups and how many kept the home chapter (home chapters as they were then)
  const trend = useMemo(() => {
    const CODE = { WACO: 'WAC', ETX: 'TYL' }   // East Texas folded into Tyler
    return years.filter(y => allData[y]?.games?.length).sort((a, b) => b - a).map(y => {
      const homeOf = t => { const then = (past[t] || []).find(e => y <= e.through); return then ? then.chapter : current[t] }
      let local = 0, kept = 0
      for (const g of allData[y].games) {
        if (!g.chapter) continue
        const h1 = homeOf(g.team1), h2 = homeOf(g.team2)
        if (h1 && h1 === h2) { local++; if ((CODE[g.chapter] || g.chapter) === h1) kept++ }
      }
      return { y, local, kept, away: local - kept }
    }).filter(t => t.local)
  }, [allData, years, past, current])
  if (!rounds.some(r => r.local.length)) return null
  const elsewhere = rounds.flatMap(r => r.local.filter(g => g.chapter !== g.home)).sort((a, b) => a.week - b.week || a.classification.localeCompare(b.classification))
  const season = data?.games?.[0]?.year

  const th = { fontFamily:'var(--mono)', fontSize:9, letterSpacing:'0.12em', textTransform:'uppercase', color:'var(--mid)', padding:'8px 10px', textAlign:'right', borderBottom:'1px solid var(--border)' }
  const td = { padding:'9px 10px', borderBottom:'1px solid var(--border)', fontSize:13, textAlign:'right', fontFamily:'var(--mono)' }
  return (
    <div style={{ marginBottom:48 }}>
      <div style={{ fontFamily:'var(--mono)', fontSize:10, letterSpacing:'0.18em', textTransform:'uppercase', color:'var(--mid)', marginBottom:6 }}>Playoff Selections</div>
      <div className="card-title" style={{ fontFamily:"'Bebas Neue', sans-serif", fontSize:30, color:'var(--ink)', marginBottom:6, paddingBottom:12, borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', gap:12 }}>
        <div style={{ width:4, height:28, borderRadius:2, background:'var(--burnt)' }} />
        Local Matchup, Local Chapter
      </div>
      <div style={{ fontSize:13, color:'var(--mid)', lineHeight:1.55, margin:'10px 0 14px', maxWidth:800 }}>
        Games where both schools are served by the same chapter during the regular season, and how often they picked that chapter to work their playoff game.
      </div>
      {elsewhere.length > 0 && (
        <div style={{ background:'rgba(253,208,35,0.22)', border:'2px solid var(--gold)', borderRadius:10, padding:'12px 16px', marginBottom:14 }}>
          <div style={{ fontFamily:'var(--mono)', fontSize:10, letterSpacing:'0.14em', textTransform:'uppercase', color:'var(--burnt)', fontWeight:700, marginBottom:8 }}>
            {season} · {elsewhere.length} local matchup{elsewhere.length === 1 ? '' : 's'} that went to an outside chapter
          </div>
          {elsewhere.map((g, i) => (
            <div key={i} style={{ display:'flex', gap:10, alignItems:'center', flexWrap:'wrap', fontSize:13, padding:'6px 0', borderTop: i ? '1px dashed rgba(70,29,124,0.2)' : 'none' }}>
              <span style={{ fontFamily:'var(--mono)', fontSize:10, color:'var(--mid)', width:150, whiteSpace:'nowrap' }}>{roundName(g)} · {g.classification}</span>
              <strong style={{ flex:1, minWidth:180 }}>{g.team1} v {g.team2}</strong>
              <span style={{ fontFamily:'var(--mono)', fontSize:10, padding:'2px 6px', borderRadius:3, background:chapterColor(g.home), color:'#fff' }}>both schools: {g.home}</span>
              <span style={{ fontFamily:'var(--mono)', fontSize:11, color:'var(--burnt)' }}>→</span>
              <span style={{ fontFamily:'var(--mono)', fontSize:10, padding:'2px 6px', borderRadius:3, background:chapterColor(g.chapter), color:'#fff' }}>worked by: {g.chapter}</span>
              <span style={{ fontFamily:'var(--mono)', fontSize:9, letterSpacing:'0.08em', textTransform:'uppercase', color:'var(--burnt)', fontWeight:700 }}>
                {g.uil_pick ? 'UIL assigned' : 'Coaches picked'}</span>
            </div>
          ))}
        </div>
      )}
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
                          .sort((a, b) => (a.chapter === a.home) - (b.chapter === b.home))   // outside picks first
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
      {trend.length > 1 && (
        <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:10, overflowX:'auto', marginTop:14 }}>
          <div style={{ fontFamily:'var(--mono)', fontSize:9, letterSpacing:'0.12em', textTransform:'uppercase', color:'var(--mid)', padding:'12px 10px 4px' }}>Every season on file</div>
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead><tr>
              <th style={{ ...th, textAlign:'left' }}>Season</th>
              <th style={th}>Same-chapter matchups</th>
              <th style={th}>Kept home chapter</th>
              <th style={{ ...th, color:'var(--burnt)' }}>Went elsewhere</th>
              <th style={{ ...th, width:'30%' }}>Share kept</th>
            </tr></thead>
            <tbody>
              {trend.map(t => {
                const p = pct(t.kept, t.local)
                return (
                  <tr key={t.y} style={{ background: t.y === season ? 'rgba(70,29,124,0.05)' : 'transparent' }}>
                    <td style={{ ...td, textAlign:'left', fontFamily:'DM Sans', fontWeight: t.y === season ? 700 : 400 }}>{t.y}{t.y === season && <span style={{ fontSize:10, color:'var(--mid)' }}> (in progress)</span>}</td>
                    <td style={td}>{t.local}</td>
                    <td style={td}>{t.kept}</td>
                    <td style={{ ...td, color:'var(--burnt)', fontWeight:700 }}>{t.away}</td>
                    <td style={{ ...td, paddingLeft:4 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                        <div style={{ flex:1, display:'flex', height:10, borderRadius:5, overflow:'hidden', background:'var(--gold)' }}><div style={{ width:`${p}%`, background:'var(--burnt)' }} /></div>
                        <span style={{ fontWeight:700, width:36 }}>{p}%</span>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
      <div style={{ fontFamily:'var(--mono)', fontSize:10, color:'var(--mid)', marginTop:8, lineHeight:1.6 }}>
        Counts only games that have a chapter assigned and where both schools' home chapters are on file. Past seasons use the home chapters schools had then; East Texas games count as Tyler.
        {status.missing.length > 0 && <> Still waiting on school lists from: {status.missing.join(', ')}, so their schools' games aren't counted yet.</>}
      </div>
    </div>
  )
}
