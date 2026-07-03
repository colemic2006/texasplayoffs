import React, { useMemo, useState, useEffect } from 'react'

const CHAPTER_NAMES = {
  ABI:'Abilene', AMA:'Amarillo', AUS:'Austin', BEA:'Beaumont',
  COM:'Commerce', CSC:'College Station', CTX:'Central Texas', DAL:'Dallas', ELP:'El Paso',
  ETX:'East Texas', FTW:'Fort Worth', HOU:'Houston', NTX:'North Texas',
  PBC:'Permian Basin', PVC:'Pecan Valley', RGV:'Rio Grande Valley', SAT:'San Antonio',
  SAN:'San Angelo', SFA:'Stephen F. Austin', SPC:'South Plains', STX:'South Texas',
  TYL:'Tyler', WAC:'Waco',
}

const HEAT_COLORS = [
  'transparent',
  'rgba(193,68,14,0.18)',
  'rgba(193,68,14,0.38)',
  'rgba(193,68,14,0.58)',
  'rgba(193,68,14,0.78)',
  'rgba(193,68,14,0.95)',
]

function heatColor(val, max) {
  if (!val || val === 0) return 'transparent'
  const idx = Math.ceil((val / max) * (HEAT_COLORS.length - 1))
  return HEAT_COLORS[Math.min(idx, HEAT_COLORS.length - 1)]
}

const GAME_DATA_YEARS = [2022, 2023, 2024, 2025]

