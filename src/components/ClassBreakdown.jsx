import React, { useEffect, useMemo, useState } from 'react'
import { chapterColor } from '../chapterColors'

// Which chapters have worked which classifications, across every season on file.
// Before 2014 UIL's top class was 5A and six-man was its own class; in 2014 every class moved up one
// (old 5A became 6A ... old 1A became 2A, six-man became 1A). "Today's class names" maps the old
// seasons onto today's so the years line up.
const NAMES = {
  ABI:'Abilene', AMA:'Amarillo', AUS:'Austin', BEA:'Southeast Texas', COM:'Commerce', CSC:'College Station', CTX:'Central Texas',
  DAL:'Dallas', ELP:'El Paso', ETX:'East Texas (now Tyler)', FTW:'Fort Worth', HOU:'Houston', NTX:'North Texas', PBC:'Permian Basin',
  PVC:'Pecan Valley', RGV:'Rio Grande Valley', SAN:'San Angelo', SAT:'San Antonio', SFA:'Stephen F. Austin', SPC:'South Plains',
  STX:'South Texas', TYL:'Tyler', WAC:'Waco',
}
const CODE = { WACO: 'WAC' }   // Waco's old code
const OLD_TO_NEW = { '5A': '6A', '4A': '5A', '3A': '4A', '2A': '3A', '1A': '2A', 'Six Man': '1A' }
const CLASSES = ['6A', '5A', '4A', '3A', '2A', '1A']

function classOf(cls, year, modern) {
  const m = /^(Six Man|\dA)(?:\s+(D\d))?/.exec(cls || '')
  if (!m) return null
  let c = m[1]
  if (year < 2014) c = modern ? OLD_TO_NEW[c] : c
  return { cls: c, div: m[2] || '' }
}

