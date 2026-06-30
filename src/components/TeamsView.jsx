import React, { useMemo, useState } from 'react'

const KNOWN_CHAPTERS = new Set(['ABI','AMA','AUS','BEA','STX','COM','CSC','CTX','DAL','ELP','FTW','HOU','NTX','PBC','PVC','RGV','SAT','SAN','SFA','SPC','TYL','WAC','WACO'])
const BAD_NAMES = new Set(['total bracket counts','totals','total','bye','filler',''])

function isValidTeam(name) {
  if (!name) return false
  const n = name.trim()
  if (!n) return false
  if (/^\d+$/.test(n)) return false        // pure number
  if (KNOWN_CHAPTERS.has(n.toUpperCase())) return false  // chapter code
  if (BAD_NAMES.has(n.toLowerCase())) return false
  return true
}

// Maps variant spellings → canonical school name
const NAME_FIXES = {
  // Hyphen normalization
  'Springlake Earth':       'Springlake-Earth',
  'Rockwall Heath':         'Rockwall-Heath',
  'Tuloso Midway':          'CC Tuloso-Midway',
  'Tuloso-Midway':          'CC Tuloso-Midway',
  'CC Tuloso Midway':       'CC Tuloso-Midway',
  // Space / capitalization
  'Deleon':                 'De Leon',
  'LaPorte':                'La Porte',
  'Longview Pinetree':      'Longview Pine Tree',
  'Rock Springs':           'Rocksprings',
  'Mt. Enterprise':         'Mount Enterprise',
  'Spring  DeKaney':        'Spring DeKaney',
  'Spring Dekaney':         'Spring DeKaney',
  // Apostrophe
  'Young Mens Leadership Academy': "Young Men's Leadership Academy",
  // Typos
  'Beevillle Jones':        'Beeville Jones',
  'Edinbug':                'Edinburg',
  'Edinburgh Vela':         'Edinburg Vela',
  'El Dorado':              'Eldorado',
  'El Paso Bel Aire':       'El Paso Bel Air',
  'El Paso De Valle':       'El Paso Del Valle',
  'El Paso Frankin':        'El Paso Franklin',
  'El Paso Pebble Hlls':    'El Paso Pebble Hills',
  'Fannidel':               'Fannindel',
  'Fredricksburg':          'Fredericksburg',
  'FW Chisolm Trail':       'FW Chisholm Trail',
  'Humble Atascosita':      'Humble Atascocita',
  'Jourdantown':            'Jourdanton',
  'Regan County':           'Reagan County',
  'Rosebudd-Lott':          'Rosebud-Lott',
  'Waxahatchie':            'Waxahachie',
  'Wichita Falls Hirshi':   'Wichita Falls Hirschi',
  'Wolfe City':             'Wolf City',
  // City-prefix disambiguation (medium confidence confirmed)
  'FW Arlington Heights':   'Arlington Heights',
  'WF City View':           'City View',
  'SA Davenport':           'Davenport',
  'Ridge Point':            'FB Ridge Point',
  'Wyatt':                  'FW Wyatt',
  'SA Jefferson':           'Jefferson',
  'Maude':                  'Maud',
}

function canonicalize(name) {
  const n = name.trim()
  return NAME_FIXES[n] || n
}

const CHAPTER_NAMES = {
  ABI:'Abilene', AMA:'Amarillo', AUS:'Austin', BEA:'Beaumont', COM:'Commerce',
  CSC:'College Station', CTX:'Central Texas', DAL:'Dallas', ELP:'El Paso',
  ETX:'East Texas', FTW:'Fort Worth', HOU:'Houston', NTX:'North Texas',
  PBC:'Permian Basin', RGV:'Rio Grande Valley', SAT:'San Antonio',
  SAN:'San Angelo', SFA:'Stephen F. Austin', SPC:'South Plains', STX:'South Texas',
  TYL:'Tyler', WAC:'Waco', WACO:'Waco',
}

function SectionLabel({ children }) {
  return (
    <div style={{ fontFamily:'var(--mono)', fontSize:10, letterSpacing:'0.18em', textTransform:'uppercase', color:'var(--mid)', marginBottom:6 }}>{children}</div>
  )
}