export default function ChampionshipsView() {
  const [data, setData] = useState(null)
  const [view, setView] = useState('heatmap') // 'heatmap' | 'bar'
  const [sortBy, setSortBy] = useState('total') // 'total' | 'name'
  const [highlightChapter, setHighlightChapter] = useState(null)
  const [gamesByChYear, setGamesByChYear] = useState({}) // { 'HOU': { '2022': [game,...] } }

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}data/championships.json`)
      .then(r => r.ok ? r.json() : null)
      .then(setData)
      .catch(() => {})
  }, [])

  useEffect(() => {
    Promise.all(
      GAME_DATA_YEARS.map(y =>
        fetch(`${import.meta.env.BASE_URL}data/${y}.json`)
          .then(r => r.ok ? r.json() : null)
          .catch(() => null)
      )
    ).then(results => {
      const map = {}
      results.forEach((d, i) => {
        if (!d || !d.games) return
        const year = String(GAME_DATA_YEARS[i])
        d.games.filter(g => g.round === 'State Final').forEach(g => {
          if (!g.chapter) return
          if (!map[g.chapter]) map[g.chapter] = {}
          if (!map[g.chapter][year]) map[g.chapter][year] = []
          map[g.chapter][year].push(g)
        })
      })
      setGamesByChYear(map)
    })
  }, [])

  const { chapters, years, maxVal, sorted, grandTotal } = useMemo(() => {
    if (!data) return { chapters: {}, years: [], maxVal: 1, sorted: [], grandTotal: 0 }
    const chapters = data.chapters
    const years = data.years

    let maxVal = 1
    Object.values(chapters).forEach(byYear => {
      Object.values(byYear).forEach(v => { if (v > maxVal) maxVal = v })
    })

    const totals = Object.entries(chapters).map(([ch, byYear]) => ({
      ch,
      name: CHAPTER_NAMES[ch] || ch,
      total: Object.values(byYear).reduce((s, v) => s + v, 0),
      byYear,
    }))

    const sorted = sortBy === 'total'
      ? totals.sort((a, b) => b.total - a.total)
      : totals.sort((a, b) => a.ch.localeCompare(b.ch))

    const grandTotal = totals.reduce((s, t) => s + t.total, 0)

    return { chapters, years, maxVal, sorted, grandTotal }
  }, [data, sortBy])

  if (!data) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', padding:80, gap:12, color:'var(--mid)' }}>
      <div style={{ width:8, height:8, borderRadius:'50%', background:'var(--burnt)', animation:'pulse 1s infinite' }} />
      <span style={{ fontFamily:'var(--mono)', fontSize:11, letterSpacing:'0.14em', textTransform:'uppercase' }}>Loading…</span>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.3}}`}</style>
    </div>
  )

  return (
    <div>
      <div style={{ fontFamily:'var(--mono)', fontSize:10, letterSpacing:'0.18em', textTransform:'uppercase', color:'var(--mid)', marginBottom:6 }}>
        05 · Championships
      </div>
      <div style={{
        fontFamily:"'Bebas Neue', sans-serif", fontSize:30, letterSpacing:0.5,
        color:'var(--ink)', marginBottom:20, paddingBottom:12,
        borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', gap:12
      }}>
        <div style={{ width:4, height:28, borderRadius:2, background:'var(--burnt)', flexShrink:0 }} />
        State Championship Games by Chapter
      </div>

      <div style={{ fontFamily:'var(--mono)', fontSize:11, color:'var(--mid)', marginBottom:20 }}>
        TASO Football Championships officiated per chapter, 2000–2025 ·{' '}
        <span style={{ fontFamily:"'Bebas Neue', sans-serif", fontSize:16, color:'var(--burnt)' }}>{grandTotal}</span>{' '}
        total championship assignments
      </div>

      {/* Controls */}
      <div style={{ display:'flex', gap:8, marginBottom:20, flexWrap:'wrap', alignItems:'center' }}>
        <div style={{ display:'flex', gap:4 }}>
          {[['heatmap','Heat Map'],['bar','Bar Chart']].map(([id, label]) => (
            <button key={id} onClick={() => setView(id)} style={{
              fontFamily:'var(--mono)', fontSize:9, letterSpacing:'0.1em', textTransform:'uppercase',
              padding:'5px 12px', borderRadius:4, border:'1px solid var(--border)',
              background: view === id ? 'var(--burnt)' : 'transparent',
              color: view === id ? '#fff' : 'var(--mid)', cursor:'pointer', transition:'all 0.15s'
            }}>{label}</button>
          ))}
        </div>
        <div style={{ width:1, height:16, background:'var(--border)' }} />
        <div style={{ display:'flex', gap:4 }}>
          {[['total','By Total'],['name','Alphabetical']].map(([id, label]) => (
            <button key={id} onClick={() => setSortBy(id)} style={{
              fontFamily:'var(--mono)', fontSize:9, letterSpacing:'0.1em', textTransform:'uppercase',
              padding:'5px 12px', borderRadius:4, border:'1px solid var(--border)',
              background: sortBy === id ? 'var(--ink)' : 'transparent',
              color: sortBy === id ? 'var(--cream)' : 'var(--mid)', cursor:'pointer', transition:'all 0.15s'
            }}>{label}</button>
          ))}
        </div>
      </div>

      {view === 'heatmap' ? (
        <HeatMap years={years} sorted={sorted} maxVal={maxVal} grandTotal={grandTotal}
          highlightChapter={highlightChapter} setHighlightChapter={setHighlightChapter} />
      ) : (
        <BarChart sorted={sorted} grandTotal={grandTotal}
          highlightChapter={highlightChapter} setHighlightChapter={setHighlightChapter} />
      )}

      {/* Game Cards Panel */}
      {highlightChapter && (
        <GameCardsPanel
          ch={highlightChapter}
          name={CHAPTER_NAMES[highlightChapter] || highlightChapter}
          byYear={sorted.find(r => r.ch === highlightChapter)?.byYear || {}}
          gamesByYear={gamesByChYear[highlightChapter] || {}}
          onClose={() => setHighlightChapter(null)}
        />
      )}

      {/* Legend */}
      <div style={{ marginTop:24, display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
        <span style={{ fontFamily:'var(--mono)', fontSize:9, color:'var(--mid)', textTransform:'uppercase', letterSpacing:'0.1em' }}>Games:</span>
        {[0,1,2,3,4].map(i => (
          <div key={i} style={{ display:'flex', alignItems:'center', gap:4 }}>
            <div style={{ width:18, height:18, borderRadius:3, background: HEAT_COLORS[i+1] || 'transparent', border:'1px solid var(--border)' }} />
            <span style={{ fontFamily:'var(--mono)', fontSize:9, color:'var(--mid)' }}>
              {i === 0 ? '1' : i === 1 ? '2' : i === 2 ? '3' : i === 3 ? '4' : '5+'}
            </span>
          </div>
        ))}
        <div style={{ display:'flex', alignItems:'center', gap:4, marginLeft:8 }}>
          <div style={{ width:18, height:18, borderRadius:3, background:'transparent', border:'1px solid var(--border)' }} />
          <span style={{ fontFamily:'var(--mono)', fontSize:9, color:'var(--mid)' }}>0</span>
        </div>
      </div>
    </div>
  )
}

function GameCardsPanel({ ch, name, byYear, gamesByYear, onClose }) {
  const years = Object.keys(byYear).filter(y => byYear[y] > 0).sort()
  if (years.length === 0) return null
  return (
    <div style={{
      marginTop:20, marginBottom:8,
      border:'1px solid var(--border)', borderRadius:10,
      background:'var(--surface)', padding:'16px 20px'
    }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
        <div style={{ display:'flex', alignItems:'baseline', gap:10 }}>
          <span style={{ fontFamily:"'Bebas Neue', sans-serif", fontSize:20, color:'var(--mid)' }}>{ch}</span>
          <span style={{ fontFamily:"'Bebas Neue', sans-serif", fontSize:20, color:'var(--ink)' }}>{name}</span>
          <span style={{ fontFamily:'var(--mono)', fontSize:9, color:'var(--mid)', textTransform:'uppercase', letterSpacing:'0.1em' }}>
            · {years.length} season{years.length !== 1 ? 's' : ''} · {Object.values(byYear).reduce((s,v)=>s+v,0)} games
          </span>
        </div>
        <button onClick={onClose} style={{
          background:'transparent', border:'none', cursor:'pointer',
          fontFamily:'var(--mono)', fontSize:11, color:'var(--mid)', padding:'2px 6px'
        }}>✕</button>
      </div>
      <div style={{ display:'flex', flexWrap:'wrap', gap:10 }}>
        {years.map(year => {
          const games = gamesByYear[year]
          return (
            <div key={year} style={{
              background:'var(--bg)', border:'1px solid var(--border)',
              borderRadius:8, padding:'10px 14px', minWidth:200
            }}>
              <div style={{ fontFamily:"'Bebas Neue', sans-serif", fontSize:16, color:'var(--burnt)', marginBottom:8 }}>{year}</div>
              {games ? games.map((g, i) => (
                <div key={i} style={{ marginBottom: i < games.length - 1 ? 8 : 0 }}>
                  <div style={{ fontFamily:'var(--mono)', fontSize:8, color:'var(--mid)', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:4 }}>
                    {g.classification}
                  </div>
                  <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                    <div style={{ flex:1 }}>
                      <div style={{
                        fontFamily:'DM Sans', fontSize:12, fontWeight: g.winner === g.team1 ? 600 : 400,
                        color: g.winner === g.team1 ? 'var(--ink)' : 'var(--mid)'
                      }}>{g.team1}</div>
                      <div style={{
                        fontFamily:'DM Sans', fontSize:12, fontWeight: g.winner === g.team2 ? 600 : 400,
                        color: g.winner === g.team2 ? 'var(--ink)' : 'var(--mid)'
                      }}>{g.team2}</div>
                    </div>
                    <div style={{ textAlign:'right' }}>
                      <div style={{
                        fontFamily:"'Bebas Neue', sans-serif", fontSize:16,
                        color: g.winner === g.team1 ? 'var(--burnt)' : 'var(--mid)', lineHeight:1.2
                      }}>{g.score1}</div>
                      <div style={{
                        fontFamily:"'Bebas Neue', sans-serif", fontSize:16,
                        color: g.winner === g.team2 ? 'var(--burnt)' : 'var(--mid)', lineHeight:1.2
                      }}>{g.score2}</div>
                    </div>
                  </div>
                </div>
              )) : (
                <div style={{ fontFamily:'var(--mono)', fontSize:9, color:'var(--mid)' }}>
                  {byYear[year]} game{byYear[year] !== 1 ? 's' : ''} — no detail available
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function HeatMap({ years, sorted, maxVal, grandTotal, highlightChapter, setHighlightChapter }) {
  const totalsRow = useMemo(() => {
    const t = {}
    years.forEach(y => { t[y] = sorted.reduce((s, r) => s + (r.byYear[y] || 0), 0) })
    return t
  }, [years, sorted])

  return (
    <div style={{ overflowX:'auto' }}>
      <table style={{ borderCollapse:'collapse', minWidth: 900, width:'100%', tableLayout:'fixed' }}>
        <colgroup>
          <col style={{ width:130 }} />
          {years.map(y => <col key={y} style={{ width: Math.max(32, Math.floor(700 / years.length)) }} />)}
          <col style={{ width:60 }} />
        </colgroup>
        <thead>
          <tr>
            <th style={thS}>Chapter</th>
            {years.map(y => (
              <th key={y} style={{ ...thS, fontSize:8, padding:'4px 2px', letterSpacing:0 }}>{y}</th>
            ))}
            <th style={{ ...thS, color:'var(--burnt)' }}>Total</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map(({ ch, name, total, byYear }) => {
            const isHL = highlightChapter === ch
            return (
              <tr
                key={ch}
                onClick={() => setHighlightChapter(isHL ? null : ch)}
                style={{
                  cursor:'pointer',
                  background: isHL ? 'rgba(44,74,110,0.06)' : 'transparent',
                  outline: isHL ? '1px solid var(--steel)' : 'none',
                  transition:'background 0.1s'
                }}
              >
                <td style={{ ...tdS, fontWeight:500, color:'var(--ink)', whiteSpace:'nowrap' }}>
                  <span style={{ fontFamily:"'Bebas Neue', sans-serif", fontSize:14, color:'var(--mid)', marginRight:6 }}>{ch}</span>
                  <span style={{ fontSize:11 }}>{name}</span>
                </td>
                {years.map(y => {
                  const val = byYear[y] || 0
                  const bg = heatColor(val, maxVal)
                  return (
                    <td key={y} style={{
                      ...tdS, textAlign:'center', padding:'3px 2px',
                      background: bg, position:'relative'
                    }}>
                      {val > 0 && (
                        <span style={{
                          fontFamily:"'Bebas Neue', sans-serif",
                          fontSize: val >= 3 ? 14 : 12,
                          color: val >= 3 ? '#fff' : 'rgba(15,13,11,0.75)',
                          lineHeight:1
                        }}>{val}</span>
                      )}
                    </td>
                  )
                })}
                <td style={{ ...tdS, textAlign:'center' }}>
                  <span style={{ fontFamily:"'Bebas Neue', sans-serif", fontSize:18, color:'var(--burnt)', lineHeight:1 }}>{total}</span>
                  <div style={{ fontFamily:'var(--mono)', fontSize:8, color:'var(--mid)' }}>
                    {grandTotal > 0 ? ((total/grandTotal)*100).toFixed(0) : 0}%
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
        <tfoot>
          <tr style={{ borderTop:'2px solid var(--border)' }}>
            <td style={{ ...tdS, fontFamily:'var(--mono)', fontSize:9, color:'var(--mid)', textTransform:'uppercase', letterSpacing:'0.08em' }}>Per Year</td>
            {years.map(y => (
              <td key={y} style={{ ...tdS, textAlign:'center', padding:'4px 2px' }}>
                <span style={{ fontFamily:"'Bebas Neue', sans-serif", fontSize:13, color:'var(--ink)' }}>
                  {totalsRow[y] || 0}
                </span>
              </td>
            ))}
            <td style={{ ...tdS, textAlign:'center' }}>
              <span style={{ fontFamily:"'Bebas Neue', sans-serif", fontSize:18, color:'var(--ink)' }}>{grandTotal}</span>
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  )
}

function BarChart({ sorted, grandTotal, highlightChapter, setHighlightChapter }) {
  const maxTotal = sorted.reduce((m, r) => r.total > m ? r.total : m, 1)
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
      {sorted.map(({ ch, name, total, byYear }) => {
        const isHL = highlightChapter === ch
        const pct = (total / maxTotal) * 100
        const pctOfAll = grandTotal > 0 ? ((total / grandTotal) * 100).toFixed(1) : '0.0'
        const peakYear = Object.entries(byYear).sort((a,b) => b[1]-a[1])[0]
        return (
          <div
            key={ch}
            onClick={() => setHighlightChapter(isHL ? null : ch)}
            style={{
              background: isHL ? 'rgba(44,74,110,0.07)' : 'var(--surface)',
              border: `1px solid ${isHL ? 'var(--steel)' : 'var(--border)'}`,
              borderRadius:8, padding:'10px 14px', cursor:'pointer', transition:'all 0.15s'
            }}
          >
            <div style={{ display:'flex', alignItems:'baseline', justifyContent:'space-between', marginBottom:6 }}>
              <div style={{ display:'flex', alignItems:'baseline', gap:8 }}>
                <span style={{ fontFamily:"'Bebas Neue', sans-serif", fontSize:16, color:'var(--mid)', lineHeight:1 }}>{ch}</span>
                <span style={{ fontFamily:'DM Sans', fontSize:13, fontWeight:500, color:'var(--ink)' }}>{name}</span>
              </div>
              <div style={{ display:'flex', alignItems:'baseline', gap:8 }}>
                {peakYear && (
                  <span style={{ fontFamily:'var(--mono)', fontSize:9, color:'var(--mid)' }}>
                    peak {peakYear[0]}: {peakYear[1]}
                  </span>
                )}
                <span style={{ fontFamily:"'Bebas Neue', sans-serif", fontSize:24, color:'var(--burnt)', lineHeight:1 }}>{total}</span>
                <span style={{ fontFamily:'var(--mono)', fontSize:9, color:'var(--mid)' }}>{pctOfAll}%</span>
              </div>
            </div>
            <div style={{ height:6, background:'rgba(15,13,11,0.08)', borderRadius:3, overflow:'hidden' }}>
              <div style={{ height:'100%', width:`${pct}%`, background:'var(--burnt)', borderRadius:3, transition:'width 0.4s' }} />
            </div>
          </div>
        )
      })}
    </div>
  )
}

const thS = {
  fontFamily:'var(--mono)', fontSize:9, letterSpacing:'0.1em', textTransform:'uppercase',
  color:'var(--mid)', padding:'6px 4px', borderBottom:'1px solid var(--border)',
  textAlign:'center', whiteSpace:'nowrap'
}
const tdS = { padding:'4px 4px', verticalAlign:'middle', fontSize:12, borderBottom:'1px solid rgba(15,13,11,0.04)' }