export default function ClassBreakdown({ allData, years, loadAllYears }) {
  const [season, setSeason] = useState('all')
  const [divs, setDivs] = useState(false)
  const [unit, setUnit] = useState('pct')   // 'pct': each chapter's share of the class's games; 'count': games
  const [modern, setModern] = useState(true)
  const [focus, setFocus] = useState('6A')
  const [pick, setPick] = useState(null)
  useEffect(() => { loadAllYears?.() }, [])

  const loaded = years.filter(y => allData[y]?.games?.length)
  const shownYears = season === 'all' ? loaded : loaded.filter(y => y === season)
  const hasOld = shownYears.some(y => y < 2014)

  const { cols, rows } = useMemo(() => {
    const count = {}, colSet = new Set()
    for (const y of shownYears) for (const g of allData[y].games) {
      if (!g.chapter) continue
      const c = classOf(g.classification, y, modern)
      if (!c) continue
      const col = divs && c.div ? `${c.cls} ${c.div}` : c.cls
      colSet.add(col)
      const code = CODE[g.chapter] || g.chapter
      const r = count[code] || (count[code] = { code, total: 0, by: {}, years: {} })
      r.total++; r.by[col] = (r.by[col] || 0) + 1
      const yr = r.years[y] || (r.years[y] = {}); yr[col] = (yr[col] || 0) + 1
    }
    const order = [...CLASSES, 'Six Man']
    const cols = [...colSet].sort((a, b) => order.indexOf(a.split(' D')[0]) - order.indexOf(b.split(' D')[0]) || a.localeCompare(b))
    return { cols, rows: Object.values(count) }
  }, [allData, season, divs, modern, loaded.length])

  const focusCols = cols.filter(c => c === focus || c.startsWith(focus + ' '))
  const inFocus = r => focusCols.reduce((s, c) => s + (r.by[c] || 0), 0)
  const sorted = [...rows].sort((a, b) => (focusCols.length ? inFocus(b) - inFocus(a) : 0) || b.total - a.total)
  const worked = sorted.filter(r => inFocus(r) > 0), never = sorted.filter(r => inFocus(r) === 0)
  const colTotal = Object.fromEntries(cols.map(c => [c, rows.reduce((t, r) => t + (r.by[c] || 0), 0)]))
  const allTotal = rows.reduce((t, r) => t + r.total, 0)
  const val = (r, c) => unit === 'pct' ? (colTotal[c] ? (r.by[c] || 0) / colTotal[c] : 0) : (r.by[c] || 0)
  const max = Math.max(unit === 'pct' ? 0.0001 : 1, ...rows.flatMap(r => cols.map(c => val(r, c))))
  const show = (r, c) => {
    if (unit === 'count') return r.by[c] || 0
    const v = val(r, c)
    return !v ? '0%' : v < 0.005 ? '<1%' : `${Math.round(100 * v)}%`
  }
  const sel = rows.find(r => r.code === pick)
  const label = season === 'all' ? `${loaded[loaded.length - 1]}–${loaded[0]} (${loaded.length} seasons)` : season

  const btn = on => ({ fontFamily:'var(--mono)', fontSize:10, padding:'4px 9px', borderRadius:3, cursor:'pointer',
    border:`1px solid ${on ? 'var(--burnt)' : 'var(--border)'}`, background: on ? 'var(--burnt)' : 'transparent', color: on ? '#fff' : 'var(--mid)' })
  const th = { fontFamily:'var(--mono)', fontSize:9, letterSpacing:'0.1em', textTransform:'uppercase', color:'var(--mid)', padding:'7px 8px', textAlign:'center', borderBottom:'1px solid var(--border)', whiteSpace:'nowrap' }
  const td = { padding:'6px 8px', borderBottom:'1px solid var(--border)', fontSize:12, textAlign:'center', fontFamily:'var(--mono)' }
  const cell = n => n ? { background:`rgba(70,29,124,${0.08 + 0.72 * Math.sqrt(n / max)})`, color: n / max > 0.35 ? '#fff' : 'var(--ink)' }
                      : { background:'rgba(200,60,40,0.07)', color:'rgba(160,40,30,0.55)' }

  if (!loaded.length) return null
  return (
    <div style={{ marginTop:48 }}>
      <div style={{ fontFamily:'var(--mono)', fontSize:10, letterSpacing:'0.18em', textTransform:'uppercase', color:'var(--mid)', marginBottom:6 }}>By classification</div>
      <div className="card-title" style={{ fontFamily:"'Bebas Neue', sans-serif", fontSize:30, color:'var(--ink)', marginBottom:6, paddingBottom:12, borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', gap:12 }}>
        <div style={{ width:4, height:28, borderRadius:2, background:'var(--burnt)' }} />
        Which Chapters Work Which Classes
      </div>
      <div style={{ fontSize:13, color:'var(--mid)', lineHeight:1.55, margin:'10px 0 12px', maxWidth:820 }}>
        Playoff games each chapter has worked in each classification. Pick a class to see who has and hasn't worked it; click a chapter to see its games class by class, season by season.
      </div>

      <div style={{ display:'flex', flexWrap:'wrap', gap:4, alignItems:'center', marginBottom:8 }}>
        <span style={{ fontFamily:'var(--mono)', fontSize:9, letterSpacing:'0.14em', textTransform:'uppercase', color:'var(--mid)', marginRight:4 }}>Seasons:</span>
        <button onClick={() => setSeason('all')} style={btn(season === 'all')}>All</button>
        {loaded.map(y => <button key={y} onClick={() => setSeason(y)} style={btn(season === y)}>{y}</button>)}
      </div>
      <div style={{ display:'flex', flexWrap:'wrap', gap:4, alignItems:'center', marginBottom:8 }}>
        <span style={{ fontFamily:'var(--mono)', fontSize:9, letterSpacing:'0.14em', textTransform:'uppercase', color:'var(--mid)', marginRight:4 }}>Class:</span>
        {(modern || !hasOld ? CLASSES : [...CLASSES, 'Six Man']).map(c => <button key={c} onClick={() => setFocus(c)} style={btn(focus === c)}>{c}</button>)}
        <span style={{ width:12 }} />
        <button onClick={() => setDivs(d => !d)} style={btn(divs)}>{divs ? '✓ ' : ''}Show D1 / D2</button>
        <span style={{ width:12 }} />
        <span style={{ fontFamily:'var(--mono)', fontSize:9, letterSpacing:'0.14em', textTransform:'uppercase', color:'var(--mid)', marginRight:4 }}>Show:</span>
        <button onClick={() => setUnit('pct')} style={btn(unit === 'pct')}>% of the class's games</button>
        <button onClick={() => setUnit('count')} style={btn(unit === 'count')}>Number of games</button>
        {hasOld && <button onClick={() => setModern(m => !m)} style={btn(modern)} title="Before 2014, UIL's classes were one step lower: old 5A is today's 6A, and six-man is today's 1A">
          {modern ? '✓ ' : ''}Today's class names</button>}
      </div>

      {focusCols.length > 0 && (
        <div style={{ background:'rgba(253,208,35,0.22)', border:'2px solid var(--gold)', borderRadius:10, padding:'12px 16px', margin:'4px 0 14px', fontSize:14, color:'var(--ink)', lineHeight:1.55, maxWidth:900 }}>
          <strong>{worked.length} of {rows.length} chapters</strong> worked at least one {focus} playoff game in {label}.
          {never.length > 0 && <> <strong style={{ color:'var(--burnt)' }}>Never:</strong> {never.map(r => NAMES[r.code] || r.code).join(', ')}.</>}
          {worked.length > 0 && <div style={{ fontSize:12, color:'var(--mid)', marginTop:4 }}>
            Most {focus} games: {worked.slice(0, 3).map(r => `${NAMES[r.code] || r.code} (${inFocus(r)})`).join(', ')}.
          </div>}
        </div>
      )}

      <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:10, overflowX:'auto' }}>
        <table style={{ width:'100%', borderCollapse:'collapse' }}>
          <thead><tr>
            <th style={{ ...th, textAlign:'left' }}>Chapter</th>
            {cols.map(c => <th key={c} style={{ ...th, color: focusCols.includes(c) ? 'var(--burnt)' : 'var(--mid)', cursor:'pointer' }}
              onClick={() => setFocus(c.split(' D')[0])}>{c}</th>)}
            <th style={th}>Total</th>
          </tr></thead>
          <tbody>
            {unit === 'pct' && (
              <tr><td style={{ ...td, textAlign:'left', fontFamily:'DM Sans', color:'var(--mid)', fontSize:11 }}>Games in this class</td>
                {cols.map(c => <td key={c} style={{ ...td, color:'var(--mid)', fontSize:11 }}>{colTotal[c]}</td>)}
                <td style={{ ...td, color:'var(--mid)', fontSize:11 }}>{allTotal}</td></tr>
            )}
            {sorted.map(r => (
              <tr key={r.code} onClick={() => setPick(pick === r.code ? null : r.code)} style={{ cursor:'pointer', outline: pick === r.code ? '2px solid var(--burnt)' : 'none', outlineOffset:-2 }}>
                <td style={{ ...td, textAlign:'left', fontFamily:'DM Sans', whiteSpace:'nowrap' }}>
                  <span style={{ display:'inline-block', width:8, height:8, borderRadius:'50%', background:chapterColor(r.code), marginRight:6 }} />
                  {NAMES[r.code] || r.code} <span style={{ fontFamily:'var(--mono)', fontSize:9, color:'var(--mid)' }}>{r.code}</span>
                </td>
                {cols.map(c => <td key={c} title={`${r.by[c] || 0} of ${colTotal[c]} ${c} games`} style={{ ...td, ...cell(val(r, c)), fontWeight: focusCols.includes(c) ? 700 : 400 }}>{show(r, c)}</td>)}
                <td style={{ ...td, fontWeight:700 }} title={`${r.total} of ${allTotal} games`}>{unit === 'pct' ? `${(100 * r.total / allTotal).toFixed(1)}%` : r.total}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {sel && <ChapterDetail sel={sel} cols={cols} years={shownYears} />}

      <div style={{ fontFamily:'var(--mono)', fontSize:10, color:'var(--mid)', marginTop:8, lineHeight:1.6, maxWidth:900 }}>
        Counts only games with a chapter on file. Percentages are each chapter's share of all that class's games in the seasons shown, so each column adds up to 100%; hover a cell for the game count. Red-tinted zeros are classes a chapter didn't work.
        {hasOld && modern && ' 2010 and 2013 are shown in today\'s class names: before 2014 the top class was 5A (today\'s 6A) and six-man was its own class (today\'s 1A).'}
        {' '}The 2026 season is still in progress.
      </div>
    </div>
  )
}

function ChapterDetail({ sel, cols, years }) {
  const th = { fontFamily:'var(--mono)', fontSize:9, letterSpacing:'0.1em', textTransform:'uppercase', color:'var(--mid)', padding:'6px 8px', textAlign:'center', borderBottom:'1px solid var(--border)' }
  const td = { padding:'5px 8px', borderBottom:'1px solid var(--border)', fontSize:12, textAlign:'center', fontFamily:'var(--mono)' }
  const max = Math.max(1, ...cols.map(c => sel.by[c] || 0))
  return (
    <div style={{ background:'var(--surface)', border:'2px solid var(--burnt)', borderRadius:10, padding:'14px 16px', marginTop:12 }}>
      <div style={{ fontFamily:"'Bebas Neue', sans-serif", fontSize:22, color:'var(--ink)', marginBottom:8 }}>{NAMES[sel.code] || sel.code} · {sel.total} playoff games</div>
      <div style={{ display:'flex', flexWrap:'wrap', gap:24 }}>
        <div style={{ flex:'1 1 260px' }}>
          {cols.map(c => (
            <div key={c} style={{ display:'grid', gridTemplateColumns:'64px 1fr 36px', alignItems:'center', gap:8, padding:'3px 0' }}>
              <span style={{ fontFamily:'var(--mono)', fontSize:11 }}>{c}</span>
              <div style={{ height:12, borderRadius:3, background: sel.by[c] ? chapterColor(sel.code) : 'transparent', width:`${100 * (sel.by[c] || 0) / max}%`,
                border: sel.by[c] ? 'none' : '1px dashed rgba(160,40,30,0.4)', minWidth: sel.by[c] ? 4 : 40 }} />
              <span style={{ fontFamily:'var(--mono)', fontSize:12, fontWeight:700, textAlign:'right', color: sel.by[c] ? 'var(--ink)' : 'rgba(160,40,30,0.6)' }}>{sel.by[c] || 0}</span>
            </div>
          ))}
        </div>
        <div style={{ flex:'2 1 420px', overflowX:'auto' }}>
          <table style={{ borderCollapse:'collapse', width:'100%' }}>
            <thead><tr><th style={{ ...th, textAlign:'left' }}>Season</th>{cols.map(c => <th key={c} style={th}>{c}</th>)}<th style={th}>Total</th></tr></thead>
            <tbody>
              {years.map(y => {
                const r = sel.years[y] || {}
                const t = cols.reduce((s, c) => s + (r[c] || 0), 0)
                return (
                  <tr key={y}>
                    <td style={{ ...td, textAlign:'left' }}>{y}</td>
                    {cols.map(c => <td key={c} style={{ ...td, color: r[c] ? 'var(--ink)' : 'var(--border)' }}>{r[c] || '·'}</td>)}
                    <td style={{ ...td, fontWeight:700 }}>{t}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
