import React, { useEffect, useMemo, useRef, useState } from 'react'
import { addBaseLayers } from '../baseLayers'
import 'leaflet/dist/leaflet.css'
import { chapterColor } from '../chapterColors'
import { useHomeChapterStatus } from '../homeChapters'
import { useCollapse, ShowMore } from '../ShowMore'
import { CHAPTER_CENTERS, CENTER_ADDRESS, ROAD_FACTOR, straightMiles } from '../chapterCenters'
import { PAY } from '../officialsCost'
import { useSort, SortTh } from '../sortable'
import { sqMiles } from './CoverageDensity'

const NAMES = {
  ABI:'Abilene', AMA:'Amarillo', AUS:'Austin', BEA:'Southeast Texas (Beaumont)', COM:'Commerce', CSC:'College Station',
  CTX:'Central Texas', DAL:'Dallas', ELP:'El Paso', FTW:'Fort Worth', HOU:'Houston', NTX:'North Texas', PBC:'Permian Basin',
  PVC:'Pecan Valley', RGV:'Rio Grande Valley', SAN:'San Angelo', SAT:'San Antonio', SFA:'Stephen F. Austin', SPC:'South Plains',
  STX:'South Texas', TYL:'Tyler', WAC:'Waco',
}

// convex hull (monotone chain) of [lat, lng] points, as a closed ring
export function hull(pts) {
  const p = [...new Map(pts.map(q => [q.join(','), q])).values()].sort((a, b) => a[1] - b[1] || a[0] - b[0])
  if (p.length < 3) return p
  const cross = (o, a, b) => (a[1] - o[1]) * (b[0] - o[0]) - (a[0] - o[0]) * (b[1] - o[1])
  const lo = [], up = []
  for (const q of p) { while (lo.length >= 2 && cross(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q) }
  for (const q of [...p].reverse()) { while (up.length >= 2 && cross(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop(); up.push(q) }
  return lo.slice(0, -1).concat(up.slice(0, -1))
}
export const median = a => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : 0 }
export const miles = (a, b) => {
  const r = Math.PI / 180, h = Math.sin((b[0] - a[0]) * r / 2) ** 2 + Math.cos(a[0] * r) * Math.cos(b[0] * r) * Math.sin((b[1] - a[1]) * r / 2) ** 2
  return 3958.8 * 2 * Math.asin(Math.sqrt(h))
}

// Each chapter's schools, with an outline around the area they cover
// driving miles (one way, estimated) from a chapter's UIL center point to a school, and its travel band
function fromCenter(c, s) {
  const t = CHAPTER_CENTERS[c]
  if (!t) return null
  const straight = straightMiles(t[1], t[2], s.lat, s.lng), drive = ROAD_FACTOR * straight
  const i = PAY.bands.findIndex(([max]) => drive <= max)
  return { city: t[0], straight, drive, band: i < 0 ? 4 : i + 1 }
}
const bandLabel = b => b === 4 ? `over ${PAY.bands[PAY.bands.length - 1][0]} miles (mileage)` : `travel band ${b} ($${PAY.bands[b - 1][1]})`

export default function ChapterCoverageMap() {
  const [data, setData] = useState(null)
  const [pick, setPick] = useState(null)
  const more = useCollapse()
  const status = useHomeChapterStatus()
  const mapEl = useRef(null), map = useRef(null), layer = useRef(null)

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}data/chapter_schools.json?v=${__BUILD_TIME__}`)
      .then(r => r.ok ? r.json() : null).then(setData).catch(() => setData({ schools: [] }))
  }, [])

  // per chapter: schools, the core area (far-off schools left out of the outline) and its middle
  const chapters = useMemo(() => {
    const by = {}
    for (const s of data?.schools || []) (by[s.chapter] = by[s.chapter] || []).push(s)
    return Object.entries(by).map(([c, ss]) => {
      const mid = [median(ss.map(s => s.lat)), median(ss.map(s => s.lng))]
      const d = ss.map(s => miles(mid, [s.lat, s.lng]))
      const cut = Math.max(180, 4 * median(d))   // only a true outlier (a likely list slip) is left out of the outline
      const core = ss.filter((s, i) => d[i] <= cut), far = ss.filter((s, i) => d[i] > cut)
      return { c, schools: ss, core, far, mid, ring: hull(core.map(s => [s.lat, s.lng])) }
    }).sort((a, b) => (NAMES[a.c] || a.c).localeCompare(NAMES[b.c] || b.c))
  }, [data])

  useEffect(() => {
    if (!mapEl.current || !chapters.length) return
    let gone = false
    import('leaflet').then(L => {
      if (gone) return
      if (!map.current) {
        map.current = L.map(mapEl.current, { zoomControl: true }).setView([31.2, -99.3], 6)
        addBaseLayers(L, map.current)
      }
      if (layer.current) layer.current.remove()
      const g = L.layerGroup().addTo(map.current); layer.current = g
      const sel = chapters.find(x => x.c === pick)
      for (const x of chapters) {
        const on = !pick || x.c === pick, col = chapterColor(x.c)
        if (x.ring.length >= 3) {
          L.polygon(x.ring, { color: col, weight: on ? 2.5 : 1, opacity: on ? 0.9 : 0.25, fillColor: col, fillOpacity: on ? (pick ? 0.12 : 0.08) : 0.02 })
            .addTo(g).on('click', () => setPick(x.c === pick ? null : x.c))
        }
        for (const s of x.schools) {
          const m = L.circleMarker([s.lat, s.lng], { radius: x.c === pick ? 6 : 4, weight: 1.5, color: '#fff', fillColor: col,
            fillOpacity: on ? 0.95 : 0.25, opacity: on ? 1 : 0.3 })
            .addTo(g).bindTooltip((() => {
              const d = fromCenter(x.c, s)
              return `<strong>${s.name}</strong><br>${NAMES[x.c] || x.c}${s.at === 'town' ? ' · placed at town center' : ''}` +
                (d ? `<br>~${Math.round(d.drive)} mi from the chapter's UIL center point (${CENTER_ADDRESS[x.c] || d.city}), ${Math.round(d.straight)} straight-line<br>${bandLabel(d.band)}` : '')
            })())
          if (x.c === pick) m.bindTooltip(s.name, { permanent: true, direction: 'right', offset: [6, 0], className: 'cov-label' })
        }
        if (!pick || x.c === pick) {
          L.marker(x.mid, { interactive: false, icon: L.divIcon({ className: 'cov-chapter',
            html: `<span style="color:${col}">${pick ? (NAMES[x.c] || x.c) : x.c}</span>`, iconSize: null }) }).addTo(g)
        }
      }
      if (sel) {
        const pts = sel.core.map(s => [s.lat, s.lng])
        if (pts.length) map.current.fitBounds(L.latLngBounds(pts), { padding: [40, 40], maxZoom: 10 })
      } else {
        map.current.setView([31.2, -99.3], 6)
      }
    })
    return () => { gone = true }
  }, [chapters, pick])

  const chip = (active, color) => ({ fontFamily:'var(--mono)', fontSize:9, letterSpacing:'0.06em', padding:'4px 9px', borderRadius:3, cursor:'pointer',
    border:`1px solid ${active ? color : 'var(--border)'}`, background: active ? color : 'transparent', color: active ? '#fff' : 'var(--mid)', display:'inline-flex', alignItems:'center' })
  const sel = chapters.find(x => x.c === pick)
  const noList = status.missing || []

  return (
    <>
    <div style={{ marginBottom:48 }}>
      <style>{`.cov-label{background:rgba(255,255,255,.92);border:none;box-shadow:0 1px 3px rgba(0,0,0,.25);font:600 11px 'DM Sans',sans-serif;padding:1px 5px}
        .cov-label:before{display:none}
        .cov-chapter span{font:400 22px 'Bebas Neue',sans-serif;letter-spacing:.06em;white-space:nowrap;text-shadow:0 0 3px #fff,0 0 3px #fff,0 0 6px #fff;transform:translate(-50%,-50%);display:inline-block}`}</style>
      <div style={{ fontFamily:'var(--mono)', fontSize:10, letterSpacing:'0.18em', textTransform:'uppercase', color:'var(--mid)', marginBottom:6 }}>Who covers what</div>
      <div className="card-title" style={{ fontFamily:"'Bebas Neue', sans-serif", fontSize:30, color:'var(--ink)', marginBottom:6, paddingBottom:12, borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', gap:12 }}>
        <div style={{ width:4, height:28, borderRadius:2, background:'var(--burnt)' }} />
        Chapter Coverage Map{sel ? ` · ${NAMES[sel.c] || sel.c}` : ''}
      </div>
      <div style={{ fontSize:13, color:'var(--mid)', lineHeight:1.55, margin:'10px 0 12px', maxWidth:820 }}>
        Each dot is a school, colored by the TASO chapter that works its regular-season games; the outline shows the area each chapter covers.
        Pick a chapter (or click its area) to zoom in and see its schools by name.
      </div>
      <div style={{ display:'flex', gap:4, flexWrap:'wrap', marginBottom:10 }}>
        <button onClick={() => setPick(null)} style={chip(!pick, 'var(--burnt)')}>All chapters</button>
        {chapters.map(x => (
          <button key={x.c} onClick={() => setPick(pick === x.c ? null : x.c)} style={chip(pick === x.c, chapterColor(x.c))}>
            <span style={{ width:8, height:8, borderRadius:'50%', background:chapterColor(x.c), marginRight:5, boxShadow: pick === x.c ? '0 0 0 1px #fff' : 'none' }} />
            {NAMES[x.c] || x.c} ({x.schools.length})
          </button>
        ))}
      </div>
      <div ref={mapEl} style={{ height:560, borderRadius:10, overflow:'hidden', border:'1px solid var(--border)', background:'var(--surface)' }}>
        {!data && <div style={{ padding:20, fontFamily:'var(--mono)', fontSize:11, color:'var(--mid)' }}>Loading map…</div>}
      </div>
      {sel && (
        <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:10, padding:'12px 16px', marginTop:12 }}>
          <div style={{ fontFamily:'var(--mono)', fontSize:9, letterSpacing:'0.12em', textTransform:'uppercase', color:'var(--mid)', marginBottom:6 }}>
            {NAMES[sel.c] || sel.c} · {sel.schools.length} schools on the map
          </div>
          <div style={{ columns:'220px', columnGap:20, fontSize:12, lineHeight:1.7 }}>
            {more.cut([...sel.schools].sort((a, b) => a.name.localeCompare(b.name))).map(s => <div key={s.name}>{s.name}</div>)}
          </div>
          <ShowMore c={more} total={sel.schools.length} noun="schools" />
          {sel.far.length > 0 && (
            <div style={{ fontSize:11, color:'var(--burnt)', marginTop:8 }}>
              Outside this chapter's usual area, so left out of the outline: {sel.far.map(s => s.name).join(', ')}. Worth a check that these are listed under the right chapter.
            </div>
          )}
        </div>
      )}
      <div style={{ fontFamily:'var(--mono)', fontSize:10, color:'var(--mid)', marginTop:8, lineHeight:1.6 }}>
        Schools are placed at their home stadium where we have it, otherwise at the middle of their town. Outlines are drawn around each chapter's schools and can overlap.
        {noList.length > 0 && <> School lists aren't on file yet for {noList.map(c => NAMES[c] || c).join(', ')}, so those areas are incomplete or missing.</>}
        {data?.unplaced?.length > 0 && <> {data.unplaced.length} schools couldn't be placed.</>}
      </div>
    </div>
    <SchoolBands chapters={chapters} noList={noList} />
    <ChapterArea chapters={chapters} short={[...noList, ...(status.partial || [])]} />
    </>
  )
}

// how many of each chapter's schools fall in each travel band, measured from the chapter's UIL center point
function SchoolBands({ chapters, noList }) {
  const s = useSort()
  const more = useCollapse()
  const rows = chapters.map(x => {
    const n = [0, 0, 0, 0, 0]
    for (const sc of x.schools) { const d = fromCenter(x.c, sc); if (d) n[d.band]++ }
    const total = n[1] + n[2] + n[3] + n[4]
    return { c: x.c, n, total, city: CHAPTER_CENTERS[x.c]?.[0] }
  }).filter(r => r.total)
  if (!rows.length) return null
  const sorted = s.sort(rows, { name: r => NAMES[r.c] || r.c, b1: r => r.n[1], b2: r => r.n[2], b3: r => r.n[3], b4: r => r.n[4], total: r => r.total,
    far: r => (r.n[3] + r.n[4]) / r.total })
  const tot = [1, 2, 3, 4].map(b => rows.reduce((t, r) => t + r.n[b], 0)), all = tot.reduce((a, b) => a + b, 0)
  const th = { fontFamily:'var(--mono)', fontSize:9, letterSpacing:'0.1em', textTransform:'uppercase', color:'var(--mid)', padding:'8px 10px', textAlign:'right', borderBottom:'1px solid var(--border)', whiteSpace:'nowrap' }
  const td = { padding:'7px 10px', borderBottom:'1px solid var(--border)', fontSize:12, textAlign:'right', fontFamily:'var(--mono)' }
  const COLORS = ['', '#9B79D2', '#6B3FA0', 'var(--burnt)', '#C0392B']
  const cell = (r, b) => <td style={td}>{r.n[b] || <span style={{ color:'var(--mid)' }}>0</span>} <span style={{ color:'var(--mid)', fontSize:10 }}>{Math.round(100 * r.n[b] / r.total)}%</span></td>
  const head = b => <>Band {b}<div style={{ fontSize:8, letterSpacing:0, textTransform:'none' }}>{b === 1 ? 0 : PAY.bands[b - 2][0] + 1}–{PAY.bands[b - 1][0]} mi · ${PAY.bands[b - 1][1]}</div></>
  return (
    <div style={{ marginBottom:48 }}>
      <div style={{ fontFamily:'var(--mono)', fontSize:10, letterSpacing:'0.18em', textTransform:'uppercase', color:'var(--mid)', marginBottom:6 }}>Travel bands</div>
      <div className="card-title" style={{ fontFamily:"'Bebas Neue', sans-serif", fontSize:30, color:'var(--ink)', marginBottom:6, paddingBottom:12, borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', gap:12 }}>
        <div style={{ width:4, height:28, borderRadius:2, background:'var(--burnt)' }} />
        Each Chapter's Schools by Travel Band
      </div>
      <div style={{ fontSize:13, color:'var(--mid)', lineHeight:1.55, margin:'10px 0 12px', maxWidth:860 }}>
        How far each chapter's schools are from the chapter's UIL center point, sorted into the pay sheet's travel bands: band 1 up to {PAY.bands[0][0]} miles one way,
        band 2 up to {PAY.bands[1][0]}, band 3 up to {PAY.bands[2][0]}, and past that, mileage. Statewide, {Math.round(100 * tot[0] / all)}% of schools are in band 1
        and {Math.round(100 * (tot[2] + tot[3]) / all)}% are band 3 or farther.
      </div>
      <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:10, overflowX:'auto' }}>
        <table style={{ width:'100%', borderCollapse:'collapse', minWidth:720 }}>
          <thead><tr>
            <SortTh s={s} k="name" text style={{ ...th, textAlign:'left' }}>Chapter</SortTh>
            <SortTh s={s} k="b1" style={th}>{head(1)}</SortTh>
            <SortTh s={s} k="b2" style={th}>{head(2)}</SortTh>
            <SortTh s={s} k="b3" style={th}>{head(3)}</SortTh>
            <SortTh s={s} k="b4" style={th}>Over {PAY.bands[2][0]} mi<div style={{ fontSize:8, letterSpacing:0, textTransform:'none' }}>mileage</div></SortTh>
            <SortTh s={s} k="total" style={th}>Schools</SortTh>
            <SortTh s={s} k="far" style={{ ...th, width:'22%', textAlign:'left' }}>Mix</SortTh>
          </tr></thead>
          <tbody>
            {more.cut(sorted).map(r => (
              <tr key={r.c}>
                <td style={{ ...td, textAlign:'left', fontFamily:'DM Sans', whiteSpace:'nowrap' }}>
                  <span style={{ display:'inline-block', width:8, height:8, borderRadius:'50%', background:chapterColor(r.c), marginRight:6 }} />{NAMES[r.c] || r.c}
                  <span style={{ color:'var(--mid)', fontSize:10, marginLeft:6 }}>from {r.city}</span>
                </td>
                {cell(r, 1)}{cell(r, 2)}{cell(r, 3)}{cell(r, 4)}
                <td style={{ ...td, fontWeight:700 }}>{r.total}</td>
                <td style={{ ...td, textAlign:'left' }}>
                  <div style={{ display:'flex', height:10, borderRadius:5, overflow:'hidden', background:'var(--border)' }}>
                    {[1, 2, 3, 4].map(b => r.n[b] ? <div key={b} title={`${bandLabel(b)}: ${r.n[b]}`} style={{ width:`${100 * r.n[b] / r.total}%`, background:COLORS[b] }} /> : null)}
                  </div>
                </td>
              </tr>
            ))}
            <tr>
              <td style={{ ...td, textAlign:'left', fontFamily:'var(--mono)', fontSize:10, letterSpacing:'0.1em', textTransform:'uppercase', color:'var(--mid)' }}>All chapters</td>
              {tot.map((v, i) => <td key={i} style={{ ...td, fontWeight:600 }}>{v} <span style={{ color:'var(--mid)', fontSize:10, fontWeight:400 }}>{Math.round(100 * v / all)}%</span></td>)}
              <td style={{ ...td, fontWeight:700 }}>{all}</td><td style={td} />
            </tr>
          </tbody>
        </table>
      </div>
      <ShowMore c={more} total={sorted.length} noun="chapters" />
      <div style={{ display:'flex', gap:14, flexWrap:'wrap', fontFamily:'var(--mono)', fontSize:10, color:'var(--mid)', marginTop:8 }}>
        {[1, 2, 3, 4].map(b => <span key={b}><span style={{ display:'inline-block', width:10, height:10, borderRadius:2, background:COLORS[b], marginRight:5, verticalAlign:'middle' }} />{bandLabel(b)}</span>)}
      </div>
      <div style={{ fontFamily:'var(--mono)', fontSize:10, color:'var(--mid)', marginTop:8, lineHeight:1.6, maxWidth:900 }}>
        Miles are estimated driving miles one way: straight-line distance from the chapter's center point (as UIL lists it in its mileage calculator) to the school's stadium (or town) times {ROAD_FACTOR}; UIL's own calculator uses Google's driving route. Real crews come from all over a chapter,
        so a school near the edge may still get a closer crew. Travel bands from the 2026 pay sheet.
        {noList.length > 0 && <> School lists aren't complete for {noList.map(c => NAMES[c] || c).join(', ')}.</>}
      </div>
    </div>
  )
}

// the area inside each chapter's outline on the map, with its schools and members
function ChapterArea({ chapters, short = [] }) {
  const s = useSort('area', -1)   // largest area first
  const more = useCollapse()
  const [members, setMembers] = useState({})
  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}data/membership.json?v=${__BUILD_TIME__}`).then(r => r.ok ? r.json() : null)
      .then(d => setMembers(d?.members || {})).catch(() => {})
  }, [])
  const rows = chapters.map(x => {
    const area = sqMiles(x.ring), m = members[x.c] || null
    return { c: x.c, area, schools: x.schools.length, m, perSchool: x.schools.length ? area / x.schools.length : null,
      density: m && area ? 1000 * m / area : null, short: short.includes(x.c) }
  }).filter(r => r.area > 0)
  if (!rows.length) return null
  const sorted = s.sort(rows, { name: r => NAMES[r.c] || r.c, area: r => r.area, schools: r => r.schools, m: r => r.m,
    perSchool: r => r.perSchool, density: r => r.density })
  const total = rows.reduce((t, r) => t + r.area, 0), top = Math.max(...rows.map(r => r.area))
  const big = [...rows].sort((a, b) => b.area - a.area)
  const th = { fontFamily:'var(--mono)', fontSize:9, letterSpacing:'0.1em', textTransform:'uppercase', color:'var(--mid)', padding:'8px 10px', textAlign:'right', borderBottom:'1px solid var(--border)', whiteSpace:'nowrap' }
  const td = { padding:'7px 10px', borderBottom:'1px solid var(--border)', fontSize:12, textAlign:'right', fontFamily:'var(--mono)' }
  const n = v => Math.round(v).toLocaleString()
  return (
    <div style={{ marginBottom:48 }}>
      <div style={{ fontFamily:'var(--mono)', fontSize:10, letterSpacing:'0.18em', textTransform:'uppercase', color:'var(--mid)', marginBottom:6 }}>Ground covered</div>
      <div className="card-title" style={{ fontFamily:"'Bebas Neue', sans-serif", fontSize:30, color:'var(--ink)', marginBottom:6, paddingBottom:12, borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', gap:12 }}>
        <div style={{ width:4, height:28, borderRadius:2, background:'var(--burnt)' }} />
        How Much Ground Each Chapter Covers
      </div>
      <div style={{ fontSize:13, color:'var(--mid)', lineHeight:1.55, margin:'10px 0 12px', maxWidth:860 }}>
        The approximate area inside each chapter's outline on the map above, in square miles, with its schools and members.
        {' '}{NAMES[big[0].c]} covers the most ground (about <strong style={{ color:'var(--ink)' }}>{n(big[0].area)}</strong> sq mi); {NAMES[big[big.length - 1].c]} the least (about {n(big[big.length - 1].area)}).
      </div>
      <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:10, overflowX:'auto' }}>
        <table style={{ width:'100%', borderCollapse:'collapse', minWidth:720 }}>
          <thead><tr>
            <SortTh s={s} k="name" text style={{ ...th, textAlign:'left' }}>Chapter</SortTh>
            <SortTh s={s} k="area" style={{ ...th, color:'var(--burnt)' }}>Square miles</SortTh>
            <SortTh s={s} k="schools" style={th}>Schools</SortTh>
            <SortTh s={s} k="m" style={th}>Members</SortTh>
            <SortTh s={s} k="perSchool" style={th}>Sq mi per school</SortTh>
            <SortTh s={s} k="density" style={th}>Members per 1,000 sq mi</SortTh>
            <th style={{ ...th, width:'20%' }} />
          </tr></thead>
          <tbody>
            {more.cut(sorted).map(r => (
              <tr key={r.c}>
                <td style={{ ...td, textAlign:'left', fontFamily:'DM Sans', whiteSpace:'nowrap' }}>
                  <span style={{ display:'inline-block', width:8, height:8, borderRadius:'50%', background:chapterColor(r.c), marginRight:6 }} />{NAMES[r.c] || r.c}
                  {r.short && <span title="School list incomplete: the area is probably understated" style={{ color:'var(--burnt)', marginLeft:4 }}>*</span>}
                </td>
                <td style={{ ...td, fontWeight:700 }}>{n(r.area)}</td>
                <td style={td}>{r.schools}</td>
                <td style={td}>{r.m ? r.m.toLocaleString() : '—'}</td>
                <td style={td}>{r.perSchool != null ? n(r.perSchool) : '—'}</td>
                <td style={td}>{r.density != null ? r.density.toFixed(1) : '—'}</td>
                <td style={{ ...td, paddingLeft:4 }}><div style={{ height:8, borderRadius:4, background:chapterColor(r.c), width:`${Math.max(2, 100 * r.area / top)}%` }} /></td>
              </tr>
            ))}
            <tr>
              <td style={{ ...td, textAlign:'left', fontFamily:'var(--mono)', fontSize:10, letterSpacing:'0.1em', textTransform:'uppercase', color:'var(--mid)' }}>All chapters</td>
              <td style={{ ...td, fontWeight:700 }}>{n(total)}</td><td colSpan={5} style={{ ...td, textAlign:'left', fontFamily:'DM Sans', color:'var(--mid)' }}>outlines overlap in places; Texas is about 268,600 sq mi</td>
            </tr>
          </tbody>
        </table>
      </div>
      <ShowMore c={more} total={sorted.length} noun="chapters" />
      <div style={{ fontFamily:'var(--mono)', fontSize:10, color:'var(--mid)', marginTop:8, lineHeight:1.6, maxWidth:900 }}>
        An estimate, not official territory: the outline is drawn through each chapter's outermost schools, so ground beyond the last school isn't counted
        (sparse chapters such as Permian Basin, Amarillo and San Angelo really cover more), and neighboring outlines can overlap. A school far outside a chapter's usual area is left out of its outline.
        {short.length > 0 && <> * School list incomplete, so the area is probably understated.</>}
      </div>
    </div>
  )
}
