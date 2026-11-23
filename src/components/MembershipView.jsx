import React, { useEffect, useRef, useState } from 'react'
import { addBaseLayers } from '../baseLayers'
import 'leaflet/dist/leaflet.css'
import { chapterColor } from '../chapterColors'
import { CHAPTER_CENTERS } from '../chapterCenters'
import CoverageDensity from './CoverageDensity'

const NAMES = {
  ABI:'Abilene', AMA:'Amarillo', AUS:'Austin', BEA:'Southeast Texas (Beaumont)', COM:'Commerce', CSC:'College Station',
  CTX:'Central Texas', DAL:'Dallas', ELP:'El Paso', FTW:'Fort Worth', HOU:'Houston', NTX:'North Texas', PBC:'Permian Basin',
  PVC:'Pecan Valley', RGV:'Rio Grande Valley', SAN:'San Angelo', SAT:'San Antonio', SFA:'Stephen F. Austin', SPC:'South Plains',
  STX:'South Texas', TYL:'Tyler', WAC:'Waco',
}

// TASO football membership by chapter (public/data/membership.json)
export default function MembershipView() {
  const [d, setD] = useState(null)
  const [st, setSt] = useState(null)
  const [sites, setSites] = useState([])
  useEffect(() => {
    const get = f => fetch(`${import.meta.env.BASE_URL}data/${f}?v=${__BUILD_TIME__}`).then(r => r.ok ? r.json() : null)
    get('membership.json').then(setD).catch(() => {})
    get('membership_stats.json').then(x => {
      setSt(x)
      if (x?.season) get(`${x.season}.json`).then(y => setSites((y?.games || []).filter(g => g.lat != null))).catch(() => {})
    }).catch(() => {})
  }, [])
  if (!d) return null
  const rows = Object.entries(d.members).sort((a, b) => b[1] - a[1])
  const total = rows.reduce((s, [, n]) => s + n, 0)
  const max = rows[0][1]
  const th = { fontFamily:'var(--mono)', fontSize:9, letterSpacing:'0.12em', textTransform:'uppercase', color:'var(--mid)', padding:'8px 12px', textAlign:'right', borderBottom:'1px solid var(--border)' }
  const td = { padding:'8px 12px', borderBottom:'1px solid var(--border)', fontSize:13, textAlign:'right', fontFamily:'var(--mono)' }
  return (
    <div>
      <div style={{ fontFamily:'var(--mono)', fontSize:10, letterSpacing:'0.18em', textTransform:'uppercase', color:'var(--mid)', marginBottom:6 }}>TASO Football</div>
      <div className="card-title" style={{ fontFamily:"'Bebas Neue', sans-serif", fontSize:30, color:'var(--ink)', marginBottom:20, paddingBottom:12, borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', gap:12 }}>
        <div style={{ width:4, height:28, borderRadius:2, background:'var(--burnt)' }} />
        Chapter Membership · {d.season}
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))', gap:12, marginBottom:24 }}>
        {[
          ['Registered officials', total.toLocaleString()],
          ['Chapters', rows.length],
          ['Largest', `${rows[0][0]} · ${rows[0][1].toLocaleString()}`],
          ['Median chapter', rows[Math.floor(rows.length / 2)][1]],
        ].map(([k, v]) => (
          <div key={k} style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:10, padding:'14px 16px' }}>
            <div style={{ fontFamily:'var(--mono)', fontSize:9, letterSpacing:'0.14em', textTransform:'uppercase', color:'var(--mid)', marginBottom:6 }}>{k}</div>
            <div style={{ fontFamily:"'Bebas Neue', sans-serif", fontSize:28, color:'var(--ink)' }}>{v}</div>
          </div>
        ))}
      </div>

      <MembershipMap members={d.members} sites={sites} />
      <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:10, overflowX:'auto' }}>
        <table style={{ width:'100%', borderCollapse:'collapse' }}>
          <thead><tr>
            <th style={{ ...th, textAlign:'left' }}>Chapter</th>
            <th style={th}>Members</th>
            <th style={th}>Share</th>
            <th style={{ ...th, width:'40%' }}></th>
          </tr></thead>
          <tbody>
            {rows.map(([c, n]) => (
              <tr key={c}>
                <td style={{ ...td, textAlign:'left', fontFamily:'DM Sans' }}>
                  <span style={{ display:'inline-block', width:9, height:9, borderRadius:2, background:chapterColor(c), marginRight:8 }} />
                  {NAMES[c] || c} <span style={{ fontFamily:'var(--mono)', fontSize:10, color:'var(--mid)', marginLeft:4 }}>{c}</span>
                </td>
                <td style={{ ...td, fontWeight:600 }}>{n.toLocaleString()}</td>
                <td style={{ ...td, color:'var(--mid)' }}>{(100 * n / total).toFixed(1)}%</td>
                <td style={{ ...td, paddingLeft:4 }}>
                  <div style={{ height:10, borderRadius:5, background:chapterColor(c), width:`${Math.max(1.5, 100 * n / max)}%` }} />
                </td>
              </tr>
            ))}
            <tr>
              <td style={{ ...td, textAlign:'left', fontFamily:'var(--mono)', fontSize:10, letterSpacing:'0.1em', textTransform:'uppercase', color:'var(--mid)' }}>Total</td>
              <td style={{ ...td, fontWeight:700 }}>{total.toLocaleString()}</td>
              <td style={td}>100%</td>
              <td style={td}></td>
            </tr>
          </tbody>
        </table>
      </div>
      <div style={{ fontFamily:'var(--mono)', fontSize:10, color:'var(--mid)', marginTop:8 }}>{d.source}.</div>
      <CoverageDensity members={d.members} />
      {d.history && <MembershipHistory d={d} th={th} td={td} />}
      {st && <MembershipStats st={st} th={th} td={td} />}
    </div>
  )
}

