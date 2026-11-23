import React, { useEffect, useMemo, useRef, useState } from 'react'
import { addBaseLayers } from '../baseLayers'
import 'leaflet/dist/leaflet.css'
import { chapterColor } from '../chapterColors'
import { useHomeChapterStatus } from '../homeChapters'
import { useCollapse, ShowMore } from '../ShowMore'

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
            .addTo(g).bindTooltip(`<strong>${s.name}</strong><br>${NAMES[x.c] || x.c}${s.at === 'town' ? ' · placed at town center' : ''}`)
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
  )
}
