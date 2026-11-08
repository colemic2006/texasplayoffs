import React, { useState, useMemo, useEffect } from 'react'
import { GameMap } from './BracketViewer'

const ROUND_NAMES = { 1:'Bi-District', 2:'Area', 3:'Regionals', 4:'Quarterfinals', 5:'Semifinals', 6:'Championship' }

// Texas map with a pin for each playoff game site in the chosen week (sites placed by scripts/season.py)
export default function WeekMap({ data }) {
  const games = data?.games || []
  const weeks = useMemo(() => [...new Set(games.map(g => g.week))].sort((a, b) => a - b), [games])
  const [week, setWeek] = useState(null)
  const [chapter, setChapter] = useState('all')   // 'all', 'none' (unassigned) or a chapter code

  // open on the latest week that has games
  useEffect(() => { setWeek(weeks.length ? weeks[weeks.length - 1] : null) }, [weeks])

  const allWeekGames = games.filter(g => g.week === week)
  const chapters = useMemo(() => {
    const n = {}
    allWeekGames.forEach(g => { if (g.chapter) n[g.chapter] = (n[g.chapter] || 0) + 1 })
    return Object.entries(n).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
  }, [week, games])
  // keep the chapter picked when changing weeks only if it works that week too
  useEffect(() => {
    if (chapter !== 'all' && chapter !== 'none' && !chapters.some(([c]) => c === chapter)) setChapter('all')
  }, [chapters])

  const weekGames = allWeekGames.filter(g =>
    chapter === 'all' || (chapter === 'none' ? !g.chapter : g.chapter === chapter))
  const markers = useMemo(() => weekGames
    .filter(g => g.lat != null && g.lng != null)
    .map(g => ({ lat: g.lat, lng: g.lng, game: g,
                 stadium: { name: g.stadium || g.site, city: g.city || '', map_link: g.map_link } })),
    [week, games, chapter])

  const chip = active => ({
    fontFamily:'var(--mono)', fontSize:9, letterSpacing:'0.08em', padding:'4px 10px', borderRadius:3,
    border:'1px solid var(--border)', cursor:'pointer',
    background: active ? 'var(--burnt)' : 'transparent', color: active ? '#fff' : 'var(--mid)'
  })
  const unassigned = allWeekGames.filter(g => !g.chapter).length

  if (!weeks.length) return null
  return (
    <div style={{ marginBottom:40 }}>
      <div style={{ display:'flex', alignItems:'baseline', justifyContent:'space-between', flexWrap:'wrap', gap:8, marginBottom:10 }}>
        <div>
          <div style={{ fontFamily:'var(--mono)', fontSize:10, letterSpacing:'0.18em', textTransform:'uppercase', color:'var(--mid)', marginBottom:4 }}>
            This Week's Game Sites
          </div>
          <div style={{ fontFamily:"'Bebas Neue', sans-serif", fontSize:26, color:'var(--ink)' }}>
            {ROUND_NAMES[week]}{chapter === 'all' ? '' : chapter === 'none' ? ' · Unassigned' : ` · ${chapter}`} · {markers.length} of {weekGames.length} sites on the map
          </div>
        </div>
        <div style={{ display:'flex', gap:4 }}>
          {weeks.map(w => (
            <button key={w} onClick={() => setWeek(w)} style={{
              fontFamily:'var(--mono)', fontSize:9, letterSpacing:'0.08em', padding:'4px 10px', borderRadius:3,
              border:'1px solid var(--border)', cursor:'pointer',
              background: week === w ? 'var(--ink)' : 'transparent', color: week === w ? 'var(--cream)' : 'var(--mid)'
            }}>{ROUND_NAMES[w]}</button>
          ))}
        </div>
      </div>
      <div style={{ display:'flex', alignItems:'center', gap:4, flexWrap:'wrap', marginBottom:10 }}>
        <span style={{ fontFamily:'var(--mono)', fontSize:9, letterSpacing:'0.14em', textTransform:'uppercase', color:'var(--mid)', marginRight:4 }}>Chapter:</span>
        <button onClick={() => setChapter('all')} style={chip(chapter === 'all')}>All</button>
        {unassigned > 0 && <button onClick={() => setChapter('none')} style={chip(chapter === 'none')}>Unassigned ({unassigned})</button>}
        {chapters.map(([c, n]) => (
          <button key={c} onClick={() => setChapter(c)} style={chip(chapter === c)}>{c} ({n})</button>
        ))}
      </div>
      <div style={{ borderRadius:10, overflow:'hidden', border:'1px solid var(--border)', height:440 }}>
        {markers.length
          ? <GameMap key={`${week}-${chapter}`} markers={markers} />
          : <div style={{ height:'100%', display:'flex', alignItems:'center', justifyContent:'center', background:'var(--surface)',
                          fontFamily:'var(--mono)', fontSize:11, color:'var(--mid)', textAlign:'center', padding:'0 16px' }}>
              {chapter === 'all' || chapter === 'none'
                ? 'Game sites appear here as they are announced, usually early in the week.'
                : `None of ${chapter}'s games this week has a site announced yet.`}
            </div>}
      </div>
      {markers.length > 0 && (
        <div style={{ display:'flex', gap:14, flexWrap:'wrap', fontFamily:'var(--mono)', fontSize:10, color:'var(--mid)', marginTop:6 }}>
          <span><span style={{ display:'inline-block', width:9, height:9, borderRadius:'50%', background:'#c1440e', marginRight:5 }} />Chapter assigned</span>
          <span><span style={{ display:'inline-block', width:9, height:9, borderRadius:'50%', background:'#2c4a6e', marginRight:5 }} />Not assigned yet</span>
          {markers.length < weekGames.length && (
            <span>{weekGames.length - markers.length} games don't have a site announced yet; pins are added daily as they are.</span>
          )}
        </div>
      )}
    </div>
  )
}
