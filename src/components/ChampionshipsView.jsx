import React, { useMemo, useState, useEffect } from 'react'
import NotAllTime, { SEASONS_ON_FILE, GAPS } from './NotAllTime'
import { useCollapse, ShowMore } from '../ShowMore'
import { useSort, SortTh } from '../sortable'

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
  'rgba(70,29,124,0.18)',
  'rgba(70,29,124,0.38)',
  'rgba(70,29,124,0.58)',
  'rgba(70,29,124,0.78)',
  'rgba(70,29,124,0.95)',
]

function heatColor(val, max) {
  if (!val || val === 0) return 'transparent'
  const idx = Math.ceil((val / max) * (HEAT_COLORS.length - 1))
  return HEAT_COLORS[Math.min(idx, HEAT_COLORS.length - 1)]
}

// season files with every round's games (2022 on, plus each new season as its file appears)
const GAME_DATA_YEARS = __SEASONS__.filter(y => y >= 2022)
const isFinal = g => g.round === 'State Final' || g.round === 'Championship' || g.week === 6

export default function ChampionshipsView() {
  const [raw, setRaw] = useState(null)   // championships.json: the finals on file (2000 on)
  const [later, setLater] = useState({})   // { year: { chapter: finals } } from season files, for seasons after the file
  const [view, setView] = useState('heatmap') // 'heatmap' | 'bar'
  const [sortBy, setSortBy] = useState('total') // 'total' | 'name'
  const [highlightChapter, setHighlightChapter] = useState(null)
  const [gamesByChYear, setGamesByChYear] = useState({}) // { 'HOU': { '2022': [game,...] } }
  const [range, setRange] = useState(null)   // [from, to] seasons shown; null = all
  const heatSort = useSort()   // heat map column headers (the By Total / Alphabetical buttons reset it)

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}data/championships.json?v=${__BUILD_TIME__}`)
      .then(r => r.ok ? r.json() : null)
      .then(setRaw)
      .catch(() => {})
  }, [])

  useEffect(() => {
    // Load historical championship games
    const histFetch = fetch(`${import.meta.env.BASE_URL}data/championship_games.json?v=${__BUILD_TIME__}`)
      .then(r => r.ok ? r.json() : {})
      .catch(() => ({}))

    // Load 2022-2025 game data
    const yearFetches = Promise.all(
      GAME_DATA_YEARS.map(y =>
        fetch(`${import.meta.env.BASE_URL}data/${y}.json?v=${__BUILD_TIME__}`)
          .then(r => r.ok ? r.json() : null)
          .catch(() => null)
      )
    )

    Promise.all([histFetch, yearFetches]).then(([hist, results]) => {
      // Start with historical data
      const map = {}
      Object.entries(hist).forEach(([ch, byYear]) => {
        map[ch] = {}
        Object.entries(byYear).forEach(([yr, games]) => {
          map[ch][yr] = games
        })
      })
      // Merge 2022-2025 year JSON data
      results.forEach((d, i) => {
        if (!d || !d.games) return
        const year = String(GAME_DATA_YEARS[i])
        d.games.filter(isFinal).forEach(g => {
          if (!g.chapter) return
          if (!map[g.chapter]) map[g.chapter] = {}
          if (!map[g.chapter][year]) map[g.chapter][year] = []
          map[g.chapter][year].push(g)
        })
      })
      setGamesByChYear(map)
      // finals already played in each season file, counted by chapter (used for seasons the
      // championship file doesn't have yet, so a new season's finals show up on their own)
      const counts = {}
      results.forEach((d, i) => {
        for (const g of d?.games || []) {
          if (!isFinal(g) || !g.chapter || g.score1 == null || g.score2 == null) continue
          const y = String(GAME_DATA_YEARS[i]), c = counts[y] = counts[y] || {}
          c[g.chapter] = (c[g.chapter] || 0) + 1
        }
      })
      setLater(counts)
    })
  }, [])

  // the championship file plus any later season's finals from the season files
  const data = useMemo(() => {
    if (!raw) return null
    const extra = Object.keys(later).filter(y => !raw.years.includes(y)).sort()
    if (!extra.length) return raw
    const chapters = Object.fromEntries(Object.entries(raw.chapters).map(([c, by]) => [c, { ...by }]))
    const totals = { ...raw.totals }
    for (const y of extra) for (const [c, n] of Object.entries(later[y])) {
      chapters[c] = chapters[c] || {}
      chapters[c][y] = n
      totals[y] = (totals[y] || 0) + n
    }
    return { ...raw, years: [...raw.years, ...extra], chapters, totals }
  }, [raw, later])

  const { chapters, years, maxVal, sorted, grandTotal } = useMemo(() => {
    if (!data) return { chapters: {}, years: [], maxVal: 1, sorted: [], grandTotal: 0 }
    // only the seasons in the chosen range
    const [lo, hi] = range || [data.years[0], data.years[data.years.length - 1]]
    const years = data.years.filter(y => y >= lo && y <= hi)
    const chapters = Object.fromEntries(Object.entries(data.chapters).map(([ch, byYear]) =>
      [ch, Object.fromEntries(Object.entries(byYear).filter(([y]) => years.includes(y)))]))

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
  }, [data, sortBy, range])

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
        Championships
      </div>
      <div className="card-title" style={{
        fontFamily:"'Bebas Neue', sans-serif", fontSize:30, letterSpacing:0.5,
        color:'var(--ink)', marginBottom:20, paddingBottom:12,
        borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', gap:12
      }}>
        <div style={{ width:4, height:28, borderRadius:2, background:'var(--burnt)', flexShrink:0 }} />
        Texas High School Football Championships by Chapter
      </div>

      <NotAllTime>
        Championship counts cover the state finals from {data.years[0]} to {data.years[data.years.length - 1]} whose officiating chapter is known; a final with no chapter on file isn't counted. Where this page compares finals with the rest of the playoffs, the playoff side covers only the seasons where every round's chapter assignments are on file: <strong>{SEASONS_ON_FILE.join(', ')}</strong>. Seasons in between (such as {GAPS}) aren't included.
      </NotAllTime>

      <div style={{ fontFamily:'var(--mono)', fontSize:11, color:'var(--mid)', marginBottom:20 }}>
        Texas High School Football Championships per chapter, {years[0]}{years.length > 1 ? `–${years[years.length - 1]}` : ''} ·{' '}
        <span style={{ fontFamily:"'Bebas Neue', sans-serif", fontSize:16, color:'var(--burnt)' }}>{grandTotal}</span>{' '}
        known championship assignments
      </div>

      {/* Seasons shown */}
      <RangePicker all={data.years} range={range} setRange={setRange} />

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
            <button key={id} onClick={() => { setSortBy(id); heatSort.reset() }} style={{
              fontFamily:'var(--mono)', fontSize:9, letterSpacing:'0.1em', textTransform:'uppercase',
              padding:'5px 12px', borderRadius:4, border:'1px solid var(--border)',
              background: sortBy === id && !(view === 'heatmap' && heatSort.key) ? 'var(--ink)' : 'transparent',
              color: sortBy === id && !(view === 'heatmap' && heatSort.key) ? 'var(--cream)' : 'var(--mid)', cursor:'pointer', transition:'all 0.15s'
            }}>{label}</button>
          ))}
        </div>
      </div>

      {view === 'heatmap' ? (
        <HeatMap s={heatSort} years={years} sorted={sorted} maxVal={maxVal} grandTotal={grandTotal}
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
  // one tile per game; a season whose games aren't on file gets a tile for each game it counts
  const tiles = years.flatMap(year => {
    const games = gamesByYear[year] || []
    const known = games.map(g => ({ year, g }))
    const missing = Math.max(0, (byYear[year] || 0) - known.length)
    return [...known, ...Array.from({ length: missing }, () => ({ year, g: null }))]
  })
  const total = Object.values(byYear).reduce((s, v) => s + v, 0)
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
            · {years.length} season{years.length !== 1 ? 's' : ''} · {total} game{total !== 1 ? 's' : ''}
          </span>
        </div>
        <button onClick={onClose} style={{
          background:'transparent', border:'none', cursor:'pointer',
          fontFamily:'var(--mono)', fontSize:11, color:'var(--mid)', padding:'2px 6px'
        }}>✕</button>
      </div>
      <div style={{ display:'flex', flexWrap:'wrap', gap:10 }}>
        {tiles.map(({ year, g }, i) => {
          const scored = g && g.score1 != null && g.score2 != null
          const win = scored ? (g.score1 > g.score2 ? 1 : g.score2 > g.score1 ? 2 : 0) : 0
          const team = (t, sc, me) => (
            <div style={{ display:'flex', justifyContent:'space-between', gap:12 }}>
              <span style={{ fontFamily:'DM Sans', fontSize:12, fontWeight: win === me ? 600 : 400, color: win === me || !scored ? 'var(--ink)' : 'var(--mid)' }}>{t}</span>
              {scored && <span style={{ fontFamily:"'Bebas Neue', sans-serif", fontSize:16, lineHeight:1.2, color: win === me ? 'var(--burnt)' : 'var(--mid)' }}>{sc}</span>}
            </div>
          )
          return (
            <div key={i} style={{ background:'var(--bg)', border:'1px solid var(--border)', borderRadius:8, padding:'10px 14px', width:210, boxSizing:'border-box' }}>
              <div style={{ display:'flex', alignItems:'baseline', justifyContent:'space-between', marginBottom:6 }}>
                <span style={{ fontFamily:"'Bebas Neue', sans-serif", fontSize:16, color:'var(--burnt)' }}>{year}</span>
                {g && <span style={{ fontFamily:'var(--mono)', fontSize:8, color:'var(--mid)', textTransform:'uppercase', letterSpacing:'0.1em' }}>{g.classification === '6M' ? 'Six-Man' : g.classification}</span>}
              </div>
              {g ? (
                <>
                  {team(g.team1, g.score1, 1)}
                  {team(g.team2, g.score2, 2)}
                  {g.ot && <div style={{ fontFamily:'var(--mono)', fontSize:8, color:'var(--mid)', marginTop:3 }}>({g.ot})</div>}
                </>
              ) : (
                <div style={{ fontFamily:'var(--mono)', fontSize:9, color:'var(--mid)' }}>Game details not on file</div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

const RANGE_PRESETS = [['All years', null], ['2000s', [2000, 2009]], ['2010s', [2010, 2019]], ['2020s', [2020, 2029]], ['Last 5', 5], ['Last 10', 10]]

function RangePicker({ all, range, setRange }) {
  const first = all[0], last = all[all.length - 1]
  const [lo, hi] = range || [first, last]
  const pick = p => setRange(p === null ? null : typeof p === 'number' ? [all[Math.max(0, all.length - p)], last] : [String(p[0]), String(Math.min(p[1], +last))])
  const isOn = p => JSON.stringify(p === null ? null : typeof p === 'number' ? [all[Math.max(0, all.length - p)], last] : [String(p[0]), String(Math.min(p[1], +last))]) === JSON.stringify(range)
  const btn = on => ({
    fontFamily:'var(--mono)', fontSize:10, letterSpacing:'0.08em', padding:'5px 10px', borderRadius:4, cursor:'pointer',
    border:'1px solid var(--border)', background: on ? 'var(--ink)' : 'transparent', color: on ? 'var(--cream)' : 'var(--mid)',
  })
  const sel = { fontFamily:'var(--mono)', fontSize:11, padding:'4px 6px', borderRadius:4, border:'1px solid var(--border)', background:'var(--surface)', color:'var(--ink)' }
  return (
    <div style={{ display:'flex', gap:8, flexWrap:'wrap', alignItems:'center', marginBottom:16 }}>
      <span style={{ fontFamily:'var(--mono)', fontSize:9, letterSpacing:'0.12em', textTransform:'uppercase', color:'var(--mid)' }}>Seasons:</span>
      {RANGE_PRESETS.map(([lbl, p]) => <button key={lbl} onClick={() => pick(p)} style={btn(range === null ? p === null : isOn(p))}>{lbl}</button>)}
      <span style={{ fontFamily:'var(--mono)', fontSize:10, color:'var(--mid)', marginLeft:6 }}>or from</span>
      <select value={lo} onChange={e => setRange([e.target.value, e.target.value > hi ? e.target.value : hi])} style={sel}>
        {all.map(y => <option key={y} value={y}>{y}</option>)}
      </select>
      <span style={{ fontFamily:'var(--mono)', fontSize:10, color:'var(--mid)' }}>to</span>
      <select value={hi} onChange={e => setRange([e.target.value < lo ? e.target.value : lo, e.target.value])} style={sel}>
        {all.map(y => <option key={y} value={y}>{y}</option>)}
      </select>
    </div>
  )
}

function HeatMap({ s, years, sorted, maxVal, grandTotal, highlightChapter, setHighlightChapter }) {
  const more = useCollapse()
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
            <SortTh s={s} k="ch" text style={thS}>Chapter</SortTh>
            {years.map(y => (
              <SortTh key={y} s={s} k={`y${y}`} style={{ ...thS, fontSize:8, padding:'4px 2px', letterSpacing:0 }}>{y}</SortTh>
            ))}
            <SortTh s={s} k="total" style={{ ...thS, color:'var(--burnt)' }}>Total</SortTh>
          </tr>
        </thead>
        <tbody>
          {more.cut(s.sort(sorted, { ch: r => r.ch, total: r => r.total, ...Object.fromEntries(years.map(y => [`y${y}`, r => r.byYear[y] || 0])) })).map(({ ch, name, total, byYear }) => {
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
      <ShowMore c={more} total={sorted.length} noun="chapters" />
    </div>
  )
}

function BarChart({ sorted, grandTotal, highlightChapter, setHighlightChapter }) {
  const maxTotal = sorted.reduce((m, r) => r.total > m ? r.total : m, 1)
  const more = useCollapse()
  return (
    <>
    <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
      {more.cut(sorted).map(({ ch, name, total, byYear }) => {
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
    <ShowMore c={more} total={sorted.length} noun="chapters" />
    </>
  )
}

const thS = {
  fontFamily:'var(--mono)', fontSize:9, letterSpacing:'0.1em', textTransform:'uppercase',
  color:'var(--mid)', padding:'6px 4px', borderBottom:'1px solid var(--border)',
  textAlign:'center', whiteSpace:'nowrap'
}
const tdS = { padding:'4px 4px', verticalAlign:'middle', fontSize:12, borderBottom:'1px solid rgba(15,13,11,0.04)' }

