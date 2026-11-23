import React, { useEffect, useMemo, useState } from 'react'
import { chapterColor } from '../chapterColors'
import { weekLabel, roundName } from '../roundName'
import { CHAPTER_CENTERS, straightMiles } from '../chapterCenters'
import { useHomeChaptersByYear } from '../homeChapters'
import { roundsToShow, isInProgress, upcomingBtn, upcomingCell, UPCOMING, UPCOMING_TIP } from '../upcoming'
import { useCollapse, ShowMore } from '../ShowMore'

// Cards on the Coverage Map page that follow from the playoff footprints: chapters trading
// territory, who works El Paso's games, the big chapters' growing share, which chapters' schools
// stay home, and how far each chapter reaches.
const NAMES = {
  ABI:'Abilene', AMA:'Amarillo', AUS:'Austin', BEA:'Southeast Texas', COM:'Commerce', CSC:'College Station',
  CTX:'Central Texas', DAL:'Dallas', ELP:'El Paso', FTW:'Fort Worth', HOU:'Houston', NTX:'North Texas', PBC:'Permian Basin',
  PVC:'Pecan Valley', RGV:'Rio Grande Valley', SAN:'San Angelo', SAT:'San Antonio', SFA:'Stephen F. Austin', SPC:'South Plains',
  STX:'South Texas', TYL:'Tyler', WAC:'Waco',
}
const CODE = { WACO: 'WAC', ETX: 'TYL' }
const code = c => (c ? CODE[c] || c : null)
const ROUNDS = { 1:'Bi-District', 2:'Area', 3:'Regionals', 4:'Quarterfinals', 5:'Semifinals', 6:'State Final' }
const BIG = ['HOU', 'DAL', 'FTW', 'SAT']
const name = c => NAMES[c] || c
const pct = (a, b) => (b ? Math.round(100 * a / b) : 0)
const median = a => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : null }
// miles from a chapter's main city to a game's site (null if either isn't known)
const away = (c, g) => { const t = CHAPTER_CENTERS[c]; return t && g.lat != null ? straightMiles(t[1], t[2], g.lat, g.lng) : null }
const vs = g => `${g.team1} v ${g.team2}`

const btn = on => ({ fontFamily:'var(--mono)', fontSize:10, padding:'4px 10px', borderRadius:3, cursor:'pointer',
  border:`1px solid ${on ? 'var(--burnt)' : 'var(--border)'}`, background: on ? 'var(--burnt)' : 'transparent', color: on ? '#fff' : 'var(--mid)' })
const lab = { fontFamily:'var(--mono)', fontSize:9, letterSpacing:'0.14em', textTransform:'uppercase', color:'var(--mid)', marginRight:4, alignSelf:'center' }
const th = { fontFamily:'var(--mono)', fontSize:9, letterSpacing:'0.1em', textTransform:'uppercase', color:'var(--mid)', padding:'8px 10px', textAlign:'right', borderBottom:'1px solid var(--border)', whiteSpace:'nowrap' }
const td = { padding:'7px 10px', borderBottom:'1px solid var(--border)', fontSize:12, textAlign:'right', fontFamily:'var(--mono)', verticalAlign:'top' }
const note = { fontFamily:'var(--mono)', fontSize:10, color:'var(--mid)', marginTop:8, lineHeight:1.6, maxWidth:900 }
const box = { background:'var(--surface)', border:'1px solid var(--border)', borderRadius:10, overflowX:'auto' }
const dot = c => <span style={{ display:'inline-block', width:8, height:8, borderRadius:'50%', background:chapterColor(c), marginRight:6 }} />

