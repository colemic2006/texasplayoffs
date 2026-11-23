import React, { useEffect, useMemo, useState } from 'react'
import { roundName, weekLabel } from '../roundName'
import { roundsToShow, isInProgress, upcomingBtn, upcomingCell, UPCOMING, UPCOMING_TIP } from '../upcoming'
import { gameCost, PAY } from '../officialsCost'
import { chapterColor } from '../chapterColors'
import { placeName } from '../placeName'
import { CHAPTER_CENTERS, straightMiles } from '../chapterCenters'

const ROUNDS = { 1: 'Bi-District', 2: 'Area', 3: 'Regionals', 4: 'Quarterfinals', 5: 'Semifinals', 6: 'State Final' }
const usd = n => '$' + Math.round(n).toLocaleString()
const LOCAL_WEEKS = [1]   // rounds that also show what the venue's own chapter would have cost

// The chapter that covers a game's venue: the home chapter of the school nearest the stadium
// (public/data/chapter_schools.json, the schools on the coverage map)
function venueChapter(g, schools) {
  let best = null, bestD = Infinity
  for (const s of schools) {
    if (!CHAPTER_CENTERS[s.chapter]) continue
    const d = straightMiles(g.lat, g.lng, s.lat, s.lng)
    if (d < bestD) { bestD = d; best = s }
  }
  return best && { code: best.chapter, school: best.name, miles: bestD }
}