const name = c => NAMES[c] || c

// membership in earlier seasons beside this one. East Texas (ETX) later folded into Tyler, so
// Tyler's change is measured against both chapters' earlier counts.
const MERGED = { ETX: 'TYL' }
function MembershipHistory({ d, th, td }) {
  const years = Object.keys(d.history).sort()
  const first = years[0]
  const past = (y, c) => {
    const h = d.history[y] || {}
    if (h[c] == null && !Object.values(MERGED).includes(c)) return null
    return (h[c] || 0) + Object.entries(MERGED).filter(([, to]) => to === c).reduce((t, [from]) => t + (h[from] || 0), 0)
  }
  const rows = Object.entries(d.members).sort((a, b) => b[1] - a[1])
  const total = y => Object.values(d.history[y]).reduce((t, n) => t + n, 0)
  const now = rows.reduce((t, [, n]) => t + n, 0)
  const change = (a, b) => {
    if (a == null) return <><td style={td}>—</td><td style={td}>—</td></>
    const diff = b - a, pc = 100 * diff / a
    const col = diff > 0 ? 'var(--sage)' : diff < 0 ? 'var(--burnt)' : 'var(--mid)'
    return <><td style={{ ...td, color:col, fontWeight:600 }}>{diff > 0 ? '+' : ''}{diff}</td>
      <td style={{ ...td, color:col }}>{diff > 0 ? '+' : ''}{pc.toFixed(1)}%</td></>
  }
  const merged = Object.keys(MERGED).filter(c => years.some(y => d.history[y][c] != null))
  return (
    <Section label="Over time" title={`Membership, ${years.join(', ')} vs ${d.season}`}
      intro={`How each chapter's football membership has changed since ${first}. Green is growth, red is a decline.`}
      note={d.history_note}>
      <table style={{ width:'100%', borderCollapse:'collapse' }}>
        <thead><tr>
          <th style={{ ...th, textAlign:'left' }}>Chapter</th>
          {years.map(y => <th key={y} style={th}>{y}</th>)}
          <th style={th}>{d.season}</th><th style={th}>Change</th><th style={th}>% change</th>
        </tr></thead>
        <tbody>
          {rows.map(([c, n]) => (
            <tr key={c}>
              <td style={{ ...td, textAlign:'left', fontFamily:'DM Sans' }}><Dot c={c} />{name(c)}
                <span style={{ fontFamily:'var(--mono)', fontSize:10, color:'var(--mid)', marginLeft:4 }}>{c}</span></td>
              {years.map(y => {
                const v = past(y, c), parts = Object.entries(MERGED).filter(([f, to]) => to === c && d.history[y][f] != null)
                return <td key={y} style={td} title={parts.length ? `${d.history[y][c] || 0} ${c} + ${parts.map(([f]) => `${d.history[y][f]} ${f}`).join(' + ')}` : undefined}>
                  {v == null ? '—' : v.toLocaleString()}{parts.length > 0 && <span style={{ color:'var(--mid)', fontSize:10 }}> *</span>}</td>
              })}
              <td style={{ ...td, fontWeight:600 }}>{n.toLocaleString()}</td>
              {change(past(first, c), n)}
            </tr>
          ))}
          {merged.map(c => (
            <tr key={c}>
              <td style={{ ...td, textAlign:'left', fontFamily:'DM Sans', color:'var(--mid)' }}>East Texas
                <span style={{ fontFamily:'var(--mono)', fontSize:10, marginLeft:4 }}>{c}</span></td>
              {years.map(y => <td key={y} style={{ ...td, color:'var(--mid)' }}>{d.history[y][c] ?? '—'}</td>)}
              <td colSpan={3} style={{ ...td, color:'var(--mid)', fontSize:11 }}>folded into {name(MERGED[c])}</td>
            </tr>
          ))}
          <tr>
            <td style={{ ...td, textAlign:'left', fontFamily:'var(--mono)', fontSize:10, letterSpacing:'0.1em', textTransform:'uppercase', color:'var(--mid)' }}>Total</td>
            {years.map(y => <td key={y} style={{ ...td, fontWeight:700 }}>{total(y).toLocaleString()}</td>)}
            <td style={{ ...td, fontWeight:700 }}>{now.toLocaleString()}</td>
            {change(total(first), now)}
          </tr>
        </tbody>
      </table>
    </Section>
  )
}
const Dot = ({ c }) => <span style={{ display:'inline-block', width:9, height:9, borderRadius:2, background:chapterColor(c), marginRight:8 }} />
const fmt1 = n => (Math.round(n * 10) / 10).toFixed(1)

