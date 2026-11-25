import React, { useEffect, useMemo, useRef, useState } from 'react'
import { addBaseLayers } from '../baseLayers'
import { chapterColor } from '../chapterColors'
import { useHomeChapterStatus } from '../homeChapters'

// Members compared with the area each chapter covers. The area is the outline around the chapter's
// schools on the coverage map (public/data/chapter_schools.json), drawn the same way as that map.
const NAMES = {
  ABI:'Abilene', AMA:'Amarillo', AUS:'Austin', BEA:'Southeast Texas', COM:'Commerce', CSC:'College Station',
  CTX:'Central Texas', DAL:'Dallas', ELP:'El Paso', FTW:'Fort Worth', HOU:'Houston', NTX:'North Texas', PBC:'Permian Basin',
  PVC:'Pecan Valley', RGV:'Rio Grande Valley', SAN:'San Angelo', SAT:'San Antonio', SFA:'Stephen F. Austin', SPC:'South Plains',
  STX:'South Texas', TYL:'Tyler', WAC:'Waco',
}
const BINS = [   // members per 1,000 square miles
  [10, '#ECE4F7', 'under 10'], [20, '#C9B5E8', '10 – 20'], [40, '#9B79D2', '20 – 40'], [70, '#6A3FB0', '40 – 70'], [Infinity, '#3B1475', '70 or more'],
]
const binOf = v => BINS.find(([hi]) => v < hi)

