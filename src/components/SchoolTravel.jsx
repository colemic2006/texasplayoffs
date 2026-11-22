import React, { useEffect, useMemo, useState } from 'react'
import { ROAD_FACTOR, straightMiles } from '../chapterCenters'
import { placeName } from '../placeName'

// How far each school traveled to its playoff games: round trip from the school (its home stadium,
// or the middle of its town, as placed on the coverage map) to the game site, straight line × 1.2.
const ROUNDS = { 1: 'Bi-District', 2: 'Area', 3: 'Regionals', 4: 'Quarterfinals', 5: 'Semifinals', 6: 'State Final' }
const mi = n => `${Math.round(n).toLocaleString()} mi`

export default function SchoolTravel({ data }) {
  const [spots, setSpots] = useState(null)
  const [week, setWeek] = useState(null)   // a round number, or 'all'
  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}data/chapter_schools.json?v=${__BUILD_TIME__}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => setSpots(Object.fromEntries((d?.schools || []).map(s => [s.name, s]))))
      .catch(() => setSpots({}))
  }, [])

  // one entry per school per game
  const trips = useMemo(() => {
    if (!spots) return []
    const out = []
    for (const g of data?.games || []) {
      if (g.lat == null) continue
      for (const [team, opp] of [[g.team1, g.team2], [g.team2, g.team1]]) {
        const s = spots[team]
        if (!s) continue
        out.push({ team, opp, g, miles: 2 * ROAD_FACTOR * straightMiles(s.lat, s.lng, g.lat, g.lng) })
      }
    }
    return out
  }, [data, spots])
  const weeks = useMemo(() => [...new Set(trips.map(t => t.g.week))].sort((a, b) => a - b), [trips])
  useEffect(() => { if (week === null && weeks.length) setWeek(weeks[weeks.length - 1]) }, [weeks])
  const unplaced = useMemo(() => {
    if (!spots) return 0
    return new Set((data?.games || []).flatMap(g => [g.team1, g.team2]).filter(t => !spots[t])).size
  }, [data, spots])

  const rows = useMemo(() => {
    if (week === 'all') {
      const by = {}
      for (const t of trips) {
        const r = by[t.team] || (by[t.team] = { team: t.team, miles: 0, games: 0, trips: [] })
        r.miles += t.miles; r.games++; r.trips.push(t)
      }
      return Object.values(by).map(r => ({ ...r, avg: r.miles / r.games }))
    }
    return trips.filter(t => t.g.week === week).map(t => ({ team: t.team, miles: t.miles, games: 1, trips: [t], avg: t.miles }))
  }, [trips, week])
  if (!trips.length || week === null) return null

  const most = [...rows].sort((a, b) => b.miles - a.miles).slice(0, 10)
  // fewest miles: for all rounds, by average per game, so a school isn't "least traveled" just for losing early
  const least = [...rows].filter(r => week !== 'all' || r.games >= 2).sort((a, b) => a.avg - b.avg || a.team.localeCompare(b.team)).slice(0, 10)
  const home = rows.filter(r => r.avg < 10).length
  const avgAll = rows.reduce((s, r) => s + r.avg, 0) / (rows.length || 1)
  const btn = on => ({ fontFamily:'var(--mono)', fontSize:10, padding:'4px 10px', borderRadius:3, cursor:'pointer',
    border:`1px solid ${on ? 'var(--burnt)' : 'var(--border)'}`, background: on ? 'var(--burnt)' : 'transparent', color: on ? '#fff' : 'var(--mid)' })

  const List = ({ title, list, color, max }) => (
    <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:10, padding:'14px 16px', flex:'1 1 420px', minWidth:0 }}>
      <div style={{ fontFamily:'var(--mono)', fontSize:9, letterSpacing:'0.12em', textTransform:'uppercase', color:'var(--mid)', marginBottom:8 }}>{title}</div>
      {list.map((r, i) => {
        const t = r.trips[0]
        const detail = week === 'all'
          ? `${r.games} game${r.games === 1 ? '' : 's'} · ${mi(r.avg)} a game`
          : `v ${t.opp} · ${placeName(t.g)}`
        return (
          <div key={r.team + i} style={{ padding:'6px 0', borderBottom:'1px dashed var(--border)' }}>
            <div style={{ display:'flex', justifyContent:'space-between', gap:10, alignItems:'baseline' }}>
              <span style={{ fontSize:13, fontWeight:600 }}><span style={{ fontFamily:'var(--mono)', fontSize:10, color:'var(--mid)', marginRight:6 }}>{i + 1}</span>{r.team}
                <span style={{ fontWeight:400, color:'var(--mid)', fontSize:11 }}> · {t.g.classification}</span></span>
              <span style={{ fontFamily:'var(--mono)', fontSize:12, fontWeight:700, color, whiteSpace:'nowrap' }}>{mi(r.miles)}</span>
            </div>
            {max > 0 && <div style={{ height:5, borderRadius:3, background:color, opacity:0.75, width:`${Math.max(1, 100 * r.miles / max)}%`, margin:'4px 0 3px' }} />}
            <div style={{ fontSize:11, color:'var(--mid)' }}>{detail}</div>
          </div>
        )
      })}
    </div>
  )

  return (
    <div style={{ marginBottom:48 }}>
      <div style={{ fontFamily:'var(--mono)', fontSize:10, letterSpacing:'0.18em', textTransform:'uppercase', color:'var(--mid)', marginBottom:6 }}>Team Travel</div>
      <div style={{ fontFamily:"'Bebas Neue', sans-serif", fontSize:30, color:'var(--ink)', marginBottom:6, paddingBottom:12, borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', gap:12 }}>
        <div style={{ width:4, height:28, borderRadius:2, background:'var(--burnt)' }} />
        Who Traveled Farthest to Play
      </div>
      <div style={{ display:'flex', gap:4, flexWrap:'wrap', margin:'10px 0 8px' }}>
        {weeks.map(w => <button key={w} onClick={() => setWeek(w)} style={btn(week === w)}>{ROUNDS[w]}</button>)}
        {weeks.length > 1 && <button onClick={() => setWeek('all')} style={btn(week === 'all')}>All rounds</button>}
      </div>
      <div style={{ fontSize:13, color:'var(--mid)', lineHeight:1.55, margin:'4px 0 14px', maxWidth:820 }}>
        Round-trip miles each school traveled to its playoff game{week === 'all' ? 's, added up across every round played' : ` in the ${ROUNDS[week]} round`}.
        The average school traveled <strong style={{ color:'var(--ink)' }}>{mi(avgAll)}</strong>{week === 'all' ? ' a game' : ''};
        {' '}<strong style={{ color:'var(--ink)' }}>{home}</strong> of {rows.length} {week === 'all' ? 'schools averaged' : 'schools traveled'} under 10 miles, at or next to home.
      </div>
      <div style={{ display:'flex', gap:16, flexWrap:'wrap' }}>
        <List title={week === 'all' ? 'Most miles, all rounds' : 'Most miles'} list={most} color="var(--burnt)" max={most[0]?.miles || 0} />
        <List title={week === 'all' ? 'Fewest miles per game (2+ games)' : 'Fewest miles'} list={least} color="var(--sage)" max={0} />
      </div>
      <div style={{ fontFamily:'var(--mono)', fontSize:10, color:'var(--mid)', marginTop:8, lineHeight:1.6 }}>
        Estimated driving miles, round trip: straight-line distance from the school (its home stadium where known, otherwise the middle of its town) to the game site, × 1.2 for roads.
        Only games with a mapped site are counted.{unplaced > 0 && ` ${unplaced} schools couldn't be placed and aren't included.`}
        {week === 'all' && ' "Fewest miles" ranks by average per game among schools that played at least two playoff games.'}
      </div>
    </div>
  )
}
