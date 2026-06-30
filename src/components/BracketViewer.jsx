import React, { useState, useMemo } from 'react'

const CLASSIFICATIONS = ['1A D1','1A D2','2A D1','2A D2','3A D1','3A D2','4A D1','4A D2','5A D1','5A D2','6A D1','6A D2']
const WEEKS = [1,2,3,4,5,6]
const ROUND_LABELS = { 1:'Bi-District', 2:'Area', 3:'Regionals', 4:'Quarterfinals', 5:'Semifinals', 6:'Championship' }

function SectionLabel({ children }) {
  return (
    <div style={{ fontFamily:'var(--mono)', fontSize:10, letterSpacing:'0.18em', textTransform:'uppercase', color:'var(--mid)', marginBottom:6 }}>{children}</div>
  )
}

export default function BracketViewer({ data, year }) {
  const [classification, setClassification] = useState('1A D1')
  const [weekFilter, setWeekFilter] = useState('all')

  const games = useMemo(() => {
    if (!data?.games) return []
    return data.games.filter(g => g.classification === classification)
  }, [data, classification])

  const filteredGames = useMemo(() => {
    if (weekFilter === 'all') return games
    return games.filter(g => g.week === parseInt(weekFilter))
  }, [games, weekFilter])

  const gamesByWeek = useMemo(() => {
    const map = {}
    WEEKS.forEach(w => { map[w] = [] })
    filteredGames.forEach(g => {
      if (map[g.week]) map[g.week].push(g)
    })
    return map
  }, [filteredGames])

  const weeksWithGames = WEEKS.filter(w => gamesByWeek[w].length > 0)

  return (
    <div>
      <SectionLabel>03 · Bracket Data</SectionLabel>
      <div style={{
        fontFamily:"'Bebas Neue', sans-serif", fontSize:30, letterSpacing:0.5,
        color:'var(--ink)', marginBottom:20, paddingBottom:12,
        borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', gap:12
      }}>
        <div style={{ width:4, height:28, borderRadius:2, background:'var(--steel)', flexShrink:0 }} />
        Playoff Brackets · {year}
      </div>

      {/* Classification tabs */}
      <div style={{ display:'flex', gap:4, flexWrap:'wrap', marginBottom:16 }}>
        {CLASSIFICATIONS.map(cls => (
          <button
            key={cls}
            onClick={() => setClassification(cls)}
            style={{
              fontFamily:'var(--mono)', fontSize:9, letterSpacing:'0.1em',
              padding:'5px 10px', borderRadius:4, border:'1px solid var(--border)',
              background: classification === cls ? 'var(--steel)' : 'transparent',
              color: classification === cls ? '#fff' : 'var(--mid)',
              cursor:'pointer', transition:'all 0.15s'
            }}
          >{cls}</button>
        ))}
      </div>

      {/* Week filter */}
      <div style={{ display:'flex', gap:4, flexWrap:'wrap', marginBottom:24 }}>
        {[['all','All Weeks'], ...WEEKS.map(w => [String(w), ROUND_LABELS[w]])].map(([key, label]) => (
          <button
            key={key}
            onClick={() => setWeekFilter(key)}
            style={{
              fontFamily:'var(--mono)', fontSize:9, letterSpacing:'0.1em',
              padding:'4px 10px', borderRadius:4, border:'1px solid var(--border)',
              background: weekFilter === key ? 'rgba(44,74,110,0.15)' : 'transparent',
              borderColor: weekFilter === key ? 'var(--steel)' : 'var(--border)',
              color: weekFilter === key ? 'var(--steel)' : 'var(--mid)',
              cursor:'pointer'
            }}
          >{label}</button>
        ))}
      </div>

      {games.length === 0 ? (
        <EmptyState classification={classification} year={year} />
      ) : (
        <div>
          {(weekFilter === 'all' ? weeksWithGames : weeksWithGames).map(week => (
            <div key={week} style={{ marginBottom:32 }}>
              <div style={{
                fontFamily:'var(--mono)', fontSize:10, letterSpacing:'0.14em',
                textTransform:'uppercase', color:'var(--mid)', marginBottom:12,
                paddingBottom:8, borderBottom:'1px dashed var(--border)',
                display:'flex', alignItems:'center', gap:10
              }}>
                <span style={{
                  background:'var(--steel)', color:'#fff', borderRadius:3,
                  padding:'2px 8px', fontSize:9
                }}>Week {week}</span>
                {ROUND_LABELS[week]}
                <span style={{ marginLeft:'auto', color:'rgba(15,13,11,0.25)' }}>
                  {gamesByWeek[week].length} game{gamesByWeek[week].length !== 1 ? 's' : ''}
                </span>
              </div>

              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(300px, 1fr))', gap:10 }}>
                {gamesByWeek[week].map((game, i) => (
                  <GameCard key={i} game={game} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function GameCard({ game }) {
  const hasScore = game.score1 !== null && game.score2 !== null
  const t1Wins = hasScore && game.score1 > game.score2
  const t2Wins = hasScore && game.score2 > game.score1

  return (
    <div style={{
      background:'var(--surface)', border:'1px solid var(--border)',
      borderRadius:10, overflow:'hidden', position:'relative'
    }}>
      {/* Chapter badge */}
      {game.chapter && (
        <div style={{
          position:'absolute', top:10, right:12,
          fontFamily:'var(--mono)', fontSize:9, letterSpacing:'0.1em',
          background:'rgba(44,74,110,0.1)', color:'var(--steel)',
          padding:'2px 7px', borderRadius:3, border:'1px solid rgba(44,74,110,0.2)'
        }}>{game.chapter}</div>
      )}

      <div style={{ padding:'14px 16px' }}>
        {/* Team 1 */}
        <TeamRow
          name={game.team1}
          score={game.score1}
          isWinner={t1Wins}
          hasScore={hasScore}
        />
        <div style={{ height:1, background:'var(--border)', margin:'8px 0' }} />
        {/* Team 2 */}
        <TeamRow
          name={game.team2}
          score={game.score2}
          isWinner={t2Wins}
          hasScore={hasScore}
        />
      </div>

      {/* Result indicator */}
      {hasScore && (
        <div style={{
          borderTop:'1px solid var(--border)', padding:'6px 16px',
          display:'flex', justifyContent:'space-between', alignItems:'center',
          background:'rgba(15,13,11,0.02)'
        }}>
          <span style={{ fontFamily:'var(--mono)', fontSize:9, color:'var(--sage)', letterSpacing:'0.1em' }}>
            FINAL
          </span>
          {Math.abs((game.score1 || 0) - (game.score2 || 0)) > 0 && (
            <span style={{ fontFamily:'var(--mono)', fontSize:9, color:'var(--mid)' }}>
              +{Math.abs((game.score1 || 0) - (game.score2 || 0))}
            </span>
          )}
        </div>
      )}
    </div>
  )
}

function TeamRow({ name, score, isWinner, hasScore }) {
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:8 }}>
      <div style={{
        fontSize:12, color: isWinner ? 'var(--ink)' : hasScore ? 'var(--mid)' : 'var(--ink)',
        fontWeight: isWinner ? 600 : 400, flex:1, lineHeight:1.3
      }}>
        {isWinner && <span style={{ color:'var(--burnt)', marginRight:4, fontSize:10 }}>▲</span>}
        {name || '—'}
      </div>
      {score !== null && score !== undefined && (
        <div style={{
          fontFamily:"'Bebas Neue', sans-serif", fontSize:20,
          color: isWinner ? 'var(--burnt)' : 'var(--mid)',
          minWidth:28, textAlign:'right'
        }}>{score}</div>
      )}
    </div>
  )
}

function EmptyState({ classification, year }) {
  return (
    <div style={{
      background:'var(--surface)', border:'1px solid var(--border)',
      borderRadius:10, padding:'40px 28px', textAlign:'center', color:'var(--mid)'
    }}>
      <div style={{ fontFamily:"'Bebas Neue', sans-serif", fontSize:22, marginBottom:8, color:'var(--ink)' }}>
        No Game Data
      </div>
      <div style={{ fontSize:13 }}>
        No bracket data found for {classification} in {year}.
      </div>
    </div>
  )
}