function hull(pts) {
  const p = [...new Map(pts.map(q => [q.join(','), q])).values()].sort((a, b) => a[1] - b[1] || a[0] - b[0])
  if (p.length < 3) return p
  const cross = (o, a, b) => (a[1] - o[1]) * (b[0] - o[0]) - (a[0] - o[0]) * (b[1] - o[1])
  const lo = [], up = []
  for (const q of p) { while (lo.length >= 2 && cross(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q) }
  for (const q of [...p].reverse()) { while (up.length >= 2 && cross(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop(); up.push(q) }
  return lo.slice(0, -1).concat(up.slice(0, -1))
}
const median = a => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : 0 }
const miles = (a, b) => {
  const r = Math.PI / 180, h = Math.sin((b[0] - a[0]) * r / 2) ** 2 + Math.cos(a[0] * r) * Math.cos(b[0] * r) * Math.sin((b[1] - a[1]) * r / 2) ** 2
  return 3958.8 * 2 * Math.asin(Math.sqrt(h))
}
export function sqMiles(ring) {
  if (ring.length < 3) return 0
  const lat0 = ring.reduce((s, p) => s + p[0], 0) / ring.length
  const kx = 69.17 * Math.cos(lat0 * Math.PI / 180), ky = 69.0
  let a = 0
  for (let i = 0; i < ring.length; i++) {
    const [y1, x1] = ring[i], [y2, x2] = ring[(i + 1) % ring.length]
    a += x1 * kx * y2 * ky - x2 * kx * y1 * ky
  }
  return Math.abs(a) / 2
}

export default function CoverageDensity({ members }) {
  const [schools, setSchools] = useState(null)
  const status = useHomeChapterStatus()
  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}data/chapter_schools.json?v=${__BUILD_TIME__}`)
      .then(r => r.ok ? r.json() : null).then(d => setSchools(d?.schools || [])).catch(() => setSchools([]))
  }, [])

  const rows = useMemo(() => {
    if (!schools) return []
    const by = {}
    for (const s of schools) (by[s.chapter] = by[s.chapter] || []).push(s)
    return Object.entries(by).filter(([c]) => members[c]).map(([c, ss]) => {
      const mid = [median(ss.map(s => s.lat)), median(ss.map(s => s.lng))]
      const d = ss.map(s => miles(mid, [s.lat, s.lng]))
      const cut = Math.max(180, 4 * median(d))   // same outline as the coverage map: far-off list slips left out
      const ring = hull(ss.filter((s, i) => d[i] <= cut).map(s => [s.lat, s.lng]))
      const area = sqMiles(ring)
      return { c, members: members[c], schools: ss.length, ring, mid, area, density: area ? 1000 * members[c] / area : 0,
               partial: !(status.complete || []).includes(c) }
    }).filter(r => r.area > 0).sort((a, b) => b.density - a.density)
  }, [schools, members, status])

  if (!rows.length) return null
  const partial = rows.filter(r => r.partial)
  const top = rows[0], low = rows[rows.length - 1]
  return (
    <div style={{ marginTop:40 }}>
      <div style={{ fontFamily:'var(--mono)', fontSize:10, letterSpacing:'0.18em', textTransform:'uppercase', color:'var(--mid)', marginBottom:6 }}>Members and the area they cover</div>
      <div className="card-title" style={{ fontFamily:"'Bebas Neue', sans-serif", fontSize:26, color:'var(--ink)', marginBottom:6, paddingBottom:10, borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', gap:12 }}>
        <div style={{ width:4, height:24, borderRadius:2, background:'var(--burnt)' }} />How Thinly Each Chapter Is Spread
      </div>
      <div style={{ fontSize:13, color:'var(--mid)', lineHeight:1.55, margin:'8px 0 12px', maxWidth:820 }}>
        Each chapter's members compared with the area its schools cover. {NAMES[top.c]} has about <strong style={{ color:'var(--ink)' }}>{Math.round(top.density)}</strong> officials
        per 1,000 square miles; {NAMES[low.c]} has about <strong style={{ color:'var(--ink)' }}>{Math.round(low.density)}</strong>, so the same number of games
        means far more driving per official in the thinly covered chapters.
      </div>
      <DensityMap rows={rows} />
      <DensityChart rows={rows} />
      <div style={{ fontFamily:'var(--mono)', fontSize:10, color:'var(--mid)', marginTop:8, lineHeight:1.6, maxWidth:820 }}>
        Area is the outline drawn around each chapter's schools on the Coverage Map, in square miles; chapters' outlines can overlap.
        {partial.length > 0 && <> School lists are incomplete for {partial.map(r => NAMES[r.c] || r.c).join(', ')}, so their areas are likely understated (shown with a dashed outline).</>}
      </div>
    </div>
  )
}

function DensityMap({ rows }) {
  const ref = useRef(null), map = useRef(null), layer = useRef(null)
  useEffect(() => {
    let alive = true
    import('leaflet').then(L => {
      if (!alive || !ref.current) return
      if (!map.current) {
        map.current = L.map(ref.current, { zoomControl: true, scrollWheelZoom: false }).setView([31.2, -99.3], 6)
        addBaseLayers(L, map.current, { maxZoom: 12 })
      }
      if (layer.current) layer.current.remove()
      layer.current = L.layerGroup().addTo(map.current)
      // biggest first, so smaller dense areas sit on top and stay clickable
      for (const r of [...rows].sort((a, b) => b.area - a.area)) {
        const [, fill] = binOf(r.density)
        L.polygon(r.ring, { color: '#3B1475', weight: 1.2, dashArray: r.partial ? '5 4' : null, fillColor: fill, fillOpacity: 0.72 })
          .bindTooltip(`<strong>${NAMES[r.c] || r.c}</strong><br>${r.members.toLocaleString()} members · ${Math.round(r.area).toLocaleString()} sq mi<br>` +
            `<strong>${r.density.toFixed(1)}</strong> members per 1,000 sq mi${r.partial ? '<br><em>school list incomplete</em>' : ''}`, { sticky: true })
          .addTo(layer.current)
        L.marker(r.mid, { interactive: false, icon: L.divIcon({ className: 'den-label', iconSize: null,
          html: `<span>${r.c}<b>${Math.round(r.density)}</b></span>` }) }).addTo(layer.current)
      }
    })
    return () => { alive = false }
  }, [rows])
  return (
    <div>
      <style>{`.den-label span{display:inline-flex;flex-direction:column;align-items:center;transform:translate(-50%,-50%);font:600 10px 'DM Mono',monospace;color:#1a1230;
        text-shadow:0 0 3px #fff,0 0 3px #fff,0 0 5px #fff;white-space:nowrap}.den-label b{font:400 16px 'Bebas Neue',sans-serif;letter-spacing:.04em}`}</style>
      <div ref={ref} style={{ height:520, borderRadius:10, overflow:'hidden', border:'1px solid var(--border)', background:'var(--surface)' }} />
      <div style={{ display:'flex', flexWrap:'wrap', gap:'6px 14px', alignItems:'center', margin:'8px 0 22px', fontFamily:'var(--mono)', fontSize:10, color:'var(--mid)' }}>
        <span style={{ letterSpacing:'0.12em', textTransform:'uppercase' }}>Members per 1,000 sq mi:</span>
        {BINS.map(([, col, label]) => (
          <span key={label} style={{ display:'inline-flex', alignItems:'center', gap:5 }}>
            <span style={{ width:14, height:10, borderRadius:2, background:col, border:'1px solid #3B1475' }} />{label}
          </span>
        ))}
      </div>
    </div>
  )
}

function DensityChart({ rows }) {
  const [hover, setHover] = useState(null)
  const W = 760, H = 400, L = 56, R = 20, T = 16, B = 44
  const xMax = Math.ceil(Math.max(...rows.map(r => r.area)) / 5000) * 5000
  const yMax = Math.ceil(Math.max(...rows.map(r => r.members)) / 250) * 250
  const x = a => L + (W - L - R) * a / xMax, y = m => H - B - (H - T - B) * m / yMax
  const guides = [10, 25, 50, 100]   // members per 1,000 sq mi, drawn as lines from the origin
  return (
    <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:10, padding:'14px 16px' }}>
      <div style={{ fontFamily:'var(--mono)', fontSize:10, letterSpacing:'0.12em', textTransform:'uppercase', color:'var(--mid)', marginBottom:6 }}>
        Members vs. area covered
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width:'100%', height:'auto', display:'block' }} role="img"
        aria-label="Scatter chart of each chapter's members against the area its schools cover">
        {[0, 0.25, 0.5, 0.75, 1].map(f => (
          <g key={f}>
            <line x1={L} x2={W - R} y1={y(f * yMax)} y2={y(f * yMax)} stroke="rgba(15,13,11,0.07)" />
            <text x={L - 8} y={y(f * yMax) + 4} textAnchor="end" fontSize="11" fill="#6B6058" fontFamily="DM Mono">{(f * yMax).toLocaleString()}</text>
            <text x={x(f * xMax)} y={H - B + 18} textAnchor="middle" fontSize="11" fill="#6B6058" fontFamily="DM Mono">{(f * xMax).toLocaleString()}</text>
          </g>
        ))}
        {guides.map(g => {
          // the line members = g/1000 × area, clipped to the plot
          const a2 = Math.min(xMax, yMax * 1000 / g), m2 = g * a2 / 1000
          return (
            <g key={g}>
              <line x1={x(0)} y1={y(0)} x2={x(a2)} y2={y(m2)} stroke="#9B79D2" strokeDasharray="4 4" strokeWidth="1" />
              <text x={x(a2) - 4} y={y(m2) + (a2 === xMax ? -6 : 12)} textAnchor="end" fontSize="10" fill="#6A3FB0" fontFamily="DM Mono">{g} per 1,000 sq mi</text>
            </g>
          )
        })}
        <line x1={L} x2={W - R} y1={H - B} y2={H - B} stroke="#6B6058" />
        <line x1={L} x2={L} y1={T} y2={H - B} stroke="#6B6058" />
        <text x={(L + W - R) / 2} y={H - 6} textAnchor="middle" fontSize="11" fill="#6B6058" fontFamily="DM Mono">AREA COVERED (SQUARE MILES)</text>
        <text transform={`translate(14 ${(T + H - B) / 2}) rotate(-90)`} textAnchor="middle" fontSize="11" fill="#6B6058" fontFamily="DM Mono">MEMBERS</text>
        {rows.map(r => {
          const on = hover === r.c
          return (
            <g key={r.c} onMouseEnter={() => setHover(r.c)} onMouseLeave={() => setHover(null)} style={{ cursor:'default' }}>
              <circle cx={x(r.area)} cy={y(r.members)} r={on ? 8 : 6} fill={chapterColor(r.c)} stroke="#fff" strokeWidth="1.5"
                strokeDasharray={r.partial ? '2 2' : null} />
              <text x={x(r.area) + 9} y={y(r.members) + 4} fontSize="11" fontFamily="DM Mono" fill="#1a1230">{r.c}</text>
              {on && (
                <g>
                  <rect x={Math.min(x(r.area) + 10, W - 210)} y={Math.max(T, y(r.members) - 58)} width="200" height="50" rx="5" fill="#fff" stroke="#ccc" />
                  <text x={Math.min(x(r.area) + 18, W - 202)} y={Math.max(T, y(r.members) - 58) + 18} fontSize="12" fontWeight="600" fill="#1a1230">{NAMES[r.c] || r.c}</text>
                  <text x={Math.min(x(r.area) + 18, W - 202)} y={Math.max(T, y(r.members) - 58) + 36} fontSize="11" fill="#6B6058" fontFamily="DM Mono">
                    {r.members} members · {Math.round(r.area).toLocaleString()} sq mi
                  </text>
                </g>
              )}
            </g>
          )
        })}
      </svg>
      <div style={{ fontSize:12, color:'var(--mid)', marginTop:4 }}>
        Chapters toward the top left have many officials in a small area; chapters toward the bottom right cover a large area with few officials.
        The dashed lines mark equal density.
      </div>
    </div>
  )
}