function Card({ kicker, title, intro, children }) {
  return (
    <div style={{ marginTop:48, marginBottom:8 }}>
      <div style={{ fontFamily:'var(--mono)', fontSize:10, letterSpacing:'0.18em', textTransform:'uppercase', color:'var(--mid)', marginBottom:6 }}>{kicker}</div>
      <div className="card-title" style={{ fontFamily:"'Bebas Neue', sans-serif", fontSize:30, color:'var(--ink)', marginBottom:6, paddingBottom:12, borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', gap:12 }}>
        <div style={{ width:4, height:28, borderRadius:2, background:'var(--burnt)' }} />
        {title}
      </div>
      <div style={{ fontSize:13, color:'var(--mid)', lineHeight:1.55, margin:'10px 0 12px', maxWidth:860 }}>{intro}</div>
      {children}
    </div>
  )
}

// round buttons: each round played, or every round so far
// (rounds not played yet show as placeholders while the season is in progress)
function RoundPick({ weeks, wk, setWk, inProgress }) {
  return (
    <div style={{ display:'flex', gap:4, flexWrap:'wrap', marginBottom:10 }}>
      <span style={lab}>Round:</span>
      <button onClick={() => setWk('all')} style={btn(wk === 'all')}>All rounds so far</button>
      {roundsToShow(weeks, inProgress).map(w => weeks.includes(w)
        ? <button key={w} onClick={() => setWk(w)} style={btn(wk === w)}>{weekLabel(w, ROUNDS[w])}</button>
        : <button key={w} disabled title={UPCOMING_TIP} style={upcomingBtn(btn(false))}>{weekLabel(w, ROUNDS[w])}</button>)}
    </div>
  )
}

// a team's chapter for a game, given the home-chapter map
const homes = (g, hm) => [code(hm[g.team1]), code(hm[g.team2])]

// ---- 2 & 3: two chapters working each other's schools
function Trade({ a, b, data, allData, seasons, byYear }) {
  const games = data?.games || [], year = games[0]?.year
  const weeks = [...new Set(games.filter(g => g.chapter).map(g => g.week))].sort((x, y) => x - y)
  const [wk, setWk] = useState('all')
  const moreAB = useCollapse(), moreBA = useCollapse(), moreHist = useCollapse()
  const hm = byYear(year)
  // games chapter x worked with a school from y's area and none from its own
  const into = (gs, hmap, x, y) => gs.filter(g => code(g.chapter) === x && homes(g, hmap).includes(y) && !homes(g, hmap).includes(x))
  const now = games.filter(g => wk === 'all' || g.week === wk)
  const ab = into(now, hm, a, b), ba = into(now, hm, b, a)
  const history = seasons.map(y => { const gs = allData[y]?.games || [], m = byYear(y); return { y, ab: into(gs, m, a, b).length, ba: into(gs, m, b, a).length } })
  const list = (gs, c, more) => (
    <div style={{ ...box, flex:'1 1 400px', padding:'10px 14px' }}>
      <div style={{ fontFamily:'var(--mono)', fontSize:9, letterSpacing:'0.12em', textTransform:'uppercase', color:'var(--mid)', marginBottom:6 }}>
        {dot(c)}{name(c)} working {name(c === a ? b : a)}-area schools · {gs.length}
      </div>
      {gs.length === 0 && <div style={{ fontSize:12, color:'var(--mid)' }}>None.</div>}
      {more.cut([...gs].sort((x, y) => x.week - y.week || (away(c, y) || 0) - (away(c, x) || 0))).map((g, i) => {
        const m = away(c, g)
        return (
          <div key={i} style={{ display:'flex', gap:8, flexWrap:'wrap', fontSize:12, padding:'4px 0', borderTop: i ? '1px dashed var(--border)' : 'none' }}>
            <span style={{ fontFamily:'var(--mono)', fontSize:10, color:'var(--mid)', width:110 }}>{roundName(g)} · {g.classification}</span>
            <span style={{ flex:1, minWidth:180 }}>{vs(g)}{g.city ? <span style={{ color:'var(--mid)' }}> · {g.city}</span> : ''}</span>
            {m != null && <span style={{ fontFamily:'var(--mono)', fontSize:10, color:'var(--mid)' }}>{Math.round(m)} mi</span>}
          </div>
        )
      })}
      <ShowMore c={more} total={gs.length} noun="games" />
    </div>
  )
  return (
    <Card kicker="Trading territory" title={`${name(a)} and ${name(b)} Work Each Other's Schools`}
      intro={<>Coaches in one chapter's area keep choosing the other chapter, and the other way round. Counted here: games one chapter worked that had a school from the other's area and none from its own.</>}>
      <RoundPick weeks={weeks} wk={wk} setWk={setWk} inProgress={isInProgress(data)} />
      <div style={{ fontSize:15, color:'var(--ink)', lineHeight:1.6, margin:'4px 0 12px', maxWidth:900 }}>
        {wk === 'all' ? `In the ${year} playoffs so far` : `In ${weekLabel(wk, ROUNDS[wk])}`}, <strong>{name(a)}</strong> worked <strong>{ab.length}</strong> games with {name(b)}-area schools,
        and <strong>{name(b)}</strong> worked <strong>{ba.length}</strong> with {name(a)}-area schools.
      </div>
      <div style={{ display:'flex', gap:14, flexWrap:'wrap' }}>{list(ab, a, moreAB)}{list(ba, b, moreBA)}</div>
      {seasons.length > 1 && (
        <div style={{ ...box, marginTop:12, maxWidth:560 }}>
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead><tr><th style={{ ...th, textAlign:'left' }}>Season</th><th style={th}>{name(a)} → {name(b)} schools</th><th style={th}>{name(b)} → {name(a)} schools</th></tr></thead>
            <tbody>{moreHist.cut([...history].reverse()).map(h => (
              <tr key={h.y}><td style={{ ...td, textAlign:'left' }}>{h.y}</td><td style={td}>{h.ab}</td><td style={td}>{h.ba}</td></tr>
            ))}</tbody>
          </table>
        </div>
      )}
      {seasons.length > 1 && <ShowMore c={moreHist} total={history.length} noun="seasons" />}
      <div style={note}>Schools are placed in a chapter's area by the home-chapter lists (as they were each season). Miles are straight-line from the working chapter's main city to the game site.
        Every playoff round in each season on file is counted in the season table.</div>
    </Card>
  )
}

// ---- 4: who works the games played in the El Paso area
const EP = [31.76, -106.49], EP_MILES = 35   // El Paso and its suburbs (Canutillo, Socorro, Horizon City, Clint, Anthony...)
const inEP = g => g.lat != null && straightMiles(EP[0], EP[1], g.lat, g.lng) <= EP_MILES
function ElPaso({ data, allData, seasons, byYear }) {
  const year = data?.games?.[0]?.year
  const moreRows = useCollapse(), moreNow = useCollapse()
  const withSites = seasons.filter(y => (allData[y]?.games || []).some(g => g.lat != null))
  const rows = withSites.map(y => {
    const m = byYear(y), all = allData[y]?.games || []
    const gs = all.filter(inEP)
    const by = {}
    for (const g of gs) if (g.chapter) by[code(g.chapter)] = (by[code(g.chapter)] || 0) + 1
    // games with an El Paso school whose site isn't on file: they may have been played in El Paso too
    const unknown = all.filter(g => g.lat == null && homes(g, m).includes('ELP')).length
    return { y, n: gs.length, elp: by.ELP || 0, known: gs.filter(g => g.chapter).length, by, unknown }
  })
  // before sites were kept: El Paso's games with El Paso schools, wherever played
  const early = seasons.filter(y => !withSites.includes(y)).map(y => {
    const gs = (allData[y]?.games || []).filter(g => homes(g, byYear(y)).includes('ELP') && g.chapter)
    return { y, elp: gs.filter(g => code(g.chapter) === 'ELP').length, n: gs.length }
  })
  const now = (data?.games || []).filter(inEP).sort((a, b) => a.week - b.week)
  return (
    <Card kicker="Far West Texas" title="Who Works the Playoff Games Played in El Paso"
      intro={<>Playoff games played in the El Paso area, and the chapter that worked them. The El Paso chapter works almost none of them; the crews come from hundreds of miles away.</>}>
      <div style={{ ...box, marginBottom:12 }}>
        <table style={{ width:'100%', borderCollapse:'collapse', minWidth:620 }}>
          <thead><tr><th style={{ ...th, textAlign:'left' }}>Season</th><th style={th}>Games played in El Paso area</th><th style={th}>Worked by El Paso</th><th style={{ ...th, textAlign:'left' }}>Worked by others</th><th style={th}>El Paso-school games, no site on file</th></tr></thead>
          <tbody>{moreRows.cut([...rows].reverse()).map(r => (
            <tr key={r.y}>
              <td style={{ ...td, textAlign:'left' }}>{r.y}</td>
              <td style={td}>{r.n}</td>
              <td style={{ ...td, fontWeight:700, color: r.elp ? 'var(--ink)' : 'var(--burnt)' }}>{r.n ? <>{r.elp}{r.known ? <span style={{ color:'var(--mid)', fontWeight:400 }}> of {r.known}</span> : ''}</> : '—'}</td>
              <td style={{ ...td, textAlign:'left', fontFamily:'DM Sans' }}>{Object.entries(r.by).filter(([c]) => c !== 'ELP').sort((x, y) => y[1] - x[1]).map(([c, n]) => `${name(c)} ${n}`).join(' · ') || '—'}</td>
              <td style={{ ...td, color:'var(--mid)' }}>{r.unknown || '—'}</td>
            </tr>
          ))}</tbody>
        </table>
        <ShowMore c={moreRows} total={rows.length} noun="seasons" style={{ margin:'8px 10px' }} />
      </div>
      <div style={{ ...box, padding:'10px 14px' }}>
        <div style={{ fontFamily:'var(--mono)', fontSize:9, letterSpacing:'0.12em', textTransform:'uppercase', color:'var(--mid)', marginBottom:6 }}>{year} games played in the El Paso area</div>
        {now.length === 0 && <div style={{ fontSize:12, color:'var(--mid)' }}>None on file yet.</div>}
        {moreNow.cut(now).map((g, i) => {
          const c = code(g.chapter), mi = c ? away(c, g) : null
          return (
            <div key={i} style={{ display:'flex', gap:10, flexWrap:'wrap', alignItems:'center', fontSize:12, padding:'5px 0', borderTop: i ? '1px dashed var(--border)' : 'none' }}>
              <span style={{ fontFamily:'var(--mono)', fontSize:10, color:'var(--mid)', width:110 }}>{roundName(g)} · {g.classification}</span>
              <span style={{ flex:1, minWidth:200 }}>{vs(g)}<span style={{ color:'var(--mid)' }}> · {g.stadium || g.site}{g.city ? `, ${g.city}` : ''}</span></span>
              {c ? <span style={{ fontFamily:'var(--mono)', fontSize:10, padding:'2px 6px', borderRadius:3, background:chapterColor(c), color:'#fff' }}>{name(c)}</span>
                : <span style={{ fontFamily:'var(--mono)', fontSize:10, color:'var(--mid)' }}>no chapter on file</span>}
              <span style={{ fontFamily:'var(--mono)', fontSize:10, color:'var(--mid)', minWidth:70, textAlign:'right' }}>{mi != null ? `${Math.round(mi)} mi` : ''}</span>
            </div>
          )
        })}
        <ShowMore c={moreNow} total={now.length} noun="games" />
      </div>
      <div style={note}>"El Paso area" = a game site within {EP_MILES} miles of downtown El Paso. Game sites are on file from {withSites[0]} on; for 2022–2025, first-round sites
        are only partly on file, so games played in El Paso are undercounted there (the last column counts games with an El Paso school whose site isn't on file).
        Miles are straight-line, one way, from the working chapter's main city.
        {early.length > 0 && <> Before sites were kept, the El Paso chapter worked {early.map(e => `${e.elp} of ${e.n} (${e.y})`).join(', ')} games with El Paso schools, wherever they were played.</>}</div>
    </Card>
  )
}

// ---- 6: the four biggest chapters' share, round by round
function BigShare({ data, allData, seasons }) {
  const year = data?.games?.[0]?.year
  const [span, setSpan] = useState('season')
  const more = useCollapse()
  const ys = span === 'season' ? [year] : seasons
  const gs = ys.flatMap(y => (allData[y]?.games || (y === year ? data.games : [])).filter(g => g.chapter))
  const played = [...new Set(gs.map(g => g.week))].sort((a, b) => a - b)
  const weeks = roundsToShow(played, span === 'season' && isInProgress(data))
  const count = {}, tot = {}
  for (const g of gs) { const c = code(g.chapter); (count[c] = count[c] || {})[g.week] = (count[c][g.week] || 0) + 1; tot[g.week] = (tot[g.week] || 0) + 1 }
  const big = w => BIG.reduce((t, c) => t + (count[c]?.[w] || 0), 0)
  const chs = Object.keys(count).sort((a, b) => BIG.includes(b) - BIG.includes(a) || (weeks.reduce((t, w) => t + (count[b][w] || 0), 0) - weeks.reduce((t, w) => t + (count[a][w] || 0), 0)))
  const first = played[0], last = played[played.length - 1]
  const later = w => !tot[w]   // a round not played yet: a placeholder column
  return (
    <Card kicker="Deeper runs, fewer chapters" title="The Big Four's Share Grows Each Round"
      intro={<>Houston, Dallas, Fort Worth and San Antonio work a bigger share of the games every round, while smaller chapters drop out of the later rounds altogether.</>}>
      <div style={{ display:'flex', gap:4, flexWrap:'wrap', marginBottom:10 }}>
        <span style={lab}>Seasons:</span>
        <button onClick={() => setSpan('season')} style={btn(span === 'season')}>{year} season</button>
        <button onClick={() => setSpan('all')} style={btn(span === 'all')}>All seasons on file</button>
      </div>
      {played.length > 1 && (
        <div style={{ fontSize:15, color:'var(--ink)', lineHeight:1.6, margin:'4px 0 12px', maxWidth:900 }}>
          The big four worked <strong>{pct(big(first), tot[first])}%</strong> of {weekLabel(first, ROUNDS[first])} games and <strong>{pct(big(last), tot[last])}%</strong> of {weekLabel(last, ROUNDS[last])}.
        </div>
      )}
      <div style={box}>
        <table style={{ width:'100%', borderCollapse:'collapse', minWidth:560 }}>
          <thead><tr><th style={{ ...th, textAlign:'left' }}>Chapter</th>{weeks.map(w => <th key={w} style={{ ...th, ...(later(w) ? { opacity:0.55 } : {}) }} title={later(w) ? UPCOMING_TIP : undefined}>{ROUNDS[w] || `Week ${w}`}</th>)}</tr></thead>
          <tbody>
            <tr style={{ background:'rgba(253,208,35,0.22)' }}>
              <td style={{ ...td, textAlign:'left', fontFamily:'DM Sans', fontWeight:700 }}>Big four share</td>
              {weeks.map(w => later(w) ? <td key={w} style={{ ...td, ...upcomingCell }}>{UPCOMING}</td> : <td key={w} style={{ ...td, fontWeight:700 }}>{pct(big(w), tot[w])}%</td>)}
            </tr>
            {more.cut(chs).map(c => (
              <tr key={c} style={{ background: BIG.includes(c) ? 'rgba(80,140,90,0.06)' : 'transparent' }}>
                <td style={{ ...td, textAlign:'left', fontFamily:'DM Sans', whiteSpace:'nowrap', fontWeight: BIG.includes(c) ? 600 : 400 }}>{dot(c)}{name(c)}</td>
                {weeks.map(w => {
                  if (later(w)) return <td key={w} style={{ ...td, ...upcomingCell }} />
                  const n = count[c][w] || 0
                  return <td key={w} style={{ ...td, color: n ? 'var(--ink)' : 'var(--burnt)' }}>{n ? <>{n} <span style={{ color:'var(--mid)', fontSize:10 }}>{pct(n, tot[w])}%</span></> : '—'}</td>
                })}
              </tr>
            ))}
            <tr><td style={{ ...td, textAlign:'left', fontFamily:'DM Sans', color:'var(--mid)' }}>Games with a chapter</td>{weeks.map(w => <td key={w} style={{ ...td, color:'var(--mid)', ...(later(w) ? upcomingCell : {}) }}>{tot[w] || ''}</td>)}</tr>
          </tbody>
        </table>
      </div>
      <ShowMore c={more} total={chs.length} noun="chapters" />
      <div style={note}>Counts games with a chapter on file; each cell is the chapter's games and its share of that round. Rounds are by week, so 1A's rounds sit in the same column as the week they're played.
        {span === 'all' && ` Seasons on file: ${seasons.join(', ')}.`}{weeks.some(later) && ' Rounds not played yet are shown as placeholders and fill in as games come in.'}</div>
    </Card>
  )
}

// ---- 9: does a chapter's own area use it?
function StayHome({ data, byYear }) {
  const games = data?.games || [], year = games[0]?.year
  const weeks = [...new Set(games.filter(g => g.chapter).map(g => g.week))].sort((a, b) => a - b)
  const [wk, setWk] = useState('all')
  const more = useCollapse()
  const hm = byYear(year)
  const now = games.filter(g => g.chapter && (wk === 'all' || g.week === wk))
  const rows = Object.keys(NAMES).map(c => {
    const mine = now.filter(g => homes(g, hm).includes(c))   // games with one of its schools
    const kept = mine.filter(g => code(g.chapter) === c)
    const others = {}
    for (const g of mine) if (code(g.chapter) !== c) others[code(g.chapter)] = (others[code(g.chapter)] || 0) + 1
    const worked = now.filter(g => code(g.chapter) === c)
    return { c, mine: mine.length, kept: kept.length, others, worked: worked.length, ownIn: worked.filter(g => homes(g, hm).includes(c)).length }
  }).filter(r => r.mine || r.worked).sort((a, b) => pct(b.kept, b.mine) - pct(a.kept, a.mine) || b.mine - a.mine)
  return (
    <Card kicker="Home crews" title="Which Chapters' Schools Stay Home"
      intro={<>For each chapter: of the playoff games its own schools played, how many it worked, and where the rest went. A chapter can work plenty of games and still lose many of its own schools' games to other chapters.</>}>
      <RoundPick weeks={weeks} wk={wk} setWk={setWk} inProgress={isInProgress(data)} />
      <div style={box}>
        <table style={{ width:'100%', borderCollapse:'collapse', minWidth:720 }}>
          <thead><tr>
            <th style={{ ...th, textAlign:'left' }}>Chapter</th>
            <th style={th}>Its schools' games</th>
            <th style={{ ...th, color:'var(--burnt)' }}>Worked by it</th>
            <th style={{ ...th, textAlign:'left' }}>Went instead to</th>
            <th style={th}>Games it worked</th>
            <th style={th}>…with its own school</th>
          </tr></thead>
          <tbody>{more.cut(rows).map(r => (
            <tr key={r.c}>
              <td style={{ ...td, textAlign:'left', fontFamily:'DM Sans', whiteSpace:'nowrap' }}>{dot(r.c)}{name(r.c)}</td>
              <td style={td}>{r.mine}</td>
              <td style={{ ...td, fontWeight:700 }}>{r.mine ? `${r.kept} (${pct(r.kept, r.mine)}%)` : '—'}</td>
              <td style={{ ...td, textAlign:'left', fontFamily:'DM Sans' }}>{Object.entries(r.others).sort((x, y) => y[1] - x[1]).slice(0, 4).map(([c, n]) => `${name(c)} ${n}`).join(' · ') || '—'}</td>
              <td style={td}>{r.worked}</td>
              <td style={td}>{r.worked ? `${r.ownIn} (${pct(r.ownIn, r.worked)}%)` : '—'}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
      <ShowMore c={more} total={rows.length} noun="chapters" />
      <div style={note}>{year} season, games with a chapter on file. "Its schools" = schools on the chapter's home list; a game between two of its schools counts once.
        Some chapters' lists are still incomplete, so their schools' games are undercounted.</div>
    </Card>
  )
}

// ---- 10: how far each chapter travels
function Reach({ data }) {
  const games = data?.games || [], year = games[0]?.year
  const weeks = [...new Set(games.filter(g => g.chapter).map(g => g.week))].sort((a, b) => a - b)
  const [wk, setWk] = useState('all')
  const more = useCollapse()
  const now = games.filter(g => g.chapter && g.lat != null && (wk === 'all' || g.week === wk))
  const by = {}
  for (const g of now) { const c = code(g.chapter), m = away(c, g); if (m != null) (by[c] = by[c] || []).push({ g, m }) }
  const rows = Object.entries(by).map(([c, l]) => {
    const far = l.reduce((x, y) => (y.m > x.m ? y : x))
    return { c, n: l.length, med: median(l.map(x => x.m)), over100: l.filter(x => x.m > 100).length, far }
  }).sort((a, b) => b.med - a.med)
  const top = Math.max(1, ...rows.map(r => r.far.m))
  return (
    <Card kicker="Reach" title="How Far Each Chapter Travels"
      intro={<>How far each chapter's crews went from their home city to the games they worked: the typical (median) trip, how many were over 100 miles, and the farthest.</>}>
      <RoundPick weeks={weeks} wk={wk} setWk={setWk} inProgress={isInProgress(data)} />
      <div style={box}>
        <table style={{ width:'100%', borderCollapse:'collapse', minWidth:760 }}>
          <thead><tr>
            <th style={{ ...th, textAlign:'left' }}>Chapter</th>
            <th style={th}>Games</th>
            <th style={{ ...th, color:'var(--burnt)' }}>Median miles</th>
            <th style={th}>Over 100 mi</th>
            <th style={{ ...th, textAlign:'left', width:'22%' }}><span style={{ color:'#9B79D2' }}>■</span> median <span style={{ color:'var(--burnt)', marginLeft:6 }}>■</span> farthest</th>
            <th style={{ ...th, textAlign:'left' }}>Farthest game</th>
          </tr></thead>
          <tbody>{more.cut(rows).map(r => (
            <tr key={r.c}>
              <td style={{ ...td, textAlign:'left', fontFamily:'DM Sans', whiteSpace:'nowrap' }}>{dot(r.c)}{name(r.c)}</td>
              <td style={td}>{r.n}</td>
              <td style={{ ...td, fontWeight:700 }}>{Math.round(r.med)}</td>
              <td style={td}>{r.over100} <span style={{ color:'var(--mid)', fontSize:10 }}>{pct(r.over100, r.n)}%</span></td>
              <td style={{ ...td, textAlign:'left' }}>
                <div style={{ height:6, borderRadius:3, background:'#9B79D2', width:`${100 * r.med / top}%`, minWidth:2, marginBottom:3 }} />
                <div style={{ height:6, borderRadius:3, background:'var(--burnt)', width:`${100 * r.far.m / top}%`, minWidth:2 }} />
              </td>
              <td style={{ ...td, textAlign:'left', fontFamily:'DM Sans' }}>{vs(r.far.g)} · {r.far.g.city || r.far.g.site} · <strong>{Math.round(r.far.m)} mi</strong>{wk === 'all' ? ` (${roundName(r.far.g)})` : ''}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
      <ShowMore c={more} total={rows.length} noun="chapters" />
      <div style={note}>{year} season, games with a chapter and a mapped site. Miles are straight-line, one way, from the chapter's main city to the game site; driving miles run about 20% more.
        Crews come from all over a chapter's area, so a chapter's main city is an estimate of where they start.</div>
    </Card>
  )
}

export default function FootprintFindings({ data, allData = {}, years = [], loadAllYears }) {
  useEffect(() => { loadAllYears?.() }, [])
  const byYear = useHomeChaptersByYear()
  const seasons = years.filter(y => allData[y]?.games?.length).sort((a, b) => a - b)
  if (!data?.games?.length || !byYear) return null
  const all = { ...allData, [data.games[0].year]: data }
  return (
    <>
      <Trade a="HOU" b="SAT" data={data} allData={all} seasons={seasons} byYear={byYear} />
      <Trade a="DAL" b="FTW" data={data} allData={all} seasons={seasons} byYear={byYear} />
      <ElPaso data={data} allData={all} seasons={seasons} byYear={byYear} />
      <BigShare data={data} allData={all} seasons={seasons} />
      <StayHome data={data} byYear={byYear} />
      <Reach data={data} />
    </>
  )
}
