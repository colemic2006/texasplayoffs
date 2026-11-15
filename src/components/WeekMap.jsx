import React, { useState, useMemo, useEffect } from 'react'
import { GameMap } from './BracketViewer'
import { UNASSIGNED, colorFor } from '../chapterColors'

const ROUND_NAMES = { 1:'Bi-District', 2:'Area', 3:'Regionals', 4:'Quarterfinals', 5:'Semifinals', 6:'Championship' }
const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
// game day as a local date (dates are stored 'YYYY-MM-DD'); 'tbd' when no date is set yet
const dayKey = g => (g.date && /^\d{4}-\d{2}-\d{2}/.test(g.date)) ? g.date.slice(0, 10) : 'tbd'
const dayLabel = k => {
  if (k === 'tbd') return 'Date TBD'
  const [y, m, d] = k.split('-').map(Number)
  return `${DOW[new Date(y, m - 1, d).getDay()]} ${m}/${d}`
}

// Texas map with a pin for each playoff game site in the chosen week (sites placed by scripts/season.py).
// Chapters can be combined (e.g. ABI + unassigned + PBC) to see who is working nearby.
export default function WeekMap({ data }) {
  const games = data?.games || []
  const weeks = useMemo(() => [...new Set(games.map(g => g.week))].sort((a, b) => a - b), [games])
  const [week, setWeek] = useState(null)
  const [picked, setPicked] = useState([])   // chapter codes and/or 'none' (unassigned); empty = all
  const [day, setDay] = useState('all')       // 'all', a 'YYYY-MM-DD' game date, or 'tbd'

  // open on the latest week that has games
  useEffect(() => { setWeek(weeks.length ? weeks[weeks.length - 1] : null) }, [weeks])

  const roundGames = games.filter(g => g.week === week)
  // game days this week (Thu/Fri/Sat usually), in date order, with TBD last
  const days = useMemo(() => {
    const n = {}
    roundGames.forEach(g => { const k = dayKey(g); n[k] = (n[k] || 0) + 1 })
    return Object.entries(n).sort((a, b) => a[0] === 'tbd' ? 1 : b[0] === 'tbd' ? -1 : a[0].localeCompare(b[0]))
  }, [week, games])
  useEffect(() => { if (day !== 'all' && !days.some(([k]) => k === day)) setDay('all') }, [days])
  const allWeekGames = day === 'all' ? roundGames : roundGames.filter(g => dayKey(g) === day)
  const chapters = useMemo(() => {
    const n = {}
    allWeekGames.forEach(g => { if (g.chapter) n[g.chapter] = (n[g.chapter] || 0) + 1 })
    return Object.entries(n).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
  }, [week, games, day])
  const unassigned = allWeekGames.filter(g => !g.chapter).length

  // keep picks that still exist when changing weeks
  useEffect(() => {
    setPicked(p => p.filter(c => c === 'none' ? unassigned > 0 : chapters.some(([k]) => k === c)))
  }, [chapters])

  const toggle = c => setPicked(p => p.includes(c) ? p.filter(x => x !== c) : [...p, c])
  // a chapter keeps its color while it stays picked
  const colorOf = c => colorFor(picked, c)

  const weekGames = picked.length
    ? allWeekGames.filter(g => picked.includes(g.chapter || 'none'))
    : allWeekGames
  const markers = useMemo(() => weekGames
    .filter(g => g.lat != null && g.lng != null)
    .map(g => ({ lat: g.lat, lng: g.lng, game: g,
                 color: colorOf(g.chapter || 'none'),
                 stadium: { name: g.stadium || g.site, city: g.city || '', map_link: g.map_link } })),
    [week, games, picked, day])

  const chip = (active, color) => ({
    fontFamily:'var(--mono)', fontSize:9, letterSpacing:'0.08em', padding:'4px 10px', borderRadius:3,
    border: `1px solid ${active && color ? color : 'var(--border)'}`, cursor:'pointer',
    background: active ? (color || 'var(--ink)') : 'transparent', color: active ? '#fff' : 'var(--mid)'
  })
  const dot = color => <span style={{ display:'inline-block', width:9, height:9, borderRadius:'50%', background:color, marginRight:5 }} />
  const label = c => c === 'none' ? 'Unassigned' : c
  const onMap = c => markers.filter(m => (m.game.chapter || 'none') === c).length
  const inWeek = c => allWeekGames.filter(g => (g.chapter || 'none') === c).length

  if (!weeks.length) return null
  return (
    <div style={{ marginBottom:40 }}>
      <div style={{ display:'flex', alignItems:'baseline', justifyContent:'space-between', flexWrap:'wrap', gap:8, marginBottom:10 }}>
        <div>
          <div style={{ fontFamily:'var(--mono)', fontSize:10, letterSpacing:'0.18em', textTransform:'uppercase', color:'var(--mid)', marginBottom:4 }}>
            This Week's Game Sites
          </div>
          <div style={{ fontFamily:"'Bebas Neue', sans-serif", fontSize:26, color:'var(--ink)' }}>
            {ROUND_NAMES[week]} · Week {week}{day !== 'all' ? ` · ${dayLabel(day)}` : ''}{picked.length ? ` · ${picked.map(label).join(' + ')}` : ''} · {markers.length} of {weekGames.length} sites on the map
          </div>
        </div>
        <div style={{ display:'flex', gap:4 }}>
          {weeks.map(w => (
            <button key={w} onClick={() => { setWeek(w); setDay('all') }} style={chip(week === w)}>{ROUND_NAMES[w]}</button>
          ))}
        </div>
      </div>
      <div style={{ display:'flex', alignItems:'center', gap:4, flexWrap:'wrap', marginBottom:10 }}>
        <span style={{ fontFamily:'var(--mono)', fontSize:9, letterSpacing:'0.14em', textTransform:'uppercase', color:'var(--mid)', marginRight:4 }}>
          Chapters <span style={{ textTransform:'none', letterSpacing:0 }}>(pick one or more)</span>:
        </span>
        <button onClick={() => setPicked([])} style={chip(!picked.length, 'var(--burnt)')}>All</button>
        {unassigned > 0 && (
          <button onClick={() => toggle('none')} style={chip(picked.includes('none'), UNASSIGNED)}>Unassigned ({unassigned})</button>
        )}
        {chapters.map(([c, n]) => (
          <button key={c} onClick={() => toggle(c)} style={{ ...chip(picked.includes(c), colorOf(c)), display:'inline-flex', alignItems:'center' }}>
            <span style={{ width:8, height:8, borderRadius:'50%', background:colorOf(c), marginRight:5, boxShadow: picked.includes(c) ? '0 0 0 1px #fff' : 'none' }} />{c} ({n})
          </button>
        ))}
      </div>
      {days.length > 1 && (
        <div style={{ display:'flex', alignItems:'center', gap:4, flexWrap:'wrap', marginBottom:10 }}>
          <span style={{ fontFamily:'var(--mono)', fontSize:9, letterSpacing:'0.14em', textTransform:'uppercase', color:'var(--mid)', marginRight:4 }}>Game day:</span>
          <button onClick={() => setDay('all')} style={chip(day === 'all', 'var(--burnt)')}>All days ({roundGames.length})</button>
          {days.map(([k, n]) => (
            <button key={k} onClick={() => setDay(k)} style={chip(day === k, 'var(--ink)')}>{dayLabel(k)} ({n})</button>
          ))}
        </div>
      )}
      <div style={{ borderRadius:10, overflow:'hidden', border:'1px solid var(--border)', height:440 }}>
        {markers.length
          ? <GameMap key={`${week}-${day}-${picked.join(',')}`} markers={markers} />
          : <div style={{ height:'100%', display:'flex', alignItems:'center', justifyContent:'center', background:'var(--surface)',
                          fontFamily:'var(--mono)', fontSize:11, color:'var(--mid)', textAlign:'center', padding:'0 16px' }}>
              {picked.length || day !== 'all'
                ? 'None of these games has a site announced yet.'
                : 'Game sites appear here as they are announced, usually early in the week.'}
            </div>}
      </div>
      {markers.length > 0 && (
        <div style={{ display:'flex', gap:14, flexWrap:'wrap', fontFamily:'var(--mono)', fontSize:10, color:'var(--mid)', marginTop:6 }}>
          {picked.length
            ? picked.map(c => <span key={c}>{dot(colorOf(c))}{label(c)} · {onMap(c)} of {inWeek(c)} on the map</span>)
            : <>
                <span>Pin colors match the chapter buttons above</span>
                <span>{dot(UNASSIGNED)}Not assigned yet</span>
              </>}
          {markers.length < weekGames.length && (
            <span>{weekGames.length - markers.length} games don't have a site announced yet; pins are added daily as they are.
              {day === 'tbd' && ' Schools usually announce the site and kickoff together, so most Date TBD games get their pin when they move to a game day.'}</span>
          )}
        </div>
      )}
    </div>
  )
}