function Section({ label, title, intro, children, note }) {
  return (
    <div style={{ marginTop:40 }}>
      <div style={{ fontFamily:'var(--mono)', fontSize:10, letterSpacing:'0.18em', textTransform:'uppercase', color:'var(--mid)', marginBottom:6 }}>{label}</div>
      <div className="card-title" style={{ fontFamily:"'Bebas Neue', sans-serif", fontSize:26, color:'var(--ink)', marginBottom:6, paddingBottom:10, borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', gap:12 }}>
        <div style={{ width:4, height:24, borderRadius:2, background:'var(--burnt)' }} />{title}
      </div>
      <div style={{ fontSize:13, color:'var(--mid)', lineHeight:1.55, margin:'8px 0 12px', maxWidth:820 }}>{intro}</div>
      <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:10, overflowX:'auto' }}>{children}</div>
      {note && <div style={{ fontFamily:'var(--mono)', fontSize:10, color:'var(--mid)', marginTop:8, lineHeight:1.6 }}>{note}</div>}
    </div>
  )
}

// a ratio cell: 1.0 = in line with membership; green above, red below
function Ratio({ v, td }) {
  const col = v >= 1.15 ? 'var(--sage)' : v <= 0.85 ? 'var(--burnt)' : 'var(--mid)'
  return <td style={{ ...td, color: col, fontWeight:600 }}>{v.toFixed(2)}x</td>
}

