import React, { useEffect, useState } from 'react'

// How many schools have a home chapter on file yet (scripts/home_chapters.py), with the list of those that don't
export default function HomeChapterCoverage() {
  const [d, setD] = useState(null)
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const [onlyCurrent, setOnlyCurrent] = useState(false)
  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}data/home_chapter_coverage.json?v=${__BUILD_TIME__}`)
      .then(r => r.ok ? r.json() : null).then(setD).catch(() => {})
  }, [])
  useEffect(() => {
    if (window.location.hash === '#missing-home-chapters') setOpen(true)
  }, [])
  if (!d) return null

  const missing = d.total - d.with_chapter
  const pct = (n, of) => of ? Math.round(1000 * n / of) / 10 : 0
  const bars = [
    { label: 'All schools on the site', total: d.total, missing },
    d.current_year && { label: `${d.current_year} playoff teams`, total: d.current_total, missing: d.current_missing },
  ].filter(Boolean)
  const list = d.missing
    .filter(s => !onlyCurrent || s.last_playoffs === d.current_year)
    .filter(s => !q || `${s.name} ${s.town || ''} ${s.county || ''}`.toLowerCase().includes(q.toLowerCase()))

  const mono = { fontFamily:'var(--mono)', fontSize:10, color:'var(--mid)' }
  return (
    <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:10, padding:'18px 20px', marginBottom:32 }}>
      <div style={{ fontFamily:'var(--mono)', fontSize:10, letterSpacing:'0.16em', textTransform:'uppercase', color:'var(--burnt)', marginBottom:4 }}>
        Home chapters on file
      </div>
      <div style={{ display:'flex', alignItems:'baseline', gap:12, flexWrap:'wrap', marginBottom:14 }}>
        <span style={{ fontFamily:"'Bebas Neue', sans-serif", fontSize:40, lineHeight:1, color:'var(--ink)' }}>{pct(missing, d.total)}%</span>
        <span style={{ fontSize:14, color:'var(--ink)' }}>of schools don't have a home chapter yet</span>
        <span style={mono}>({missing.toLocaleString()} of {d.total.toLocaleString()})</span>
      </div>

      {bars.map(b => {
        const have = b.total - b.missing
        return (
          <div key={b.label} style={{ marginBottom:10 }}>
            <div style={{ display:'flex', justifyContent:'space-between', ...mono, marginBottom:3 }}>
              <span style={{ color:'var(--ink)' }}>{b.label}</span>
              <span>{have.toLocaleString()} with a home chapter · <strong style={{ color:'var(--burnt)' }}>{b.missing.toLocaleString()} without ({pct(b.missing, b.total)}%)</strong></span>
            </div>
            <div role="img" aria-label={`${b.label}: ${pct(have, b.total)}% have a home chapter, ${pct(b.missing, b.total)}% don't`}
                 style={{ display:'flex', height:16, borderRadius:4, overflow:'hidden', background:'rgba(15,13,11,0.06)' }}>
              <div style={{ width:`${pct(have, b.total)}%`, background:'var(--burnt)' }} title={`${have} with a home chapter`} />
              <div style={{ width:`${pct(b.missing, b.total)}%`, background:'var(--gold)' }} title={`${b.missing} without`} />
            </div>
          </div>
        )
      })}
      <div style={{ display:'flex', gap:14, ...mono, marginTop:4, marginBottom:12 }}>
        <span><span style={{ display:'inline-block', width:9, height:9, borderRadius:2, background:'var(--burnt)', marginRight:5 }} />Home chapter on file</span>
        <span><span style={{ display:'inline-block', width:9, height:9, borderRadius:2, background:'var(--gold)', marginRight:5 }} />Not yet</span>
      </div>

      <a href="#missing-home-chapters" onClick={e => { e.preventDefault(); setOpen(o => !o); history.replaceState(null, '', open ? window.location.pathname + window.location.search : '#missing-home-chapters') }}
         style={{ fontFamily:'var(--mono)', fontSize:11, letterSpacing:'0.06em', color:'var(--burnt)', fontWeight:600, textDecoration:'none' }}>
        {open ? '▾ Hide the list' : `▸ See the ${missing.toLocaleString()} schools without a home chapter`}
      </a>

      {open && (
        <div id="missing-home-chapters" style={{ marginTop:12 }}>
          <div style={{ display:'flex', gap:10, alignItems:'center', flexWrap:'wrap', marginBottom:8 }}>
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="Filter by school, town or county"
                   style={{ flex:'1 1 220px', padding:'7px 10px', border:'1px solid var(--border)', borderRadius:6, fontSize:13, background:'var(--cream)' }} />
            {d.current_year && (
              <label style={{ ...mono, display:'flex', alignItems:'center', gap:5, cursor:'pointer' }}>
                <input type="checkbox" checked={onlyCurrent} onChange={e => setOnlyCurrent(e.target.checked)} /> {d.current_year} playoff teams only
              </label>
            )}
            <span style={mono}>{list.length} shown</span>
          </div>
          <div style={{ maxHeight:420, overflowY:'auto', border:'1px solid var(--border)', borderRadius:6 }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
              <thead><tr style={{ position:'sticky', top:0, background:'var(--surface)' }}>
                {['School', 'Town', 'County', 'Last playoffs'].map(h => (
                  <th key={h} style={{ ...mono, fontSize:9, letterSpacing:'0.12em', textTransform:'uppercase', textAlign:'left', padding:'7px 10px', borderBottom:'1px solid var(--border)' }}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {list.map(s => (
                  <tr key={s.name}>
                    <td style={{ padding:'6px 10px', borderBottom:'1px solid rgba(15,13,11,0.05)', fontWeight:500 }}>{s.name}</td>
                    <td style={{ padding:'6px 10px', borderBottom:'1px solid rgba(15,13,11,0.05)', color:'var(--mid)' }}>{s.town || '—'}</td>
                    <td style={{ padding:'6px 10px', borderBottom:'1px solid rgba(15,13,11,0.05)', color:'var(--mid)' }}>{s.county || '—'}</td>
                    <td style={{ padding:'6px 10px', borderBottom:'1px solid rgba(15,13,11,0.05)', fontFamily:'var(--mono)', fontSize:11 }}>{s.last_playoffs || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ ...mono, marginTop:6 }}>Know a school's chapter? Use Submit Assignment, or tell the site owner.</div>
        </div>
      )}
    </div>
  )
}
