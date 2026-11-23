import React, { useEffect, useMemo, useState } from 'react'
import { chapterColor } from '../chapterColors'
import { placeName } from '../placeName'
import { roundName } from '../roundName'

// Search game sites: every season with sites on file, grouped by stadium (games at the same spot
// count together however the site was written), with the games played there.
const norm = s => (s || '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim()

export default function SiteSearch({ allData = {}, years = [], loadAllYears }) {
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(null)
  const [yr, setYr] = useState('all')   // 'all' or one season
  useEffect(() => { loadAllYears?.() }, [])

  const venues = useMemo(() => {
    const by = {}
    for (const y of years) for (const g of allData[y]?.games || []) {
      if (!g.site && g.lat == null) continue
      const key = g.lat != null ? `${g.lat.toFixed(3)},${g.lng.toFixed(3)}` : `t:${norm(g.site)}`
      const v = by[key] || (by[key] = { key, names: new Set(), games: [], city: g.city || '' })
      v.names.add(placeName(g) || g.site); if (g.city) v.city = g.city
      v.games.push({ ...g, year: g.year || y })
    }
    return Object.values(by).map(v => {
      const names = [...v.names].filter(Boolean)
      // the most common way the site is written is its title
      const count = {}
      for (const g of v.games) { const n = placeName(g) || g.site; count[n] = (count[n] || 0) + 1 }
      const title = Object.entries(count).sort((a, b) => b[1] - a[1])[0]?.[0] || names[0]
      v.games.sort((a, b) => b.year - a.year || b.week - a.week)
      return { ...v, title, names, text: norm(names.join(' ') + ' ' + v.city + ' ' + v.games.map(g => g.site).join(' ')) }
    })
  }, [allData, years.join()])
  const seasons = [...new Set(venues.flatMap(v => v.games.map(g => g.year)))].sort((a, b) => a - b)

  const words = norm(q).split(' ').filter(Boolean)
  // the chosen season's games at each site
  const inYear = useMemo(() => venues.map(v => ({ ...v, games: yr === 'all' ? v.games : v.games.filter(g => g.year === yr) })).filter(v => v.games.length), [venues, yr])
  const hits = words.length ? inYear.filter(v => words.every(w => v.text.includes(w))).sort((a, b) => b.games.length - a.games.length) : []
  const top = !words.length ? [...inYear].sort((a, b) => b.games.length - a.games.length || a.title.localeCompare(b.title)).slice(0, 10) : []
  const btn = on => ({ fontFamily:'var(--mono)', fontSize:10, padding:'4px 10px', borderRadius:3, cursor:'pointer',
    border:`1px solid ${on ? 'var(--burnt)' : 'var(--border)'}`, background: on ? 'var(--burnt)' : 'transparent', color: on ? '#fff' : 'var(--mid)' })

  const row = v => (
    <div key={v.key} style={{ borderBottom:'1px solid var(--border)' }}>
      <div onClick={() => setOpen(open === v.key ? null : v.key)} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px', cursor:'pointer' }}>
        <span style={{ color:'var(--burnt)', fontSize:11, width:10 }}>{open === v.key ? '▾' : '▸'}</span>
        <span style={{ flex:1, minWidth:0 }}>
          <strong style={{ fontSize:14 }}>{v.title}</strong>
          {v.names.length > 1 && <span style={{ fontSize:11, color:'var(--mid)' }}> · also listed as {v.names.filter(n => n !== v.title).slice(0, 2).join('; ')}</span>}
        </span>
        <span style={{ fontFamily:'var(--mono)', fontSize:12, fontWeight:700, whiteSpace:'nowrap' }}>{v.games.length} game{v.games.length === 1 ? '' : 's'}</span>
      </div>
      {open === v.key && (
        <div style={{ padding:'0 14px 10px 34px' }}>
          {v.games.map((g, i) => {
            const played = g.score1 != null && g.score2 != null
            return (
              <div key={i} style={{ display:'flex', gap:10, alignItems:'center', flexWrap:'wrap', fontSize:12, padding:'5px 0', borderTop:'1px dashed var(--border)' }}>
                <span style={{ fontFamily:'var(--mono)', fontSize:10, color:'var(--mid)', width:170 }}>{g.year} · {roundName(g)} · {g.classification}</span>
                <span style={{ flex:1, minWidth:200 }}>
                  {g.team1}{played && <span style={{ color:'var(--mid)' }}> {g.score1}</span>} v {g.team2}{played && <span style={{ color:'var(--mid)' }}> {g.score2}</span>}
                  {g.date && <span style={{ color:'var(--mid)', fontSize:11 }}> · {g.date.slice(5, 7)}/{g.date.slice(8, 10)}</span>}
                </span>
                {g.chapter
                  ? <span style={{ fontFamily:'var(--mono)', fontSize:10, padding:'2px 6px', borderRadius:3, background:chapterColor(g.chapter), color:'#fff' }}>{g.chapter}</span>
                  : <span style={{ fontFamily:'var(--mono)', fontSize:10, color:'var(--mid)' }}>no chapter</span>}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )

  return (
    <div style={{ marginTop:48, marginBottom:48 }}>
      <div style={{ fontFamily:'var(--mono)', fontSize:10, letterSpacing:'0.18em', textTransform:'uppercase', color:'var(--mid)', marginBottom:6 }}>Game sites</div>
      <div className="card-title" style={{ fontFamily:"'Bebas Neue', sans-serif", fontSize:30, color:'var(--ink)', marginBottom:6, paddingBottom:12, borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', gap:12 }}>
        <div style={{ width:4, height:28, borderRadius:2, background:'var(--burnt)' }} />
        Search a Stadium
      </div>
      <div style={{ fontSize:13, color:'var(--mid)', lineHeight:1.55, margin:'10px 0 12px', maxWidth:820 }}>
        Type a stadium or town to see every playoff game on file played there, with the score and the chapter that worked it.
        Games at the same stadium are grouped even when the site was written differently.
      </div>
      <div style={{ display:'flex', gap:4, flexWrap:'wrap', alignItems:'center', marginBottom:10 }}>
        <span style={{ fontFamily:'var(--mono)', fontSize:9, letterSpacing:'0.14em', textTransform:'uppercase', color:'var(--mid)', marginRight:4 }}>Seasons:</span>
        <button onClick={() => { setYr('all'); setOpen(null) }} style={btn(yr === 'all')}>All</button>
        {[...seasons].reverse().map(y => <button key={y} onClick={() => { setYr(y); setOpen(null) }} style={btn(yr === y)}>{y}</button>)}
      </div>
      <input value={q} onChange={e => { setQ(e.target.value); setOpen(null) }} placeholder="e.g. Shotwell, Lowrey Field, Canyon, Alamodome…" aria-label="Search stadiums"
        style={{ fontFamily:'var(--sans)', fontSize:14, padding:'10px 14px', borderRadius:6, border:'1px solid var(--border)', background:'#fff',
          color:'var(--ink)', width:'100%', maxWidth:520, boxSizing:'border-box', marginBottom:12 }} />
      <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:10, overflow:'hidden' }}>
        {words.length > 0 && (
          <div style={{ fontFamily:'var(--mono)', fontSize:10, color:'var(--mid)', padding:'8px 14px', borderBottom:'1px solid var(--border)' }}>
            {hits.length ? `${hits.length} site${hits.length === 1 ? '' : 's'} · ${hits.reduce((t, v) => t + v.games.length, 0)} games` : `No site matches "${q}".`}
          </div>
        )}
        {!words.length && (
          <div style={{ fontFamily:'var(--mono)', fontSize:10, letterSpacing:'0.12em', textTransform:'uppercase', color:'var(--mid)', padding:'8px 14px', borderBottom:'1px solid var(--border)' }}>
            Busiest sites{yr === 'all' ? ', all seasons' : ` in ${yr}`}
          </div>
        )}
        {(words.length ? hits.slice(0, 40) : top).map(row)}
        {hits.length > 40 && <div style={{ fontSize:12, color:'var(--mid)', padding:'8px 14px' }}>Showing 40 of {hits.length}; add a word to narrow it down.</div>}
      </div>
      <div style={{ fontFamily:'var(--mono)', fontSize:10, color:'var(--mid)', marginTop:8, lineHeight:1.6 }}>
        Sites on file: {seasons.join(', ')} (earlier seasons were recorded without sites). For 2022–2025, first-round sites come from MaxPreps where it had them, so some are missing.
      </div>
    </div>
  )
}
