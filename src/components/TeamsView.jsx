import React, { useMemo, useState, useEffect } from 'react'
import { useFinals } from '../finals'
import { useHomeChapters } from '../homeChapters'
import { placeName, gameWhen } from '../placeName'
import { ChangeBadge, ChangeDetail } from '../changes'

const KNOWN_CHAPTERS = new Set(['ABI','AMA','AUS','BEA','STX','COM','CSC','CTX','DAL','ELP','FTW','HOU','NTX','PBC','PVC','RGV','SAT','SAN','SFA','SPC','TYL','WAC'])   // not 'WACO': Waco is also a school (Waco High)
const BAD_NAMES = new Set(['total bracket counts','totals','total','bye','filler',''])

export function isValidTeam(name) {
  if (!name) return false
  const n = name.trim()
  if (!n) return false
  if (/^\d+$/.test(n)) return false
  if (KNOWN_CHAPTERS.has(n.toUpperCase())) return false
  if (BAD_NAMES.has(n.toLowerCase())) return false
  return true
}

const NAME_FIXES = {
  'Springlake Earth':       'Springlake-Earth',
  'Rockwall Heath':         'Rockwall-Heath',
  'Tuloso Midway':          'CC Tuloso-Midway',
  'Tuloso-Midway':          'CC Tuloso-Midway',
  'CC Tuloso Midway':       'CC Tuloso-Midway',
  'DeLeon':                 'De Leon',
  'Deleon':                 'De Leon',
  'LaPorte':                'La Porte',
  'Longview Pinetree':      'Longview Pine Tree',
  'Rock Springs':           'Rocksprings',
  'Mt. Enterprise':         'Mount Enterprise',
  'Spring  DeKaney':        'Spring DeKaney',
  'Spring Dekaney':         'Spring DeKaney',
  'Young Mens Leadership Academy': "Young Men's Leadership Academy",
  'Beevillle Jones':        'Beeville Jones',
  'Edinbug':                'Edinburg',
  'Edinburgh Vela':         'Edinburg Vela',
  'EP Bel Aire':            'EP Bel Air',
  'EP De Valle':            'EP Del Valle',
  'EP Frankin':             'EP Franklin',
  'EP Pebble Hlls':         'EP Pebble Hills',
  'Fannidel':               'Fannindel',
  'Fredricksburg':          'Fredericksburg',
  'FW Chisolm Trail':       'FW Chisholm Trail',
  'Humble Atascosita':      'Humble Atascocita',
  'Jourdantown':            'Jourdanton',
  'Regan County':           'Reagan County',
  'Rosebudd-Lott':          'Rosebud-Lott',
  'Waxahatchie':            'Waxahachie',
  'WF Hirshi':              'WF Hirschi',
  'Wolf City':              'Wolfe City',
  'Ridge Point':            'Fort Bend Ridge Point',
  'Wyatt':                  'Fort Worth Wyatt',
  'Maude':                  'Maud',
  'Gold-Burg':              'Goldburg',
}

export function canonicalize(name) {
  const n = name.trim()
  return NAME_FIXES[n] || n
}

const CHAPTER_NAMES = {
  ABI:'Abilene', AMA:'Amarillo', AUS:'Austin', BEA:'Beaumont', COM:'Commerce',
  CSC:'College Station', CTX:'Central Texas', DAL:'Dallas', ELP:'El Paso',
  ETX:'East Texas', FTW:'Fort Worth', HOU:'Houston', NTX:'North Texas',
  PBC:'Permian Basin', PVC:'Pecan Valley', RGV:'Rio Grande Valley', SAT:'San Antonio',
  SAN:'San Angelo', SFA:'Stephen F. Austin', SPC:'South Plains', STX:'South Texas',
  TYL:'Tyler', WAC:'Waco', WACO:'Waco',
}

