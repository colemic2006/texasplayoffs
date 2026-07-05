import React, { useMemo, useState } from 'react'

const KNOWN_CHAPTERS = new Set(['ABI','AMA','AUS','BEA','COM','CSC','CTX','DAL','ELP','ETX','FTW','HOU','NTX','PBC','PVC','RGV','SAT','SAN','SFA','SPC','STX','TYL','WAC','WACO'])
const BAD_NAMES = new Set(['total bracket counts','totals','total','bye','filler',''])

function isValidTeam(name) {
  if (!name) return false
  const n = name.trim()
  if (!n || /^\d+$/.test(n) || KNOWN_CHAPTERS.has(n.toUpperCase()) || BAD_NAMES.has(n.toLowerCase())) return false
  return true
}

const NAME_FIXES = {
  'Springlake Earth':'Springlake-Earth','Rockwall Heath':'Rockwall-Heath',
  'Tuloso Midway':'CC Tuloso-Midway','Tuloso-Midway':'CC Tuloso-Midway','CC Tuloso Midway':'CC Tuloso-Midway',
  'Deleon':'De Leon','LaPorte':'La Porte','Longview Pinetree':'Longview Pine Tree',
  'Rock Springs':'Rocksprings','Mt. Enterprise':'Mount Enterprise',
  'Spring  DeKaney':'Spring DeKaney','Spring Dekaney':'Spring DeKaney',
  'Young Mens Leadership Academy':"Young Men's Leadership Academy",
  'Beevillle Jones':'Beeville Jones','Edinbug':'Edinburg','Edinburgh Vela':'Edinburg Vela',
  'El Dorado':'Eldorado','El Paso Bel Aire':'El Paso Bel Air','El Paso De Valle':'El Paso Del Valle',
  'El Paso Frankin':'El Paso Franklin','El Paso Pebble Hlls':'El Paso Pebble Hills',
  'Fannidel':'Fannindel','Fredricksburg':'Fredericksburg','FW Chisolm Trail':'FW Chisholm Trail',
  'Humble Atascosita':'Humble Atascocita','Jourdantown':'Jourdanton','Regan County':'Reagan County',
  'Rosebudd-Lott':'Rosebud-Lott','Waxahatchie':'Waxahachie','Wichita Falls Hirshi':'Wichita Falls Hirschi',
  'Wolfe City':'Wolf City','FW Arlington Heights':'Arlington Heights','WF City View':'City View',
  'SA Davenport':'Davenport','Ridge Point':'FB Ridge Point','Wyatt':'FW Wyatt',
  'SA Jefferson':'Jefferson','Maude':'Maud','Alamo Heights':'SA Alamo Heights','SA Taft':'Taft','FW Dunbar':'Dunbar',
}

function canonicalize(name) {
  const n = name.trim()
  return NAME_FIXES[n] || n
}

const CHAPTER_NAMES = {
  ABI:'Abilene', AMA:'Amarillo', AUS:'Austin', BEA:'Beaumont',
  COM:'Commerce', CSC:'College Station', CTX:'Central Texas', DAL:'Dallas', ELP:'El Paso',
  ETX:'East Texas', FTW:'Fort Worth', HOU:'Houston', NTX:'North Texas',
  PBC:'Permian Basin', PVC:'Pecan Valley', RGV:'Rio Grande Valley', SAT:'San Antonio',
  SAN:'San Angelo', SFA:'Stephen F. Austin', SPC:'South Plains', STX:'South Texas',
  TYL:'Tyler', WAC:'Waco', WACO:'Waco',
}

const RANK_COLORS = ['var(--burnt)', 'var(--gold)', 'var(--steel)']

