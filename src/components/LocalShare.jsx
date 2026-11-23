import React, { useEffect, useMemo, useState } from 'react'
import { chapterColor } from '../chapterColors'

// Two sides of "how local is a chapter": of the games it works, how many involve its own schools;
// and of its own schools' games, how many it works (and who works the rest).
// Home chapters come from the owner's lists, as they were each season (home_chapters_past.json).
const NAMES = {
  ABI:'Abilene', AMA:'Amarillo', AUS:'Austin', BEA:'Southeast Texas', COM:'Commerce', CSC:'College Station', CTX:'Central Texas',
  DAL:'Dallas', ELP:'El Paso', FTW:'Fort Worth', HOU:'Houston', NTX:'North Texas', PBC:'Permian Basin', PVC:'Pecan Valley',
  RGV:'Rio Grande Valley', SAN:'San Angelo', SAT:'San Antonio', SFA:'Stephen F. Austin', SPC:'South Plains', STX:'South Texas',
  TYL:'Tyler', WAC:'Waco',
}
const CODE = { WACO: 'WAC', ETX: 'TYL' }   // Waco's old code; East Texas folded into Tyler

export default function LocalShare({ allData, years }) {
  const [home, setHome] = useState(null), [past, setPast] = useState({})
  const [season, setSeason] = useState('all')
  const [sort, setSort] = useState('own')
  useEffect(() => {
    const get = f => fetch(`${import.meta.env.BASE_URL}data/${f}?v=${__BUILD_TIME__}`).then(r => r.ok ? r.json() : {})
    get('home_chapters_confirmed.json').then(setHome).catch(() => setHome({}))
    get('home_chapters_past.json').then(setPast).catch(() => {})
  }, [])
  const loaded = years.filter(y => allData[y]?.games?.length).sort((a, b) => a - b)

  const rows = useMemo(() => {
    if (!home) return []
    const homeOf = (t, y) => {
      const then = (past[t] || []).find(e => y <= e.through)
      return then ? then.chapter : home[t]
    }
    const by = {}
    const row = c => by[c] || (by[c] = { c, worked: 0, withOwn: 0, ownGames: 0, ownWorked: 0, others: {} })
    for (const y of loaded.filter(y => season === 'all' || y === season)) for (const g of allData[y].games) {
      const ch = g.chapter ? (CODE[g.chapter] || g.chapter) : null
      if (!ch) continue
      const h1 = homeOf(g.team1, y), h2 = homeOf(g.team2, y)
      const w = row(ch); w.worked++
      if (h1 === ch || h2 === ch) w.withOwn++
      for (const h of new Set([h1, h2].filter(Boolean))) {   // a game between two of a chapter's schools counts once for it
        const r = row(h); r.ownGames++
        if (h === ch) r.ownWorked++
        else r.others[ch] = (r.others[ch] || 0) + 1
      }
    }
    return Object.values(by).filter(r => NAMES[r.c] && r.worked + r.ownGames > 0).map(r => ({
      ...r, own: r.worked ? r.withOwn / r.worked : 0, kept: r.ownGames ? r.ownWorked / r.ownGames : 0,
      top: Object.entries(r.others).sort((a, b) => b[1] - a[1]).slice(0, 3),
    }))
  }, [home, past, allData, season, loaded.length])
  if (!rows.length) return null
  const sorted = [...rows].sort((a, b) => sort === 'own' ? b.own - a.own : sort === 'kept' ? b.kept - a.kept : (NAMES[a.c]).localeCompare(NAMES[b.c]))

  const pct = v => `${Math.round(100 * v)}%`
  const btn = on => ({ fontFamily:'var(--mono)', fontSize:10, padding:'4px 9px', borderRadius:3, cursor:'pointer',
    border:`1px solid ${on ? 'var(--burnt)' : 'var(--border)'}`, background: on ? 'var(--burnt)' : 'transparent', color: on ? '#fff' : 'var(--mid)' })
  const th = { fontFamily:'var(--mono)', fontSize:9, letterSpacing:'0.1em', textTransform:'uppercase', color:'var(--mid)', padding:'8px 10px', textAlign:'left', borderBottom:'1px solid var(--border)', verticalAlign:'bottom' }
  const td = { padding:'8px 10px', borderBottom:'1px solid var(--border)', fontSize:12, verticalAlign:'middle' }
  const Bar = ({ v, color }) => (
    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
      <div style={{ flex:1, height:10, borderRadius:5, background:'rgba(15,13,11,0.07)', minWidth:80 }}>
        <div style={{ width:`${100 * v}%`, height:'100%', borderRadius:5, background:color }} />
      </div>
      <span style={{ fontFamily:'var(--mono)', fontSize:12, fontWeight:700, width:38, textAlign:'right' }}>{pct(v)}</span>
    </div>
  )
  const chip = (c, n) => (
    <span key={c} style={{ display:'inline-flex', alignItems:'center', gap:4, fontFamily:'var(--mono)', fontSize:10, padding:'2px 6px', borderRadius:3,
      background:chapterColor(c), color:'#fff', marginRight:4, marginBottom:2, whiteSpace:'nowrap' }}>{c} <b>{n}</b></span>
  )

  return (
    <div style={{ marginTop:48 }}>
      <div style={{ fontFamily:'var(--mono)', fontSize:10, letterSpacing:'0.18em', textTransform:'uppercase', color:'var(--mid)', marginBottom:6 }}>Home and away</div>
      <div className="card-title" style={{ fontFamily:"'Bebas Neue', sans-serif", fontSize:30, color:'var(--ink)', marginBottom:6, paddingBottom:12, borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', gap:12 }}>
        <div style={{ width:4, height:28, borderRadius:2, background:'var(--burnt)' }} />
        How Local Is Each Chapter?
      </div>
      <div style={{ fontSize:13, color:'var(--mid)', lineHeight:1.55, margin:'10px 0 12px', maxWidth:860 }}>
        Two sides of the same question. <strong style={{ color:'var(--ink)' }}>Own schools in its games</strong>: of the playoff games a chapter worked, the share that
        involved at least one of its own schools. <strong style={{ color:'var(--ink)' }}>Kept its schools' games</strong>: of the games its own schools played, the share the chapter
        worked itself, and which chapters worked the rest. A chapter in the middle of the map tends to be everyone's neutral pick and works mostly other areas' games;
        a chapter at the edge mostly works its own.
      </div>
      <div style={{ display:'flex', flexWrap:'wrap', gap:4, alignItems:'center', marginBottom:6 }}>
        <span style={{ fontFamily:'var(--mono)', fontSize:9, letterSpacing:'0.14em', textTransform:'uppercase', color:'var(--mid)', marginRight:4 }}>Seasons:</span>
        <button onClick={() => setSeason('all')} style={btn(season === 'all')}>All</button>
        {[...loaded].reverse().map(y => <button key={y} onClick={() => setSeason(y)} style={btn(season === y)}>{y}</button>)}
      </div>
      <div style={{ display:'flex', flexWrap:'wrap', gap:4, alignItems:'center', marginBottom:10 }}>
        <span style={{ fontFamily:'var(--mono)', fontSize:9, letterSpacing:'0.14em', textTransform:'uppercase', color:'var(--mid)', marginRight:4 }}>Sort:</span>
        {[['own', 'Own schools in its games'], ['kept', 'Kept its schools\' games'], ['name', 'Chapter']].map(([k, l]) =>
          <button key={k} onClick={() => setSort(k)} style={btn(sort === k)}>{l}</button>)}
      </div>
      <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:10, overflowX:'auto' }}>
        <table style={{ width:'100%', borderCollapse:'collapse', minWidth:760 }}>
          <thead><tr>
            <th style={th}>Chapter</th>
            <th style={{ ...th, width:'24%' }}>Own schools in its games<div style={{ textTransform:'none', letterSpacing:0, marginTop:2 }}>of games it worked</div></th>
            <th style={{ ...th, width:'24%' }}>Kept its schools' games<div style={{ textTransform:'none', letterSpacing:0, marginTop:2 }}>of its schools' games</div></th>
            <th style={th}>Who else worked its schools' games</th>
          </tr></thead>
          <tbody>
            {sorted.map(r => (
              <tr key={r.c}>
                <td style={{ ...td, whiteSpace:'nowrap' }}>
                  <span style={{ display:'inline-block', width:8, height:8, borderRadius:'50%', background:chapterColor(r.c), marginRight:6 }} />
                  <strong>{NAMES[r.c]}</strong> <span style={{ fontFamily:'var(--mono)', fontSize:9, color:'var(--mid)' }}>{r.c}</span>
                </td>
                <td style={td}><Bar v={r.own} color="var(--burnt)" />
                  <div style={{ fontFamily:'var(--mono)', fontSize:10, color:'var(--mid)', marginTop:2 }}>{r.withOwn} of {r.worked} games</div></td>
                <td style={td}><Bar v={r.kept} color="var(--sage)" />
                  <div style={{ fontFamily:'var(--mono)', fontSize:10, color:'var(--mid)', marginTop:2 }}>{r.ownWorked} of {r.ownGames} games</div></td>
                <td style={td}>{r.top.length ? r.top.map(([c, n]) => chip(c, n)) : <span style={{ color:'var(--mid)' }}>—</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ fontFamily:'var(--mono)', fontSize:10, color:'var(--mid)', marginTop:8, lineHeight:1.6, maxWidth:900 }}>
        Counts games with a chapter on file. Home chapters are as they were each season where a school has moved. East Texas games count as Tyler.
        A game between two of a chapter's own schools counts once in "its schools' games."
      </div>
    </div>
  )
}