function SectionLabel({ children }) {
  return (
    <div style={{ fontFamily:'var(--mono)', fontSize:10, letterSpacing:'0.18em', textTransform:'uppercase', color:'var(--mid)', marginBottom:6 }}>{children}</div>
  )
}

const RANK_COLORS = ['var(--burnt)', 'var(--gold)', 'var(--steel)', 'var(--mid)', 'var(--mid)']


export default function TeamsView({ allData, years }) {
  const homeCh = useHomeChapters()
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState('appearances')
  const [selectedTeam, setSelectedTeam] = useState(null)
  const [classFilter, setClassFilter] = useState('all')
  const [lbYear, setLbYear] = useState('all')
  const [homeStadiums, setHomeStadiums] = useState({})

  const finals = useFinals(allData, years)

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}data/home_stadiums.json?v=${__BUILD_TIME__}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setHomeStadiums(d.teams || {}) })
      .catch(() => {})
  }, [])

  const { teams, classifications } = useMemo(() => {
    const map = new Map()
    const classSet = new Set()

    for (const year of years) {
      const yearData = allData[year]
      if (!yearData?.games?.length) continue

      for (const game of yearData.games) {
        const cls = game.classification || ''
        classSet.add(cls)
        const chapter = game.chapter || ''

        if (!isValidTeam(game.team1) || !isValidTeam(game.team2)) continue

        for (const rawName of [game.team1, game.team2]) {
          if (!rawName) continue
          const key = canonicalize(rawName)
          if (!map.has(key)) {
            map.set(key, {
              name: key, yearSet: new Set(), totalGames: 0,
              chapters: new Map(), classSet: new Set(), yearGames: new Map()
            })
          }
          const t = map.get(key)
          t.yearSet.add(year)
          t.totalGames++
          t.classSet.add(cls)
          t.yearGames.set(year, (t.yearGames.get(year) || 0) + 1)
          if (chapter) t.chapters.set(chapter, (t.chapters.get(chapter) || 0) + 1)
        }
      }
    }

    const teams = Array.from(map.values()).map(t => ({
      name: t.name,
      appearances: t.yearSet.size,
      years: Array.from(t.yearSet).sort((a,b) => a - b),
      totalGames: t.totalGames,
      yearGames: Object.fromEntries(t.yearGames),
      chapters: Array.from(t.chapters.entries()).map(([ch, count]) => ({ ch, count })).sort((a,b) => b.count - a.count),
      classifications: Array.from(t.classSet).sort(),
    }))

    // schools on a chapter's home list that haven't made the playoffs in the seasons on the site
    for (const name of Object.keys(homeCh)) {
      if (map.has(name)) continue
      teams.push({ name, appearances: 0, years: [], totalGames: 0, yearGames: {}, chapters: [], classifications: [], noPlayoffs: true })
    }

    return { teams, classifications: Array.from(classSet).sort() }
  }, [allData, years, homeCh])

  // Leaderboard: top 10 by games for selected year
  const leaderboard = useMemo(() => {
    const loadedYears = years.filter(y => allData[y])
    if (lbYear === 'all') {
      return [...teams].sort((a, b) => b.totalGames - a.totalGames).slice(0, 10)
    }
    const yr = parseInt(lbYear)
    if (!allData[yr]) return []
    return [...teams]
      .filter(t => t.yearGames[yr] > 0)
      .sort((a, b) => (b.yearGames[yr] || 0) - (a.yearGames[yr] || 0))
      .slice(0, 10)
  }, [teams, lbYear, allData, years])

  const lbMax = leaderboard[0]
    ? (lbYear === 'all' ? leaderboard[0].totalGames : leaderboard[0].yearGames[parseInt(lbYear)] || 0)
    : 1

  const filtered = useMemo(() => {
    let result = teams
    if (classFilter !== 'all') result = result.filter(t => t.classifications.includes(classFilter))
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      result = result.filter(t => t.name.toLowerCase().includes(q))
    }
    result = [...result].sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name)
      if (sortBy === 'appearances') return b.appearances - a.appearances || b.totalGames - a.totalGames
      if (sortBy === 'games') return b.totalGames - a.totalGames || b.appearances - a.appearances
      return 0
    })
    return result
  }, [teams, search, sortBy, classFilter])

  const selected = selectedTeam ? teams.find(t => t.name === selectedTeam) : null
  const loadedYears = years.filter(y => allData[y])

  return (
    <div>
      <SectionLabel>04 · Teams</SectionLabel>
      <div style={{
        fontFamily:"'Bebas Neue', sans-serif", fontSize:30, letterSpacing:0.5,
        color:'var(--ink)', marginBottom:20, paddingBottom:12,
        borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', gap:12
      }}>
        <div style={{ width:4, height:28, borderRadius:2, background:'var(--burnt)', flexShrink:0 }} />
        Team Playoff History
      </div>

      {/* ── SEARCH / FILTER BAR ── */}
      <div style={{ display:'flex', gap:12, flexWrap:'wrap', marginBottom:12, alignItems:'center' }}>
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search teams…"
          style={{
            fontFamily:'var(--mono)', fontSize:11, padding:'7px 12px',
            border:'1px solid var(--border)', borderRadius:6, background:'var(--surface)',
            color:'var(--ink)', outline:'none', width:220,
          }}
        />
        <select
          value={classFilter}
          onChange={e => setClassFilter(e.target.value)}
          style={{
            fontFamily:'var(--mono)', fontSize:10, padding:'7px 10px',
            border:'1px solid var(--border)', borderRadius:6,
            background:'var(--surface)', color:'var(--mid)', cursor:'pointer'
          }}
        >
          <option value="all">All Classifications</option>
          {classifications.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <div style={{ display:'flex', gap:4, marginLeft:'auto' }}>
          {[['appearances','Appearances'],['games','Total Games'],['name','Name']].map(([key, label]) => (
            <button key={key} onClick={() => setSortBy(key)} style={{
              fontFamily:'var(--mono)', fontSize:9, letterSpacing:'0.1em',
              padding:'5px 10px', borderRadius:4, border:'1px solid var(--border)',
              background: sortBy === key ? 'var(--steel)' : 'transparent',
              color: sortBy === key ? '#fff' : 'var(--mid)', cursor:'pointer'
            }}>{label}</button>
          ))}
        </div>
      </div>

      {/* ── SEARCH RESULTS TABLE ── */}
      <div style={{ fontFamily:'var(--mono)', fontSize:10, color:'var(--mid)', marginBottom:12 }}>
        {filtered.length.toLocaleString()} team{filtered.length !== 1 ? 's' : ''}
        {search || classFilter !== 'all' ? ' matching filters' : ''}
      </div>

      <div style={{ display:'grid', gridTemplateColumns: selected ? '1fr 360px' : '1fr', gap:16, alignItems:'start', marginBottom:32 }}>
        <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:10, overflow:'hidden' }}>
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead>
              <tr style={{ background:'rgba(15,13,11,0.04)' }}>
                <th style={thStyle}>Team</th>
                <th style={thStyle}>Classification</th>
                <th style={thStyle}>Playoff Years</th>
                <th style={thStyle}>Total Games</th>
                <th style={{ ...thStyle, textAlign:'left' }}>Top Chapters</th>
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, 200).map(team => {
                const isSelected = selectedTeam === team.name
                return (
                  <tr key={team.name} onClick={() => setSelectedTeam(isSelected ? null : team.name)} style={{
                    borderBottom:'1px solid rgba(15,13,11,0.05)',
                    background: isSelected ? 'rgba(44,74,110,0.07)' : 'transparent',
                    cursor:'pointer', transition:'background 0.1s',
                  }}>
                    <td style={{ ...tdStyle, fontWeight: isSelected ? 600 : 400, color:'var(--ink)' }}>
                      {team.name}
                      {(() => { const w = (finals[team.name] || []).filter(f => f.won).length
                        return w ? <span title={`${w} state championship${w === 1 ? '' : 's'}`} style={{ marginLeft:6, fontSize:11, whiteSpace:'nowrap' }}>🏆{w > 1 ? <span style={{ fontFamily:'var(--mono)', fontSize:10, color:'var(--mid)' }}>×{w}</span> : null}</span> : null })()}
                    </td>
                    <td style={{ ...tdStyle, textAlign:'center' }}>
                      <span style={{ fontFamily:'var(--mono)', fontSize:9, color:'var(--steel)' }}>{team.classifications.join(', ')}</span>
                    </td>
                    <td style={{ ...tdStyle, textAlign:'center' }}>
                      <span style={{ fontFamily:"'Bebas Neue', sans-serif", fontSize:18, color: team.appearances >= 4 ? 'var(--burnt)' : team.appearances >= 2 ? 'var(--gold)' : 'var(--mid)' }}>{team.appearances}</span>
                      <span style={{ fontFamily:'var(--mono)', fontSize:9, color:'var(--mid)', marginLeft:4 }}>{team.years.length ? `(${team.years.join(', ')})` : '(not in the playoffs yet)'}</span>
                    </td>
                    <td style={{ ...tdStyle, textAlign:'center', fontFamily:"'Bebas Neue', sans-serif", fontSize:18, color:'var(--ink)' }}>{team.totalGames}</td>
                    <td style={tdStyle}>
                      {team.chapters.length > 0 ? (
                        <div style={{ display:'flex', flexDirection:'column', gap:2 }}>
                          {team.chapters.slice(0, 3).map(({ ch, count }) => (
                            <span key={ch} style={{ fontFamily:'var(--mono)', fontSize:9, whiteSpace:'nowrap' }}>
                              <span style={{ color:'var(--steel)' }}>{ch}</span>
                              <span style={{ color:'var(--mid)', marginLeft:4 }}>({count})</span>
                            </span>
                          ))}
                        </div>
                      ) : '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {filtered.length > 200 && (
            <div style={{ padding:'10px 16px', fontFamily:'var(--mono)', fontSize:9, color:'var(--mid)', borderTop:'1px solid var(--border)' }}>
              Showing first 200 of {filtered.length.toLocaleString()} — refine your search to narrow results
            </div>
          )}
        </div>

        {/* Team detail panel */}
        {selected && (
          <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:10, overflow:'hidden', position:'sticky', top:70 }}>
            <div style={{ padding:'16px 18px', borderBottom:'1px solid var(--border)' }}>
              <div style={{ fontFamily:'var(--mono)', fontSize:9, letterSpacing:'0.14em', textTransform:'uppercase', color:'var(--mid)', marginBottom:4 }}>Team Detail</div>
              <div style={{ fontFamily:"'Bebas Neue', sans-serif", fontSize:22, color:'var(--ink)', letterSpacing:0.5 }}>{selected.name}</div>
              <div style={{ fontFamily:'var(--mono)', fontSize:10, color:'var(--steel)', marginTop:2 }}>{selected.classifications.join(' · ')}</div>
              {homeStadiums[selected.name] && (() => {
                const h = homeStadiums[selected.name]
                return (
                  <div style={{ fontSize:12, color:'var(--mid)', marginTop:6 }}>
                    Home stadium:{' '}
                    <a href={h.map_link || `https://texasbob.com/stadium/stadium.php?id=${h.stadium_id}`} target="_blank" rel="noopener noreferrer" style={{ color:'var(--ink)' }}>{h.stadium}</a>
                    {h.city ? `, ${h.city}` : ''}{h.capacity ? ` · ${h.capacity.toLocaleString()} seats` : ''}
                  </div>
                )
              })()}
            </div>
            {selected.noPlayoffs && (
              <div style={{ padding:'14px 18px', borderBottom:'1px solid var(--border)', fontSize:13, color:'var(--mid)', lineHeight:1.5 }}>
                {selected.name} hasn't made the playoffs in the seasons on this site
                ({years.filter(y => allData[y]?.games?.length).sort((a, b) => a - b).join(', ')}).
                Its games, chapters and history will fill in here if it does.
              </div>
            )}
            {(() => {
              // this season's games (the newest season on the site): matchup, chapter, site, kickoff
              const yr = Math.max(...years.filter(y => allData[y]?.games?.length))
              const inProg = allData[yr]?.season?.status === 'in_progress'
              const ROUNDS = { 1:'Bi-District', 2:'Area', 3:'Regionals', 4:'Quarterfinals', 5:'Semifinals', 6:'Championship' }
              const mine = (allData[yr]?.games || [])
                .filter(g => canonicalize(g.team1) === selected.name || canonicalize(g.team2) === selected.name)
                .sort((a, b) => b.week - a.week)
              if (!mine.length) return null
              return (
                <div style={{ padding:'12px 18px', borderBottom:'1px solid var(--border)', background:'rgba(70,29,124,0.04)' }}>
                  <div style={{ fontFamily:'var(--mono)', fontSize:9, letterSpacing:'0.14em', textTransform:'uppercase', color:'var(--burnt)', marginBottom:8 }}>
                    {yr} Playoffs{inProg ? ' · in progress' : ''}
                  </div>
                  {mine.map((g, i) => {
                    const opp = canonicalize(g.team1) === selected.name ? g.team2 : g.team1
                    const me = canonicalize(g.team1) === selected.name ? [g.score1, g.score2] : [g.score2, g.score1]
                    const res = me[0] != null && me[1] != null ? `${me[0] > me[1] ? 'W' : me[0] < me[1] ? 'L' : 'T'} ${me[0]}–${me[1]}` : null
                    return (
                      <div key={i} style={{ padding:'6px 0', borderTop: i ? '1px solid rgba(15,13,11,0.06)' : 'none' }}>
                        <div style={{ fontFamily:'var(--mono)', fontSize:9, color:'var(--mid)', textTransform:'uppercase', letterSpacing:'0.1em' }}>
                          {ROUNDS[g.week] || `Week ${g.week}`} · {g.classification}
                        </div>
                        <div style={{ fontSize:14, color:'var(--ink)', marginTop:2 }}>
                          vs <strong>{opp}</strong>{res && <span style={{ fontFamily:'var(--mono)', fontSize:11, marginLeft:8 }}>{res}</span>}
                        </div>
                        <div style={{ fontSize:12, color:'var(--mid)', marginTop:2 }}>
                          Chapter: <strong style={{ color: g.chapter ? 'var(--burnt)' : 'var(--mid)' }}>{g.chapter ? `${CHAPTER_NAMES[g.chapter] || g.chapter} (${g.chapter})` : 'not assigned yet'}</strong>
                        </div>
                        <div style={{ fontSize:12, color:'var(--mid)', marginTop:1 }}>
                          {g.site
                            ? (g.map_link || g.lat != null)
                              ? <a href={g.map_link || `https://www.google.com/maps?q=${g.lat},${g.lng}`} target="_blank" rel="noopener noreferrer" style={{ color:'var(--ink)' }}>{placeName(g)}</a>
                              : placeName(g)
                            : 'Site TBD'}
                          {' · '}{g.date ? gameWhen(g) : 'Date TBD'}
                          {' '}<ChangeBadge game={g} />
                        </div>
                        <ChangeDetail game={g} />
                      </div>
                    )
                  })}
                </div>
              )
            })()}
            {(() => {
              // home chapter (owner's lists) beside the chapter that has worked the most of their games
              const topCount = selected.chapters[0]?.count || 0
              const favs = topCount ? selected.chapters.filter(c => c.count === topCount) : []
              const home = homeCh[selected.name]
              const lbl = { fontFamily:'var(--mono)', fontSize:9, letterSpacing:'0.14em', textTransform:'uppercase', color:'var(--mid)', marginBottom:8 }
              const big = { fontFamily:"'Bebas Neue', sans-serif", fontSize:24, color:'var(--burnt)', lineHeight:1 }
              return (
                <div style={{ padding:'12px 18px', borderBottom:'1px solid var(--border)', background:'rgba(253,208,35,0.04)',
                              display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
                  <div>
                    <div style={lbl}>Home Chapter</div>
                    {home ? (
                      <>
                        <div style={big}>{CHAPTER_NAMES[home] || home}</div>
                        <div style={{ fontFamily:'var(--mono)', fontSize:10, color:'var(--mid)', marginTop:1 }}>{home}</div>
                      </>
                    ) : <div style={{ fontSize:12, color:'var(--mid)' }}>Not on file yet</div>}
                  </div>
                  <div style={{ borderLeft:'1px solid var(--border)', paddingLeft:14 }}>
                    <div style={lbl}>Favorite Chapter{favs.length > 1 ? 's' : ''}</div>
                    {favs.length ? favs.map(fav => (
                      <div key={fav.ch} style={{ display:'flex', alignItems:'flex-end', justifyContent:'space-between', gap:8, marginBottom:4 }}>
                        <div>
                          <div style={big}>{CHAPTER_NAMES[fav.ch] || fav.ch}</div>
                          <div style={{ fontFamily:'var(--mono)', fontSize:10, color:'var(--mid)', marginTop:1 }}>{fav.ch}</div>
                        </div>
                        <div style={{ textAlign:'right' }}>
                          <div style={{ fontFamily:"'Bebas Neue', sans-serif", fontSize:30, color:'var(--burnt)', lineHeight:1 }}>{fav.count}</div>
                          <div style={{ fontFamily:'var(--mono)', fontSize:9, color:'var(--mid)' }}>games</div>
                        </div>
                      </div>
                    )) : <div style={{ fontSize:12, color:'var(--mid)' }}>None recorded</div>}
                  </div>
                </div>
              )
            })()}
            {(finals[selected.name] || []).length > 0 && (() => {
              const f = finals[selected.name], won = f.filter(x => x.won), lost = f.filter(x => !x.won)
              const chip = (x, i) => (
                <span key={i} title={`${x.year} ${x.cls} final vs ${x.opp}`} style={{
                  fontFamily:'var(--mono)', fontSize:10, padding:'3px 8px', borderRadius:4,
                  background: x.won ? 'rgba(253,208,35,0.25)' : 'rgba(15,13,11,0.05)', color:'var(--ink)',
                  border: x.won ? '1px solid rgba(201,154,30,0.5)' : '1px solid var(--border)',
                }}>{x.year} <span style={{ color:'var(--mid)' }}>{x.cls}</span></span>
              )
              return (
                <div style={{ padding:'12px 18px', borderBottom:'1px solid var(--border)' }}>
                  <div style={{ fontFamily:'var(--mono)', fontSize:9, letterSpacing:'0.14em', textTransform:'uppercase', color:'var(--mid)', marginBottom:8 }}>
                    🏆 State Championships · {won.length}
                  </div>
                  {won.length ? <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>{won.map(chip)}</div>
                    : <div style={{ fontSize:12, color:'var(--mid)' }}>None on record</div>}
                  {lost.length > 0 && (
                    <>
                      <div style={{ fontFamily:'var(--mono)', fontSize:9, letterSpacing:'0.14em', textTransform:'uppercase', color:'var(--mid)', margin:'10px 0 6px' }}>
                        State final runner-up · {lost.length}
                      </div>
                      <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>{lost.map(chip)}</div>
                    </>
                  )}
                </div>
              )
            })()}
            <div style={{ padding:'14px 18px', borderBottom:'1px solid var(--border)', display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
              <Stat label="Playoff Appearances" value={selected.appearances} color="var(--burnt)" />
              <Stat label="Total Games Played" value={selected.totalGames} color="var(--ink)" />
              <div style={{ gridColumn:'1/-1' }}>
                <div style={{ fontFamily:'var(--mono)', fontSize:9, letterSpacing:'0.1em', textTransform:'uppercase', color:'var(--mid)', marginBottom:4 }}>Years Active</div>
                <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                  {selected.years.map(y => (
                    <span key={y} style={{ fontFamily:'var(--mono)', fontSize:10, padding:'2px 8px', borderRadius:3, background:'rgba(44,74,110,0.1)', color:'var(--steel)' }}>
                      {y} <span style={{ color:'var(--mid)' }}>({selected.yearGames[y] || 0}g)</span>
                    </span>
                  ))}
                </div>
              </div>
            </div>
            <div style={{ padding:'14px 18px' }}>
              <div style={{ fontFamily:'var(--mono)', fontSize:9, letterSpacing:'0.14em', textTransform:'uppercase', color:'var(--mid)', marginBottom:12 }}>
                Chapter Affinity <span style={{ opacity:0.5, fontWeight:400 }}>— cumulative game assignments</span>
              </div>
              {selected.chapters.length === 0 ? (
                <div style={{ color:'var(--mid)', fontSize:12 }}>No chapter data available.</div>
              ) : (() => {
                const chapterTotal = selected.chapters.reduce((s, c) => s + c.count, 0)
                const unassigned = selected.totalGames - chapterTotal
                const rows = [...selected.chapters]
                if (unassigned > 0) rows.push({ ch: null, count: unassigned })
                return (
                  <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                    {rows.map(({ ch, count }, i) => {
                      const pct = selected.totalGames > 0 ? (count / selected.totalGames) * 100 : 0
                      const barColor = ch === null ? 'rgba(15,13,11,0.2)' : i === 0 ? 'var(--burnt)' : i === 1 ? 'var(--gold)' : 'var(--steel)'
                      return (
                        <div key={ch ?? '__unassigned'}>
                          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:4 }}>
                            <div>
                              <span style={{ fontFamily:'var(--mono)', fontSize:11, fontWeight:500, color: ch === null ? 'var(--mid)' : 'var(--ink)' }}>
                                {ch === null ? 'Unassigned' : (CHAPTER_NAMES[ch] || ch)}
                              </span>
                              {ch !== null && <span style={{ fontFamily:'var(--mono)', fontSize:9, color:'var(--mid)', marginLeft:6 }}>{ch}</span>}
                            </div>
                            <div style={{ display:'flex', alignItems:'baseline', gap:6 }}>
                              <span style={{ fontFamily:"'Bebas Neue', sans-serif", fontSize:18, color: barColor, lineHeight:1 }}>{count}</span>
                              <span style={{ fontFamily:'var(--mono)', fontSize:9, color:'var(--mid)' }}>{pct.toFixed(0)}%</span>
                            </div>
                          </div>
                          <div style={{ height:6, background:'rgba(15,13,11,0.08)', borderRadius:3, overflow:'hidden' }}>
                            <div style={{ height:'100%', width:`${pct}%`, background: barColor, borderRadius:3, transition:'width 0.3s' }} />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )
              })()}
            </div>
          </div>
        )}
      </div>

      {/* ── LEADERBOARD ── */}
      <div style={{ marginBottom:32 }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
          <div style={{ fontFamily:'var(--mono)', fontSize:9, letterSpacing:'0.14em', textTransform:'uppercase', color:'var(--mid)' }}>
            Top Teams by Playoff Games
          </div>
          <div style={{ display:'flex', gap:4 }}>
            {['all', ...loadedYears.map(String)].map(y => {
              const inactive = ['2010'].includes(y)
              return (
                <button key={y} onClick={() => !inactive && setLbYear(y)} title={inactive ? 'Coming soon — no data yet' : undefined} style={{
                  fontFamily:'var(--mono)', fontSize:9, letterSpacing:'0.08em',
                  padding:'3px 10px', borderRadius:3, border:'1px solid var(--border)',
                  background: lbYear === y ? 'var(--ink)' : 'transparent',
                  color: lbYear === y ? 'var(--cream)' : 'var(--mid)',
                  cursor: inactive ? 'not-allowed' : 'pointer',
                  opacity: inactive ? 0.35 : 1, transition:'all 0.15s'
                }}>{y === 'all' ? 'All Years' : y}</button>
              )
            })}
          </div>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(300px, 1fr))', gap:8 }}>
          {leaderboard.map((team, i) => {
            const games = lbYear === 'all' ? team.totalGames : (team.yearGames[parseInt(lbYear)] || 0)
            const pct = lbMax > 0 ? (games / lbMax) * 100 : 0
            const isSelected = selectedTeam === team.name
            return (
              <div key={team.name} onClick={() => setSelectedTeam(isSelected ? null : team.name)} style={{
                background: isSelected ? 'rgba(44,74,110,0.07)' : 'var(--surface)',
                border: `1px solid ${isSelected ? 'var(--steel)' : 'var(--border)'}`,
                borderRadius:8, padding:'10px 14px', cursor:'pointer', transition:'all 0.15s'
              }}>
                <div style={{ display:'flex', alignItems:'baseline', justifyContent:'space-between', marginBottom:6 }}>
                  <div style={{ display:'flex', alignItems:'baseline', gap:8 }}>
                    <span style={{ fontFamily:"'Bebas Neue', sans-serif", fontSize:20, color: RANK_COLORS[Math.min(i, RANK_COLORS.length - 1)], lineHeight:1 }}>#{i + 1}</span>
                    <span style={{ fontFamily:'DM Sans', fontSize:13, fontWeight:500, color:'var(--ink)' }}>{team.name}</span>
                  </div>
                  <span style={{ fontFamily:"'Bebas Neue', sans-serif", fontSize:22, color:'var(--ink)', lineHeight:1 }}>{games}</span>
                </div>
                <div style={{ height:4, background:'rgba(15,13,11,0.08)', borderRadius:2, overflow:'hidden', marginBottom:5 }}>
                  <div style={{ height:'100%', width:`${pct}%`, background: i === 0 ? 'var(--burnt)' : i === 1 ? 'var(--gold)' : 'var(--steel)', borderRadius:2, transition:'width 0.3s' }} />
                </div>
                <div style={{ display:'flex', justifyContent:'space-between' }}>
                  <span style={{ fontFamily:'var(--mono)', fontSize:9, color:'var(--mid)' }}>{team.classifications.join(' · ')}</span>
                  <span style={{ fontFamily:'var(--mono)', fontSize:9, color:'var(--mid)' }}>
                    {lbYear === 'all' ? `${team.appearances} yr${team.appearances !== 1 ? 's' : ''}` : team.chapters[0] ? team.chapters[0].ch : ''}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function Stat({ label, value, color }) {
  return (
    <div>
      <div style={{ fontFamily:'var(--mono)', fontSize:9, letterSpacing:'0.1em', textTransform:'uppercase', color:'var(--mid)', marginBottom:2 }}>{label}</div>
      <div style={{ fontFamily:"'Bebas Neue', sans-serif", fontSize:28, color: color || 'var(--ink)' }}>{value}</div>
    </div>
  )
}

const thStyle = {
  textAlign:'center', padding:'9px 12px',
  fontFamily:'var(--mono)', fontSize:9, letterSpacing:'0.12em',
  textTransform:'uppercase', color:'var(--mid)',
  borderBottom:'1px solid var(--border)', whiteSpace:'nowrap'
}

const tdStyle = { padding:'8px 12px', verticalAlign:'middle', fontSize:12 }
