import React, { useEffect, useMemo, useState } from 'react'
import { chapterColor } from '../chapterColors'
import { placeName } from '../placeName'

// Each chapter's most-worked playoff sites. Games at the same stadium share a map pin, so they're
// grouped by spot (to ~100 m) rather than by how the site was written. Uses every season that has
// game sites on file: 2022-2025 from the owner's bracket workbooks (Area round on), and the current season.
const NAMES = {
  ABI:'Abilene', AMA:'Amarillo', AUS:'Austin', BEA:'Southeast Texas', COM:'Commerce', CSC:'College Station',
  CTX:'Central Texas', DAL:'Dallas', ELP:'El Paso', FTW:'Fort Worth', HOU:'Houston', NTX:'North Texas', PBC:'Permian Basin',
  PVC:'Pecan Valley', RGV:'Rio Grande Valley', SAN:'San Angelo', SAT:'San Antonio', SFA:'Stephen F. Austin', SPC:'South Plains',
  STX:'South Texas', TYL:'Tyler', WAC:'Waco',
}

export default function FavoriteSites({ data, allData, loadAllYears }) {
  const [open, setOpen] = useState(null)
  const [allSites, setAllSites] = useState(false)   // in an opened chapter, also list sites worked only once
  const [span, setSpan] = useState('all')   // 'all' seasons with sites, or 'year' (the season being viewed)
  useEffect(() => { loadAllYears?.() }, [])
  const thisYear = data?.games?.[0]?.year
  const seasons = useMemo(() => {
    const all = { ...(allData || {}) }
    if (data?.games?.[0]?.year) all[data.games[0].year] = data
    return Object.entries(all).filter(([, d]) => d?.games?.some(g => g.lat != null)).map(([y, d]) => ({ year: +y, games: d.games }))
      .sort((a, b) => a.year - b.year)
  }, [data, allData])

  const rows = useMemo(() => {
    const by = {}
    for (const s of seasons.filter(s => span === 'all' || s.year === thisYear)) for (const g of s.games) {
      if (!g.chapter || g.lat == null) continue
      const c = by[g.chapter] || (by[g.chapter] = { code: g.chapter, games: 0, sites: {} })
      c.games++
      const k = `${g.lat.toFixed(3)},${g.lng.toFixed(3)}`
      const site = c.sites[k] || (c.sites[k] = { name: placeName(g), n: 0, years: new Set(), games: [] })
      site.n++; site.years.add(s.year); site.games.push({ ...g, year: s.year })
    }
    return Object.values(by).map(c => {
      const sites = Object.values(c.sites).sort((a, b) => b.n - a.n || a.name.localeCompare(b.name))
      return { ...c, sites, top: sites.filter(s => s.n === sites[0].n) }
    }).sort((a, b) => (NAMES[a.code] || a.code).localeCompare(NAMES[b.code] || b.code))
  }, [seasons, span, thisYear])
  if (!rows.length) return null

  const years = seasons.map(s => s.year).filter(y => span === 'all' || y === thisYear)
  const th = { fontFamily:'var(--mono)', fontSize:9, letterSpacing:'0.12em', textTransform:'uppercase', color:'var(--mid)', padding:'8px 10px', textAlign:'left', borderBottom:'1px solid var(--border)', whiteSpace:'nowrap' }
  const td = { padding:'8px 10px', borderBottom:'1px solid var(--border)', fontSize:13, verticalAlign:'top' }
  return (
    <div style={{ marginBottom:48 }}>
      <div style={{ fontFamily:'var(--mono)', fontSize:10, letterSpacing:'0.18em', textTransform:'uppercase', color:'var(--mid)', marginBottom:6 }}>Where they work</div>
      <div className="card-title" style={{ fontFamily:"'Bebas Neue', sans-serif", fontSize:30, color:'var(--ink)', marginBottom:6, paddingBottom:12, borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', gap:12 }}>
        <div style={{ width:4, height:28, borderRadius:2, background:'var(--burnt)' }} />
        Each Chapter's Most-Worked Sites
      </div>
      <div style={{ fontSize:13, color:'var(--mid)', lineHeight:1.55, margin:'10px 0 14px', maxWidth:800 }}>
        The playoff site each chapter has worked most often{years.length > 1 ? ` (${years.join(', ')})` : ` in ${years[0]}`}. Click a chapter to see all of its sites.
      </div>
      {seasons.length > 1 && seasons.some(s => s.year === thisYear) && (
        <div style={{ display:'flex', gap:4, marginBottom:10 }}>
          {[['all', `All seasons (${seasons.map(s => s.year).join(', ')})`], ['year', `${thisYear} only`]].map(([k, l]) => (
            <button key={k} onClick={() => setSpan(k)} style={{ fontFamily:'var(--mono)', fontSize:10, padding:'4px 10px', borderRadius:3, cursor:'pointer',
              border:`1px solid ${span === k ? 'var(--burnt)' : 'var(--border)'}`, background: span === k ? 'var(--burnt)' : 'transparent', color: span === k ? '#fff' : 'var(--mid)' }}>{l}</button>
          ))}
        </div>
      )}
      <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:10, overflowX:'auto' }}>
        <table style={{ width:'100%', borderCollapse:'collapse' }}>
          <thead><tr>
            <th style={th}>Chapter</th><th style={th}>Most-worked site</th>
            <th style={{ ...th, textAlign:'right' }}>Games there</th><th style={{ ...th, textAlign:'right' }}>Sites worked</th>
          </tr></thead>
          <tbody>
            {rows.map(r => {
              const n = r.top[0].n, isOpen = open === r.code
              return (
                <React.Fragment key={r.code}>
                  <tr onClick={() => { setOpen(isOpen ? null : r.code); setAllSites(false) }} style={{ cursor:'pointer' }}>
                    <td style={{ ...td, whiteSpace:'nowrap' }}>
                      <span style={{ display:'inline-block', width:9, height:9, borderRadius:'50%', background:chapterColor(r.code), marginRight:7 }} />
                      <strong>{NAMES[r.code] || r.code}</strong> <span style={{ fontFamily:'var(--mono)', fontSize:10, color:'var(--mid)' }}>{r.code}</span>
                      <span style={{ color:'var(--burnt)', fontSize:11, marginLeft:6 }}>{isOpen ? '▾' : '▸'}</span>
                    </td>
                    <td style={td}>
                      {n > 1 ? <>
                        {r.top.slice(0, 3).map(s => <div key={s.name}>{s.name}</div>)}
                        {r.top.length > 3 && <div style={{ color:'var(--mid)', fontSize:12 }}>+ {r.top.length - 3} more tied (open to see them)</div>}
                      </>
                        : <span style={{ color:'var(--mid)' }}>{r.sites.length === 1 ? 'Only one game with a mapped site so far' : `No site more than once yet (${r.sites.length} different sites)`}</span>}
                    </td>
                    <td style={{ ...td, textAlign:'right', fontFamily:'var(--mono)', whiteSpace:'nowrap' }}>
                      {n > 1 ? <>{n}{r.top.length > 1 ? ' each' : ''} <span style={{ color:'var(--mid)', fontSize:11 }}>of {r.games} games{r.top.length > 1 ? ` · ${r.top.length} sites tied` : ` (${Math.round(100 * n / r.games)}%)`}</span></> : '—'}
                    </td>
                    <td style={{ ...td, textAlign:'right', fontFamily:'var(--mono)' }}>{r.sites.length}</td>
                  </tr>
                  {isOpen && (
                    <tr><td colSpan={4} style={{ padding:'4px 10px 12px 28px', borderBottom:'1px solid var(--border)', background:'rgba(70,29,124,0.03)' }}>
                      {r.sites.filter(s => allSites || s.n > 1 || r.sites[0].n === 1).map(s => (
                        <div key={s.name + s.n} style={{ display:'flex', gap:10, fontSize:12, padding:'4px 0', borderBottom:'1px dashed var(--border)' }}>
                          <span style={{ fontFamily:'var(--mono)', width:22, textAlign:'right', color:'var(--burnt)', fontWeight:700 }}>{s.n}</span>
                          <span style={{ flex:'0 0 38%', minWidth:180 }}>{s.name}</span>
                          <span style={{ flex:1, color:'var(--mid)' }}>{s.games.map(g => `${g.team1} v ${g.team2}${years.length > 1 ? ` (${g.year})` : ''}`).join(' · ')}</span>
                        </div>
                      ))}
                      {!allSites && r.sites[0].n > 1 && r.sites.some(s => s.n === 1) && (
                        <button onClick={() => setAllSites(true)} style={{ marginTop:6, fontFamily:'var(--mono)', fontSize:10, color:'var(--burnt)', background:'none', border:'none', cursor:'pointer', padding:'4px 0' }}>
                          ▸ Show the {r.sites.filter(s => s.n === 1).length} sites worked only once
                        </button>
                      )}
                    </td></tr>
                  )}
                </React.Fragment>
              )
            })}
          </tbody>
        </table>
      </div>
      <div style={{ fontFamily:'var(--mono)', fontSize:10, color:'var(--mid)', marginTop:8, lineHeight:1.6 }}>
        Counts games with a chapter and a mapped site; games at the same stadium are counted together however the site was listed.
        Sites for 2022–2025 come from the site owner's bracket workbooks, which list sites from the Area round on, so first-round games from those seasons aren't counted. Seasons before 2022 aren't included.
      </div>
    </div>
  )
}