export default function ChapterRegulars({ allData, years }) {
  const [regularsChapter, setRegularsChapter] = useState(null)
  const [selectedTeam, setSelectedTeam] = useState(null)

  const { teams, allChapterCodes, gameIndex } = useMemo(() => {
    const map = new Map()
    // gameIndex: key = "TEAMNAME|CHAPTER" → array of game records
    const gameIndex = new Map()
    for (const year of years) {
      const yearData = allData[year]
      if (!yearData?.games?.length) continue
      for (const game of yearData.games) {
        const chapter = (game.chapter || '').trim()
        if (!chapter || !KNOWN_CHAPTERS.has(chapter)) continue
        if (!isValidTeam(game.team1) || !isValidTeam(game.team2)) continue
        for (const rawName of [game.team1, game.team2]) {
          if (!rawName) continue
          const key = canonicalize(rawName)
          if (!map.has(key)) map.set(key, { name: key, chapters: new Map(), classifications: new Set() })
          const t = map.get(key)
          if (game.classification) t.classifications.add(game.classification)
          t.chapters.set(chapter, (t.chapters.get(chapter) || 0) + 1)
          const gk = `${key}|${chapter}`
          if (!gameIndex.has(gk)) gameIndex.set(gk, [])
          gameIndex.get(gk).push({ ...game, year })
        }
      }
    }
    const teams = Array.from(map.values()).map(t => ({
      name: t.name,
      chapters: Array.from(t.chapters.entries()).map(([ch, count]) => ({ ch, count })).sort((a,b) => b.count - a.count),
      classifications: Array.from(t.classifications).sort(),
    }))
    const codes = new Set()
    teams.forEach(t => t.chapters.forEach(({ ch }) => codes.add(ch)))
    return { teams, allChapterCodes: Array.from(codes).sort(), gameIndex }
  }, [allData, years])

  const chapterRegularsList = useMemo(() => {
    if (!regularsChapter) return []
    return teams
      .map(t => {
        const entry = t.chapters.find(c => c.ch === regularsChapter)
        return entry ? { name: t.name, count: entry.count, classifications: t.classifications } : null
      })
      .filter(Boolean)
      .sort((a, b) => b.count - a.count)
      .slice(0, 20)
  }, [teams, regularsChapter])

  return (
    <div>
      <div style={{ fontFamily:'var(--mono)', fontSize:10, letterSpacing:'0.18em', textTransform:'uppercase', color:'var(--mid)', marginBottom:6 }}>
        03 · Chapter Regulars
      </div>
      <div style={{
        fontFamily:"'Bebas Neue', sans-serif", fontSize:30, letterSpacing:0.5,
        color:'var(--ink)', marginBottom:20, paddingBottom:12,
        borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', gap:12
      }}>
        <div style={{ width:4, height:28, borderRadius:2, background:'var(--gold)', flexShrink:0 }} />
        Top Teams per Chapter
      </div>

      <div style={{ fontFamily:'var(--mono)', fontSize:11, color:'var(--mid)', marginBottom:16 }}>
        Select a chapter to see which teams have been assigned to it most across all years.
      </div>

      {/* Chapter chips */}
      <div style={{ display:'flex', gap:4, flexWrap:'wrap', marginBottom:24 }}>
        {allChapterCodes.map(ch => (
          <button key={ch} onClick={() => { setRegularsChapter(regularsChapter === ch ? null : ch); setSelectedTeam(null) }} style={{
            fontFamily:'var(--mono)', fontSize:9, letterSpacing:'0.08em',
            padding:'5px 12px', borderRadius:3, border:'1px solid var(--border)',
            background: regularsChapter === ch ? 'var(--burnt)' : 'transparent',
            color: regularsChapter === ch ? '#fff' : 'var(--mid)',
            cursor:'pointer', transition:'all 0.15s'
          }}>
            {ch}
          </button>
        ))}
      </div>

      {!regularsChapter && (
        <div style={{ fontFamily:'var(--mono)', fontSize:11, color:'var(--mid)', padding:'32px 0', textAlign:'center' }}>
          Select a chapter above to see its most frequent teams.
        </div>
      )}

      {regularsChapter && (
        <div>
          <div style={{ marginBottom:16 }}>
            <span style={{ fontFamily:"'Bebas Neue', sans-serif", fontSize:22, color:'var(--burnt)' }}>
              {CHAPTER_NAMES[regularsChapter] || regularsChapter}
            </span>
            <span style={{ fontFamily:'var(--mono)', fontSize:11, color:'var(--mid)', marginLeft:10 }}>
              ({regularsChapter}) · Top {chapterRegularsList.length} teams by cumulative game assignments
            </span>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(280px, 1fr))', gap:8 }}>
            {chapterRegularsList.map((team, i) => {
              const max = chapterRegularsList[0]?.count || 1
              const pct = (team.count / max) * 100
              const rankColor = i < 3 ? RANK_COLORS[i] : 'var(--mid)'
              const isSelected = selectedTeam === team.name
              const teamGames = isSelected
                ? (gameIndex.get(`${team.name}|${regularsChapter}`) || [])
                    .slice().sort((a, b) => b.year - a.year || a.classification.localeCompare(b.classification))
                : []
              return (
                <div
                  key={team.name}
                  onClick={() => setSelectedTeam(isSelected ? null : team.name)}
                  style={{
                    background: isSelected ? 'rgba(44,74,110,0.07)' : 'var(--surface)',
                    border: `1px solid ${isSelected ? 'var(--steel)' : 'var(--border)'}`,
                    borderRadius:8, padding:'10px 14px', cursor:'pointer', transition:'all 0.15s'
                  }}
                >
                  <div style={{ display:'flex', alignItems:'baseline', justifyContent:'space-between', marginBottom:6 }}>
                    <div style={{ display:'flex', alignItems:'baseline', gap:8 }}>
                      <span style={{ fontFamily:"'Bebas Neue', sans-serif", fontSize:20, color: rankColor, lineHeight:1 }}>#{i+1}</span>
                      <span style={{ fontFamily:'DM Sans', fontSize:13, fontWeight:500, color:'var(--ink)' }}>{team.name}</span>
                    </div>
                    <div style={{ display:'flex', alignItems:'baseline', gap:4 }}>
                      <span style={{ fontFamily:"'Bebas Neue', sans-serif", fontSize:24, color: rankColor, lineHeight:1 }}>{team.count}</span>
                      <span style={{ fontFamily:'var(--mono)', fontSize:9, color:'var(--mid)' }}>games</span>
                    </div>
                  </div>
                  <div style={{ height:4, background:'rgba(15,13,11,0.08)', borderRadius:2, overflow:'hidden', marginBottom:5 }}>
                    <div style={{ height:'100%', width:`${pct}%`, background: rankColor, borderRadius:2, transition:'width 0.3s' }} />
                  </div>
                  <div style={{ fontFamily:'var(--mono)', fontSize:9, color:'var(--mid)', marginBottom: isSelected ? 10 : 0 }}>
                    {team.classifications.join(' · ')}
                  </div>

                  {isSelected && teamGames.length > 0 && (
                    <div style={{ borderTop:'1px solid var(--border)', marginTop:6, paddingTop:8 }}
                      onClick={e => e.stopPropagation()}>
                      {teamGames.map((g, gi) => {
                        const isTeam1 = canonicalize(g.team1) === team.name
                        const myScore = isTeam1 ? g.score1 : g.score2
                        const oppScore = isTeam1 ? g.score2 : g.score1
                        const opp = isTeam1 ? g.team2 : g.team1
                        const won = g.winner && canonicalize(g.winner) === team.name
                        const lost = g.winner && canonicalize(g.winner) !== team.name
                        return (
                          <div key={gi} style={{
                            display:'flex', alignItems:'center', justifyContent:'space-between',
                            padding:'4px 0',
                            borderBottom: gi < teamGames.length - 1 ? '1px solid rgba(15,13,11,0.05)' : 'none',
                          }}>
                            <div style={{ flex:1, minWidth:0 }}>
                              <div style={{ fontFamily:'var(--mono)', fontSize:9, color:'var(--mid)', marginBottom:1 }}>
                                {g.year} · {g.classification} · {g.round}
                              </div>
                              <div style={{ fontFamily:'DM Sans', fontSize:11, color:'var(--ink)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                                vs {opp}
                              </div>
                            </div>
                            <div style={{ display:'flex', alignItems:'center', gap:6, flexShrink:0, marginLeft:8 }}>
                              {myScore != null && oppScore != null ? (
                                <span style={{
                                  fontFamily:'var(--mono)', fontSize:11, fontWeight:500,
                                  color: won ? 'var(--sage)' : lost ? 'var(--burnt)' : 'var(--mid)'
                                }}>
                                  {myScore}–{oppScore}
                                </span>
                              ) : (
                                <span style={{ fontFamily:'var(--mono)', fontSize:10, color:'var(--mid)' }}>
                                  {won ? 'W' : lost ? 'L' : '—'}
                                </span>
                              )}
                              <span style={{
                                fontFamily:'var(--mono)', fontSize:9,
                                color: won ? 'var(--sage)' : lost ? 'var(--burnt)' : 'var(--mid)',
                                fontWeight:600
                              }}>
                                {won ? 'W' : lost ? 'L' : ''}
                              </span>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
