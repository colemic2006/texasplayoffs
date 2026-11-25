import React, { useEffect, useMemo, useRef, useState } from 'react'
import { addBaseLayers } from '../baseLayers'
import 'leaflet/dist/leaflet.css'
import { chapterColor } from '../chapterColors'
import { weekLabel } from '../roundName'
import { roundsToShow, isInProgress, upcomingBtn, UPCOMING_TIP } from '../upcoming'
import { CHAPTER_CENTERS } from '../chapterCenters'
import { hull, median, miles } from './ChapterCoverageMap'
import { useCollapse, ShowMore } from '../ShowMore'
import { useSort, SortTh } from '../sortable'

// Where each chapter worked playoff games, round by round: the outline around its game sites
// (its playoff footprint), or lines from the chapter's home city to each site, set against the
// area its schools cover in the regular season.
const NAMES = {
  ABI:'Abilene', AMA:'Amarillo', AUS:'Austin', BEA:'Southeast Texas', COM:'Commerce', CSC:'College Station',
  CTX:'Central Texas', DAL:'Dallas', ELP:'El Paso', FTW:'Fort Worth', HOU:'Houston', NTX:'North Texas', PBC:'Permian Basin',
  PVC:'Pecan Valley', RGV:'Rio Grande Valley', SAN:'San Angelo', SAT:'San Antonio', SFA:'Stephen F. Austin', SPC:'South Plains',
  STX:'South Texas', TYL:'Tyler', WAC:'Waco',
}
const CODE = { WACO: 'WAC', ETX: 'TYL' }
const ROUNDS = { 1:'Bi-District', 2:'Area', 3:'Regionals', 4:'Quarterfinals', 5:'Semifinals', 6:'State Final' }

// is [lat, lng] inside a ring of [lat, lng] points (ray casting)
function inside(p, ring) {
  let a = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [yi, xi] = ring[i], [yj, xj] = ring[j]
    if ((yi > p[0]) !== (yj > p[0]) && p[1] < (xj - xi) * (p[0] - yi) / (yj - yi) + xi) a = !a
  }
  return a
}