function MembershipStats({ st, th, td }) {
  const T = st.totals, ch = Object.entries(st.chapters)
  const share = c => c.members / T.members
  const perSeason = c => 100 * c.season_games / c.members
  const perHist = c => 100 * c.hist_games / c.members / (st.history_seasons || 5)
  const avgSeason = 100 * T.season_games / T.members, avgHist = 100 * T.hist_games / T.members / (st.history_seasons || 5)
  const complete = new Set(st.complete_lists)
  const work = [...ch].sort((a, b) => perSeason(b[1]) - perSeason(a[1]))
  const cover = [...ch].sort((a, b) => (complete.has(b[0]) - complete.has(a[0])) || (b[1].counties / b[1].members) - (a[1].counties / a[1].members))
  const late = [...ch].sort((a, b) => (b[1].late_games / T.late_games / share(b[1])) - (a[1].late_games / T.late_games / share(a[1])))
  return (
    <>
      <Section label="Workload" title="Playoff Games per 100 Members"
        intro={<>How many playoff games each chapter works for its size. Statewide: <strong>{fmt1(avgSeason)}</strong> games per 100 members this season so far, and <strong>{fmt1(avgHist)}</strong> per season across the {st.history_seasons} seasons on file ({(st.history_years || []).join(', ')}).</>}
        note={`1.00x = the chapter's share of games matches its share of members. ${st.season} counts only rounds whose assignments are at least 90% in${st.season_weeks?.length ? ` (so far: week ${st.season_weeks.join(', ')})` : ''}, so a chapter that sends its list early isn't compared with ones that haven't yet.`}>
        <table style={{ width:'100%', borderCollapse:'collapse' }}>
          <thead><tr>
            <th style={{ ...th, textAlign:'left' }}>Chapter</th><th style={th}>Members</th>
            <th style={th}>{st.season} games{st.season_weeks?.length ? ` (wk ${st.season_weeks.join(', ')})` : ''}</th><th style={th}>Per 100 members</th><th style={th}>vs. size</th>
            <th style={th}>All seasons on file ({st.history_seasons})</th><th style={th}>Per 100 / season</th><th style={th}>vs. size</th>
          </tr></thead>
          <tbody>{work.map(([c, x]) => (
            <tr key={c}>
              <td style={{ ...td, textAlign:'left', fontFamily:'DM Sans' }}><Dot c={c} />{name(c)}</td>
              <td style={td}>{x.members.toLocaleString()}</td>
              <td style={td}>{x.season_games}</td><td style={{ ...td, fontWeight:600 }}>{fmt1(perSeason(x))}</td>
              <Ratio v={perSeason(x) / avgSeason} td={td} />
              <td style={td}>{x.hist_games}</td><td style={{ ...td, fontWeight:600 }}>{fmt1(perHist(x))}</td>
              <Ratio v={perHist(x) / avgHist} td={td} />
            </tr>))}</tbody>
        </table>
      </Section>

      <Section label="Coverage" title="Members per School and County"
        intro="How thinly each chapter's officials are spread over the schools it covers in the regular season. Counties are the counties those schools' stadiums are in."
        note="Only chapters that have sent their full school list are shown with numbers; the rest are marked list pending.">
        <table style={{ width:'100%', borderCollapse:'collapse' }}>
          <thead><tr>
            <th style={{ ...th, textAlign:'left' }}>Chapter</th><th style={th}>Members</th><th style={th}>Home schools</th>
            <th style={th}>Members per school</th><th style={th}>Counties</th><th style={th}>Counties per 100 members</th>
          </tr></thead>
          <tbody>{cover.map(([c, x]) => complete.has(c) ? (
            <tr key={c}>
              <td style={{ ...td, textAlign:'left', fontFamily:'DM Sans' }}><Dot c={c} />{name(c)}</td>
              <td style={td}>{x.members.toLocaleString()}</td><td style={td}>{x.schools}</td>
              <td style={{ ...td, fontWeight:600 }}>{x.schools ? fmt1(x.members / x.schools) : '—'}</td>
              <td style={td}>{x.counties}</td><td style={{ ...td, fontWeight:600 }}>{fmt1(100 * x.counties / x.members)}</td>
            </tr>) : (
            <tr key={c}>
              <td style={{ ...td, textAlign:'left', fontFamily:'DM Sans', color:'var(--mid)' }}><Dot c={c} />{name(c)}</td>
              <td style={{ ...td, color:'var(--mid)' }}>{x.members.toLocaleString()}</td>
              <td colSpan={4} style={{ ...td, color:'var(--mid)', fontSize:11 }}>school list pending</td>
            </tr>))}</tbody>
        </table>
      </Section>

      <Section label="Later Rounds" title={`Quarterfinals to State Final, all seasons on file`}
        intro={<>Who works the biggest games. Share of the {T.late_games} Quarterfinal, Semifinal and State Final games across the {st.history_seasons} seasons on file ({st.history}), compared with each chapter's share of members.</>}
        note="1.00x = the chapter's share of later-round games matches its share of members. Seasons on file: the site has no data for 2011-12, 2014, 2016-17, 2019 or 2020. Old East Texas (ETX) games count toward Tyler.">
        <table style={{ width:'100%', borderCollapse:'collapse' }}>
          <thead><tr>
            <th style={{ ...th, textAlign:'left' }}>Chapter</th><th style={th}>Share of members</th>
            <th style={th}>Later-round games</th><th style={th}>Share of later-round games</th><th style={th}>vs. size</th>
          </tr></thead>
          <tbody>{late.map(([c, x]) => (
            <tr key={c}>
              <td style={{ ...td, textAlign:'left', fontFamily:'DM Sans' }}><Dot c={c} />{name(c)}</td>
              <td style={td}>{(100 * share(x)).toFixed(1)}%</td><td style={td}>{x.late_games}</td>
              <td style={{ ...td, fontWeight:600 }}>{(100 * x.late_games / T.late_games).toFixed(1)}%</td>
              <Ratio v={(x.late_games / T.late_games) / share(x)} td={td} />
            </tr>))}</tbody>
        </table>
      </Section>
    </>
  )
}

// circles at each chapter's center city sized by membership; this season's game sites as small dots
function MembershipMap({ members, sites }) {
  const ref = useRef(null), map = useRef(null), layer = useRef(null)
  const [showSites, setShowSites] = useState(true)
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
      if (showSites) sites.forEach(g => L.circleMarker([g.lat, g.lng], { radius: 2.5, weight: 0, fillColor: '#6B6058', fillOpacity: 0.55 })
        .bindTooltip(`${g.team1} v ${g.team2}`).addTo(layer.current))
      const max = Math.max(...Object.values(members))
      Object.entries(members).forEach(([c, n]) => {
        const ctr = CHAPTER_CENTERS[c]; if (!ctr) return
        L.circleMarker([ctr[1], ctr[2]], { radius: 6 + 34 * Math.sqrt(n / max), color: '#fff', weight: 1.5, fillColor: chapterColor(c), fillOpacity: 0.72 })
          .bindTooltip(`<strong>${NAMES[c] || c}</strong><br>${n.toLocaleString()} members<br><span style="color:#666">centered on ${ctr[0]}</span>`).addTo(layer.current)
      })
    })
    return () => { alive = false }
  }, [members, sites, showSites])
  return (
    <div style={{ marginBottom:24 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6, flexWrap:'wrap', gap:8 }}>
        <span style={{ fontFamily:'var(--mono)', fontSize:10, color:'var(--mid)' }}>Circle size = members · centered on each chapter's main city</span>
        <label style={{ fontFamily:'var(--mono)', fontSize:10, color:'var(--mid)', display:'flex', gap:5, alignItems:'center', cursor:'pointer' }}>
          <input type="checkbox" checked={showSites} onChange={e => setShowSites(e.target.checked)} /> Show this season's game sites ({sites.length})
        </label>
      </div>
      <div ref={ref} style={{ height:460, borderRadius:10, overflow:'hidden', border:'1px solid var(--border)' }} />
    </div>
  )
}