export default function OfficialsCost({ data }) {
  const names = { ELP: 'El Paso', BEA: 'Beaumont', ...Object.fromEntries((data?.chapters || []).map(c => [c.code, c.name])) }
  const [schools, setSchools] = useState([])
  const [week, setWeek] = useState(null)
  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}data/chapter_schools.json?v=${__BUILD_TIME__}`)
      .then(r => r.ok ? r.json() : null).then(d => setSchools(d?.schools || [])).catch(() => {})
  }, [])

  const all = useMemo(() => (data?.games || []).map(g => ({ ...g, cost: gameCost(g) })).filter(g => g.cost), [data])
  const weeks = useMemo(() => [...new Set(all.map(g => g.week))].sort((a, b) => a - b), [all])
  useEffect(() => { if (week !== 'all' && !weeks.includes(week)) setWeek(weeks[0] ?? 'all') }, [weeks])

  const { top, shown, total, local } = useMemo(() => {
    const shown = all.filter(g => week === 'all' || g.week === week).sort((a, b) => b.cost.total - a.cost.total)
    const total = shown.reduce((s, g) => s + g.cost.total, 0)
    let local = null
    if (LOCAL_WEEKS.includes(week) && schools.length) {
      for (const g of shown) {
        const v = venueChapter(g, schools)
        g.local = v && { ...v, cost: gameCost({ ...g, chapter: v.code }) }
      }
      const t = shown.reduce((s, g) => s + (g.local?.cost?.total ?? g.cost.total), 0)
      local = { total: t, saved: total - t, outside: shown.filter(g => g.local && g.local.code !== g.chapter).length }
    }
    return { top: shown.slice(0, 10), shown, total, local }
  }, [all, week, schools])
  if (!all.length) return null

  const th = { fontFamily:'var(--mono)', fontSize:9, letterSpacing:'0.12em', textTransform:'uppercase', color:'var(--mid)', padding:'8px 10px', textAlign:'right', borderBottom:'1px solid var(--border)', whiteSpace:'nowrap' }
  const td = { padding:'8px 10px', borderBottom:'1px solid var(--border)', fontSize:12, textAlign:'right', fontFamily:'var(--mono)', whiteSpace:'nowrap', verticalAlign:'top' }
  const chip = c => <span style={{ fontSize:10, padding:'2px 7px', borderRadius:3, background:chapterColor(c), color:'#fff' }}>{names[c] || c}</span>
  const btn = on => ({ fontFamily:'var(--mono)', fontSize:10, padding:'4px 10px', borderRadius:3, cursor:'pointer',
    border:`1px solid ${on ? 'var(--burnt)' : 'var(--border)'}`, background: on ? 'var(--burnt)' : 'transparent', color: on ? '#fff' : 'var(--mid)' })
  const showLocal = !!local
  const label = week === 'all' ? 'all rounds' : ROUNDS[week]

  return (
    <div style={{ marginBottom:48 }}>
      <div style={{ fontFamily:'var(--mono)', fontSize:10, letterSpacing:'0.18em', textTransform:'uppercase', color:'var(--mid)', marginBottom:6 }}>Officiating Costs</div>
      <div className="card-title" style={{ fontFamily:"'Bebas Neue', sans-serif", fontSize:30, color:'var(--ink)', marginBottom:6, paddingBottom:12, borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', gap:12 }}>
        <div style={{ width:4, height:28, borderRadius:2, background:'var(--burnt)' }} />
        Most Expensive Games to Officiate
      </div>
      <div style={{ display:'flex', gap:4, flexWrap:'wrap', margin:'10px 0 8px' }}>
        {roundsToShow(weeks, isInProgress(data)).map(w => weeks.includes(w)
          ? <button key={w} onClick={() => setWeek(w)} style={btn(week === w)}>{weekLabel(w, ROUNDS[w])} ({all.filter(g => g.week === w).length})</button>
          : <button key={w} disabled title={UPCOMING_TIP} style={upcomingBtn(btn(false))}>{weekLabel(w, ROUNDS[w])}</button>)}
        {weeks.length > 1 && <button onClick={() => setWeek('all')} style={btn(week === 'all')}>All rounds ({all.length})</button>}
      </div>
      <div style={{ fontSize:13, color:'var(--mid)', lineHeight:1.55, margin:'4px 0 14px', maxWidth:820 }}>
        Estimated cost of the officiating crew for each game, from the 2026 TASO pay sheet. The 10 costliest {label} games are shown.
        Across all {shown.length} {label} games with a site: <strong style={{ color:'var(--ink)' }}>{usd(total)}</strong>, an average of {usd(total / (shown.length || 1))} a game.
      </div>
      {showLocal && (
        <div style={{ background:'rgba(253,208,35,0.22)', border:'2px solid var(--gold)', borderRadius:10, padding:'12px 16px', marginBottom:14, fontSize:14, color:'var(--ink)', lineHeight:1.55, maxWidth:860 }}>
          <strong>If every {label} game had used the chapter that covers its venue:</strong> {usd(local.total)} instead of {usd(total)}, a saving of
          <strong style={{ color:'var(--burnt)' }}> {usd(local.saved)}</strong> ({Math.round(100 * local.saved / total)}%).
          {' '}{local.outside} of the {shown.length} games were worked by a different chapter than the one covering the venue.
        </div>
      )}
      <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:10, overflowX:'auto' }}>
        <table style={{ width:'100%', borderCollapse:'collapse' }}>
          <thead><tr>
            <th style={{ ...th, textAlign:'left' }}>#</th>
            <th style={{ ...th, textAlign:'left' }}>Game</th>
            <th style={{ ...th, textAlign:'left' }}>Crew from</th>
            <th style={th}>One way</th>
            {!showLocal && <th style={th}>Round trip</th>}
            <th style={th}>Game fees</th>
            <th style={th}>{showLocal ? 'Travel, riders, meals' : 'Travel'}</th>
            {!showLocal && <><th style={th}>Riders</th><th style={th}>Meals</th></>}
            <th style={{ ...th, color:'var(--burnt)' }}>Total</th>
            {!showLocal && <th style={th}>Per school</th>}
            {showLocal && <>
              <th style={{ ...th, textAlign:'left', borderLeft:'2px solid var(--gold)' }}>Venue's chapter</th>
              <th style={th}>Their cost</th>
              <th style={{ ...th, color:'var(--burnt)' }}>Difference</th>
            </>}
          </tr></thead>
          <tbody>
            {top.map((g, i) => {
              const c = g.cost, l = g.local
              const diff = l?.cost ? c.total - l.cost.total : null
              return (
                <tr key={i}>
                  <td style={{ ...td, textAlign:'left', color:'var(--mid)' }}>{i + 1}</td>
                  <td style={{ ...td, textAlign:'left', fontFamily:'DM Sans', whiteSpace:'normal', minWidth:220 }}>
                    <div style={{ fontWeight:600 }}>{g.team1} v {g.team2}</div>
                    <div style={{ fontSize:11, color:'var(--mid)' }}>{roundName(g)} · {g.classification} · {placeName(g)} · crew of {c.crew}</div>
                  </td>
                  <td style={{ ...td, textAlign:'left' }}>{chip(g.chapter)}</td>
                  <td style={td}>{Math.round(c.oneWay)} mi</td>
                  {!showLocal && <td style={td}>{Math.round(c.roundTrip)} mi</td>}
                  <td style={td}>{usd(c.fees)}</td>
                  <td style={td} title={c.band ? `${c.crew} officials × $${c.band} travel band` : `${Math.round(c.roundTrip)} round-trip miles × ${PAY.cars} cars × $${PAY.perMile} a mile`}>{usd(showLocal ? c.travel + c.riders + c.meals : c.travel)}</td>
                  {!showLocal && <><td style={td}>{c.riders ? usd(c.riders) : '—'}</td><td style={td}>{c.meals ? usd(c.meals) : '—'}</td></>}
                  <td style={{ ...td, color:'var(--burnt)', fontWeight:700 }}>{usd(c.total)}</td>
                  {!showLocal && <td style={td}>{usd(c.total / 2)}</td>}
                  {showLocal && <>
                    <td style={{ ...td, textAlign:'left', borderLeft:'2px solid var(--gold)', whiteSpace:'normal', minWidth:120 }}
                      title={l ? `Nearest school on the coverage map: ${l.school} (${Math.round(l.miles)} mi from the stadium)` : undefined}>
                      {l ? <>{chip(l.code)}<div style={{ fontSize:10, color:'var(--mid)', marginTop:3 }}>{Math.round(l.cost.oneWay)} mi one way</div></> : '—'}
                    </td>
                    <td style={td}>{l?.cost ? usd(l.cost.total) : '—'}</td>
                    <td style={{ ...td, color: diff > 0 ? 'var(--burnt)' : 'var(--mid)', fontWeight:700 }}>
                      {diff == null ? '—' : l.code === g.chapter ? 'same chapter' : diff > 0 ? `+${usd(diff)}` : usd(diff)}
                    </td>
                  </>}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <div style={{ fontFamily:'var(--mono)', fontSize:10, color:'var(--mid)', marginTop:8, lineHeight:1.7 }}>
        How it's figured: crews of 7 for 2A-6A and 5 for six-man (1A). Game fee {usd(PAY.gameFee)} per official, the lowest gate band, since gate receipts aren't known.
        Up to 90 miles one way, each official gets the travel band ($20 up to 30 miles, $35 up to 60, $50 up to 90).
        Past 90 miles: {PAY.cars} cars paid ${PAY.perMile} a mile for the round trip (there and back), ${PAY.riderFee} for each rider, and the ${PAY.meal} playoff meal for every official.
        Miles are estimated: straight-line from the chapter's center city × 1.2 for roads. "Per school" assumes the two schools split the cost evenly.
        {showLocal && <> The venue's chapter is the home chapter of the school nearest the stadium; "Difference" is how much more the game cost than if that chapter had worked it.</>}
      </div>
    </div>
  )
}