export default function PlayoffFootprint({ data }) {
  const games = useMemo(() => (data?.games || []).filter(g => g.chapter && g.lat != null)
    .map(g => ({ ...g, ch: CODE[g.chapter] || g.chapter })), [data])
  const weeks = [...new Set(games.map(g => g.week))].sort((a, b) => a - b)
  const [week, setWeek] = useState(null)   // null = latest round with sites, 'all' = every round so far
  const [view, setView] = useState('footprint')   // 'footprint' | 'lines'
  const [pick, setPick] = useState(null)
  const [home, setHome] = useState(true)   // show the chapter's regular-season area
  const [schools, setSchools] = useState(null)
  const more = useCollapse()
  const s = useSort()
  const mapEl = useRef(null), map = useRef(null), layer = useRef(null)
  const wk = week ?? weeks[weeks.length - 1]

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}data/chapter_schools.json?v=${__BUILD_TIME__}`)
      .then(r => r.ok ? r.json() : null).then(setSchools).catch(() => setSchools({ schools: [] }))
  }, [])
  // each chapter's regular-season area: the outline around its schools (true outliers left out)
  const homeRing = useMemo(() => {
    const by = {}, out = {}
    for (const s of schools?.schools || []) (by[s.chapter] = by[s.chapter] || []).push(s)
    for (const [c, ss] of Object.entries(by)) {
      const mid = [median(ss.map(s => s.lat)), median(ss.map(s => s.lng))]
      const d = ss.map(s => miles(mid, [s.lat, s.lng]))
      const cut = Math.max(180, 4 * median(d))
      out[CODE[c] || c] = hull(ss.filter((s, i) => d[i] <= cut).map(s => [s.lat, s.lng]))
    }
    return out
  }, [schools])

  const shown = games.filter(g => wk === 'all' || g.week === wk)
  const rows = useMemo(() => {
    const by = {}
    for (const g of shown) (by[g.ch] = by[g.ch] || []).push(g)
    return Object.entries(by).map(([c, gs]) => {
      const ctr = CHAPTER_CENTERS[c]
      const d = ctr ? gs.map(g => miles([ctr[1], ctr[2]], [g.lat, g.lng])) : []
      const ring = homeRing[c]
      const inHome = ring && ring.length >= 3 ? gs.filter(g => inside([g.lat, g.lng], ring)).length : null
      const far = d.length ? gs[d.indexOf(Math.max(...d))] : null
      return { c, games: gs, ring: hull(gs.map(g => [g.lat, g.lng])), inHome, med: d.length ? median(d) : null, max: d.length ? Math.max(...d) : null, far }
    }).sort((a, b) => b.games.length - a.games.length || (NAMES[a.c] || a.c).localeCompare(NAMES[b.c] || b.c))
  }, [shown.length, wk, homeRing, data])

  useEffect(() => {
    if (!mapEl.current || !rows.length) return
    let gone = false
    import('leaflet').then(L => {
      if (gone) return
      if (!map.current) {
        map.current = L.map(mapEl.current, { zoomControl: true }).setView([31.2, -99.3], 6)
        addBaseLayers(L, map.current)
      }
      if (layer.current) layer.current.remove()
      const g = L.layerGroup().addTo(map.current); layer.current = g
      const list = pick ? rows.filter(r => r.c === pick) : rows
      const fit = [], dots = []
      for (const r of list) {
        const col = chapterColor(r.c), ctr = CHAPTER_CENTERS[r.c]
        if (pick && home && homeRing[r.c]?.length >= 3) {
          L.polygon(homeRing[r.c], { color: '#111', weight: 1.5, dashArray: '5 5', opacity: 0.85, fillColor: col, fillOpacity: 0.04, interactive: false }).addTo(g)
        }
        if (view === 'footprint') {
          if (r.ring.length >= 3) L.polygon(r.ring, { color: col, weight: pick ? 2.5 : 2, opacity: 0.9, fillColor: col, fillOpacity: pick ? 0.18 : 0.10 })
            .addTo(g).on('click', () => setPick(pick === r.c ? null : r.c))
          else if (r.ring.length === 2) L.polyline(r.ring, { color: col, weight: 3, opacity: 0.8 }).addTo(g)
        } else if (ctr) {
          for (const x of r.games) L.polyline([[ctr[1], ctr[2]], [x.lat, x.lng]], { color: col, weight: pick ? 2.5 : 1.5, opacity: pick ? 0.85 : 0.55, interactive: false }).addTo(g)
        }
        for (const x of r.games) {
          const dot = L.circleMarker([x.lat, x.lng], { radius: pick ? 6 : 4.5, weight: 1.5, color: '#fff', fillColor: col, fillOpacity: 0.95 }).addTo(g)
          dot._home = L.latLng(x.lat, x.lng); dots.push(dot)
          dot.bindTooltip(`<strong>${x.team1} v ${x.team2}</strong><br>${x.classification}${wk === 'all' ? ` · ${ROUNDS[x.week] || 'Week ' + x.week}` : ''} · ${NAMES[r.c] || r.c}<br>${x.stadium || x.site || ''}${x.city ? ', ' + x.city : ''}`)
          fit.push([x.lat, x.lng])
        }
        // the label: at the chapter's home city in the lines view, else at the middle of its sites
        const at = view === 'lines' && ctr ? [ctr[1], ctr[2]] : [median(r.games.map(x => x.lat)), median(r.games.map(x => x.lng))]
        if (view === 'lines' && ctr) {
          L.circleMarker(at, { radius: 7, weight: 2, color: col, fillColor: '#fff', fillOpacity: 1, interactive: false }).addTo(g)
          fit.push(at)
        }
        L.marker(at, { interactive: false, icon: L.divIcon({ className: 'fp-chapter', iconSize: null,
          html: `<span style="color:${col}">${pick ? (NAMES[r.c] || r.c) : r.c}</span>` }) }).addTo(g)
      }
      if (pick && fit.length) map.current.fitBounds(L.latLngBounds(fit), { padding: [40, 40], maxZoom: 9 })
      else map.current.setView([31.2, -99.3], 6)
      // two games at one stadium would hide each other: set them side by side so both show
      const m = map.current
      const spread = () => {
        const pts = dots.map(d => m.latLngToContainerPoint(d._home)), seen = new Set()
        dots.forEach((d, i) => {
          if (seen.has(i)) return
          const group = [i]
          for (let j = i + 1; j < dots.length; j++) if (!seen.has(j) && pts[i].distanceTo(pts[j]) < 2) group.push(j)
          group.forEach(k => seen.add(k))
          if (group.length === 1) { d.setLatLng(d._home); return }
          const r = Math.min(6 + 2 * group.length, 16)
          group.forEach((k, n) => {
            const a = (2 * Math.PI * n) / group.length - Math.PI / 2
            dots[k].setLatLng(m.containerPointToLatLng(L.point(pts[i].x + r * Math.cos(a), pts[i].y + r * Math.sin(a))))
          })
        })
      }
      m.off('zoomend', m._fpSpread); m._fpSpread = spread; m.on('zoomend', spread); spread()
    })
    return () => { gone = true }
  }, [rows, pick, view, home, homeRing])

  if (!weeks.length) return null
  const chip = (on, color) => ({ fontFamily:'var(--mono)', fontSize:9, letterSpacing:'0.06em', padding:'4px 9px', borderRadius:3, cursor:'pointer',
    border:`1px solid ${on ? color : 'var(--border)'}`, background: on ? color : 'transparent', color: on ? '#fff' : 'var(--mid)', display:'inline-flex', alignItems:'center' })
  const lab = { fontFamily:'var(--mono)', fontSize:9, letterSpacing:'0.14em', textTransform:'uppercase', color:'var(--mid)', marginRight:4, alignSelf:'center' }
  const th = { fontFamily:'var(--mono)', fontSize:9, letterSpacing:'0.1em', textTransform:'uppercase', color:'var(--mid)', padding:'8px 10px', textAlign:'right', borderBottom:'1px solid var(--border)', whiteSpace:'nowrap' }
  const td = { padding:'7px 10px', borderBottom:'1px solid var(--border)', fontSize:12, textAlign:'right', fontFamily:'var(--mono)' }
  const total = shown.length, outside = rows.reduce((t, r) => t + (r.inHome == null ? 0 : r.games.length - r.inHome), 0)
  const known = rows.reduce((t, r) => t + (r.inHome == null ? 0 : r.games.length), 0)
  const sel = rows.find(r => r.c === pick)

  return (
    <div style={{ marginBottom:48, marginTop:40 }}>
      <style>{`.fp-chapter span{font:400 20px 'Bebas Neue',sans-serif;letter-spacing:.06em;white-space:nowrap;text-shadow:0 0 3px #fff,0 0 3px #fff,0 0 6px #fff;transform:translate(-50%,-50%);display:inline-block}`}</style>
      <div style={{ fontFamily:'var(--mono)', fontSize:10, letterSpacing:'0.18em', textTransform:'uppercase', color:'var(--mid)', marginBottom:6 }}>Where they worked</div>
      <div className="card-title" style={{ fontFamily:"'Bebas Neue', sans-serif", fontSize:30, color:'var(--ink)', marginBottom:6, paddingBottom:12, borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', gap:12 }}>
        <div style={{ width:4, height:28, borderRadius:2, background:'var(--burnt)' }} />
        Playoff Footprint by Round{sel ? ` · ${NAMES[sel.c] || sel.c}` : ''}
      </div>
      <div style={{ fontSize:13, color:'var(--mid)', lineHeight:1.55, margin:'10px 0 12px', maxWidth:860 }}>
        The map above shows the schools each chapter works in the regular season. This one shows where each chapter actually worked playoff games in a round:
        an outline around its game sites (<strong style={{ color:'var(--ink)' }}>Footprint</strong>), or a line from the chapter's home city to each game (<strong style={{ color:'var(--ink)' }}>Travel lines</strong>).
        With every chapter on, the outlines overlap a lot; pick a chapter to see its playoff games against its own regular-season area (black dashed line).
      </div>
      <div style={{ display:'flex', gap:4, flexWrap:'wrap', marginBottom:6 }}>
        <span style={lab}>Round:</span>
        {roundsToShow(weeks, isInProgress(data)).map(w => weeks.includes(w)
          ? <button key={w} onClick={() => setWeek(w)} style={chip(wk === w, 'var(--burnt)')}>{weekLabel(w, ROUNDS[w])}</button>
          : <button key={w} disabled title={UPCOMING_TIP} style={upcomingBtn(chip(false))}>{weekLabel(w, ROUNDS[w])}</button>)}
        <button onClick={() => setWeek('all')} style={chip(wk === 'all', 'var(--burnt)')}>All rounds so far</button>
      </div>
      <div style={{ display:'flex', gap:4, flexWrap:'wrap', marginBottom:6 }}>
        <span style={lab}>Show:</span>
        <button onClick={() => setView('footprint')} style={chip(view === 'footprint', 'var(--ink)')}>Footprint</button>
        <button onClick={() => setView('lines')} style={chip(view === 'lines', 'var(--ink)')}>Travel lines</button>
        {pick && <button onClick={() => setHome(h => !h)} style={{ ...chip(home, 'var(--ink)'), marginLeft:8 }}>{home ? '✓ ' : ''}Regular-season area</button>}
      </div>
      <div style={{ display:'flex', gap:4, flexWrap:'wrap', marginBottom:10 }}>
        <span style={lab}>Chapter:</span>
        <button onClick={() => setPick(null)} style={chip(!pick, 'var(--burnt)')}>All</button>
        {[...rows].sort((a, b) => (NAMES[a.c] || a.c).localeCompare(NAMES[b.c] || b.c)).map(r => (
          <button key={r.c} onClick={() => setPick(pick === r.c ? null : r.c)} style={chip(pick === r.c, chapterColor(r.c))}>
            <span style={{ width:8, height:8, borderRadius:'50%', background:chapterColor(r.c), marginRight:5, boxShadow: pick === r.c ? '0 0 0 1px #fff' : 'none' }} />
            {r.c} ({r.games.length})
          </button>
        ))}
      </div>
      <div ref={mapEl} style={{ height:560, borderRadius:10, overflow:'hidden', border:'1px solid var(--border)', background:'var(--surface)' }} />
      {known > 0 && (
        <div style={{ fontSize:13, color:'var(--ink)', margin:'10px 0', maxWidth:860 }}>
          <strong>{outside}</strong> of {known} mapped games{wk === 'all' ? ' so far' : ` in ${weekLabel(wk, ROUNDS[wk])}`} ({Math.round(100 * outside / known)}%) were outside the working chapter's own regular-season area.
        </div>
      )}
      <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:10, overflowX:'auto' }}>
        <table style={{ width:'100%', borderCollapse:'collapse', minWidth:640 }}>
          <thead><tr>
            <SortTh s={s} k="name" text style={{ ...th, textAlign:'left' }}>Chapter</SortTh>
            <SortTh s={s} k="games" style={th}>Games on map</SortTh>
            <SortTh s={s} k="inHome" style={th}>In its own area</SortTh>
            <SortTh s={s} k="med" style={th}>Median miles from home city</SortTh>
            <SortTh s={s} k="far" style={{ ...th, textAlign:'left' }}>Farthest game</SortTh>
          </tr></thead>
          <tbody>
            {more.cut(s.sort(rows, { name: r => NAMES[r.c] || r.c, games: r => r.games.length, inHome: r => r.inHome, med: r => r.med, far: r => r.far ? r.max : null })).map(r => (
              <tr key={r.c} onClick={() => setPick(pick === r.c ? null : r.c)} style={{ cursor:'pointer', background: pick === r.c ? 'rgba(253,208,35,0.18)' : 'transparent' }}>
                <td style={{ ...td, textAlign:'left', fontFamily:'DM Sans', whiteSpace:'nowrap' }}>
                  <span style={{ display:'inline-block', width:8, height:8, borderRadius:'50%', background:chapterColor(r.c), marginRight:6 }} />{NAMES[r.c] || r.c}</td>
                <td style={td}>{r.games.length}</td>
                <td style={td}>{r.inHome == null ? '—' : `${r.inHome} (${Math.round(100 * r.inHome / r.games.length)}%)`}</td>
                <td style={td}>{r.med == null ? '—' : Math.round(r.med)}</td>
                <td style={{ ...td, textAlign:'left', fontFamily:'DM Sans' }}>{r.far ? `${r.far.team1} v ${r.far.team2} · ${Math.round(r.max)} mi` : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ShowMore c={more} total={rows.length} noun="chapters" />
      <div style={{ fontFamily:'var(--mono)', fontSize:10, color:'var(--mid)', marginTop:8, lineHeight:1.6 }}>
        {data?.games?.[0]?.year} season. Only games with a chapter and a mapped site are shown ({total} {wk === 'all' ? 'so far' : 'this round'}). "Own area" is the outline around the chapter's schools on the map above;
        chapters without a school list on file show —. Miles are straight-line from the chapter's UIL center point. Click a row, an outline or a chapter button to focus on one chapter.
      </div>
    </div>
  )
}