export default function TeamsView({ allData, years }) {
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState('appearances')
  const [selectedTeam, setSelectedTeam] = useState(null)
  const [classFilter, setClassFilter] = useState('all')

  // Aggregate all teams across all loaded years
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
            map.set(key, { name: key, yearSet: new Set(), totalGames: 0, chapters: new Map(), classSet: new Set() })
          }
          const t = map.get(key)
          t.yearSet.add(year)
          t.totalGames++
          t.classSet.add(cls)
          if (chapter) t.chapters.set(chapter, (t.chapters.get(chapter) || 0) + 1)
        }
      }
    }

    const teams = Array.from(map.values()).map(t => ({
      name: t.name,
      appearances: t.yearSet.size,
      years: Array.from(t.yearSet).sort((a,b) => a - b),
      totalGames: t.totalGames,
      chapters: Array.from(t.chapters.entries()).map(([ch, count]) => ({ ch, count })).sort((a,b) => b.count - a.count),
      classifications: Array.from(t.classSet).sort(),
    }))

    return { teams, classifications: Array.from(classSet).sort() }
  }, [allData, years])

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

      <div style={{ display:'flex', gap:12, flexWrap:'wrap', marginBottom:20, alignItems:'center' }}>
        {/* Search */}
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

        {/* Classification filter */}
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

        {/* Sort */}
        <div style={{ display:'flex', gap:4, marginLeft:'auto' }}>
          {[['appearances','Appearances'],['games','Total Games'],['name','Name']].map(([key, label]) => (
            <button
              key={key}
              onClick={() => setSortBy(key)}
              style={{
                fontFamily:'var(--mono)', fontSize:9, letterSpacing:'0.1em',
                padding:'5px 10px', borderRadius:4, border:'1px solid var(--border)',
                background: sortBy === key ? 'var(--steel)' : 'transparent',
                color: sortBy === key ? '#fff' : 'var(--mid)',
                cursor:'pointer'
              }}
            >{label}</button>
          ))}
        </div>
      </div>

      <div style={{ fontFamily:'var(--mono)', fontSize:10, color:'var(--mid)', marginBottom:12 }}>
        {filtered.length.toLocaleString()} team{filtered.length !== 1 ? 's' : ''}
        {search || classFilter !== 'all' ? ' matching filters' : ''}
      </div>

      <div style={{ display:'grid', gridTemplateColumns: selected ? '1fr 340px' : '1fr', gap:16, alignItems:'start' }}>
        {/* Team table */}
        <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:10, overflow:'hidden' }}>
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead>
              <tr style={{ background:'rgba(15,13,11,0.04)' }}>
                <th style={thStyle}>Team</th>
                <th style={thStyle}>Classification</th>
                <th style={thStyle}>Playoff Years</th>
                <th style={thStyle}>Total Games</th>
                <th style={{ ...thStyle, textAlign:'left' }}>Top Chapter</th>
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, 200).map(team => {
                const isSelected = selectedTeam === team.name
                return (
                  <tr
                    key={team.name}
                    onClick={() => setSelectedTeam(isSelected ? null : team.name)}
                    style={{
                      borderBottom:'1px solid rgba(15,13,11,0.05)',
                      background: isSelected ? 'rgba(44,74,110,0.07)' : 'transparent',
                      cursor:'pointer',
                      transition:'background 0.1s',
                    }}
                  >
                    <td style={{ ...tdStyle, fontWeight: isSelected ? 600 : 400, color:'var(--ink)' }}>
                      {team.name}
                    </td>
                    <td style={{ ...tdStyle, textAlign:'center' }}>
                      <span style={{ fontFamily:'var(--mono)', fontSize:9, color:'var(--steel)' }}>
                        {team.classifications.join(', ')}
                      </span>
                    </td>
                    <td style={{ ...tdStyle, textAlign:'center' }}>
                      <span style={{
                        fontFamily:"'Bebas Neue', sans-serif", fontSize:18,
                        color: team.appearances >= 4 ? 'var(--burnt)' : team.appearances >= 2 ? 'var(--gold)' : 'var(--mid)'
                      }}>{team.appearances}</span>
                      <span style={{ fontFamily:'var(--mono)', fontSize:9, color:'var(--mid)', marginLeft:4 }}>
                        ({team.years.join(', ')})
                      </span>
                    </td>
                    <td style={{ ...tdStyle, textAlign:'center', fontFamily:"'Bebas Neue', sans-serif", fontSize:18, color:'var(--ink)' }}>
                      {team.totalGames}
                    </td>
                    <td style={tdStyle}>
                      {team.chapters[0] ? (
                        <span style={{ fontFamily:'var(--mono)', fontSize:9 }}>
                          <span style={{ color:'var(--steel)' }}>{team.chapters[0].ch}</span>
                          <span style={{ color:'var(--mid)', marginLeft:4 }}>×{team.chapters[0].count}</span>
                        </span>
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
            </div>

            <div style={{ padding:'14px 18px', borderBottom:'1px solid var(--border)', display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
              <Stat label="Playoff Appearances" value={selected.appearances} color="var(--burnt)" />
              <Stat label="Total Games Played" value={selected.totalGames} color="var(--ink)" />
              <div style={{ gridColumn:'1/-1' }}>
                <div style={{ fontFamily:'var(--mono)', fontSize:9, letterSpacing:'0.1em', textTransform:'uppercase', color:'var(--mid)', marginBottom:4 }}>Years</div>
                <div style={{ fontFamily:'var(--mono)', fontSize:11, color:'var(--steel)' }}>{selected.years.join(', ')}</div>
              </div>
            </div>

            <div style={{ padding:'14px 18px' }}>
              <div style={{ fontFamily:'var(--mono)', fontSize:9, letterSpacing:'0.14em', textTransform:'uppercase', color:'var(--mid)', marginBottom:12 }}>Chapter Breakdown</div>
              {selected.chapters.length === 0 ? (
                <div style={{ color:'var(--mid)', fontSize:12 }}>No chapter data available.</div>
              ) : (
                <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                  {selected.chapters.map(({ ch, count }) => {
                    const pct = selected.totalGames > 0 ? (count / selected.totalGames) * 100 : 0
                    return (
                      <div key={ch}>
                        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:3 }}>
                          <span style={{ fontFamily:'var(--mono)', fontSize:10, color:'var(--ink)' }}>
                            {CHAPTER_NAMES[ch] || ch}
                            <span style={{ color:'var(--mid)', marginLeft:5 }}>({ch})</span>
                          </span>
                          <span style={{ fontFamily:'var(--mono)', fontSize:10, color:'var(--steel)' }}>{count}×</span>
                        </div>
                        <div style={{ height:4, background:'rgba(15,13,11,0.08)', borderRadius:2, overflow:'hidden' }}>
                          <div style={{ height:'100%', width:`${pct}%`, background:'var(--steel)', borderRadius:2 }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        )}
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
