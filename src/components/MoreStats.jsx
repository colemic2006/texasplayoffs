import React, { useEffect, useMemo, useState } from 'react'
import { chapterColor } from '../chapterColors'
import { weekLabel, roundName } from '../roundName'
import { CHAPTER_CENTERS, ROAD_FACTOR, straightMiles } from '../chapterCenters'
import { gameCost } from '../officialsCost'
import { useHomeChaptersByYear } from '../homeChapters'
import { roundsToShow, isInProgress, upcomingBtn, upcomingCell, UPCOMING, UPCOMING_TIP } from '../upcoming'
import { useCollapse, ShowMore } from '../ShowMore'
import { useSort, SortTh } from '../sortable'

// More cards from the season data: whether teams keep a chapter after a win, rematches and their
// chapters, what outside crews cost, long trips, and playoff pay per member.
const NAMES = {
  ABI:'Abilene', AMA:'Amarillo', AUS:'Austin', BEA:'Southeast Texas', COM:'Commerce', CSC:'College Station',
  CTX:'Central Texas', DAL:'Dallas', ELP:'El Paso', FTW:'Fort Worth', HOU:'Houston', NTX:'North Texas', PBC:'Permian Basin',
  PVC:'Pecan Valley', RGV:'Rio Grande Valley', SAN:'San Angelo', SAT:'San Antonio', SFA:'Stephen F. Austin', SPC:'South Plains',
  STX:'South Texas', TYL:'Tyler', WAC:'Waco',
}
const CODE = { WACO: 'WAC', ETX: 'TYL' }
const code = c => (c ? CODE[c] || c : null)
const name = c => NAMES[c] || c
const ROUNDS = { 1:'Bi-District', 2:'Area', 3:'Regionals', 4:'Quarterfinals', 5:'Semifinals', 6:'State Final' }
const pct = (a, b) => (b ? Math.round(100 * a / b) : 0)
const usd = n => '$' + Math.round(n).toLocaleString()
const played = g => g.score1 != null && g.score2 != null
const winnerOf = g => g.winner || (played(g) ? (g.score1 > g.score2 ? g.team1 : g.score2 > g.score1 ? g.team2 : null) : null)

const btn = on => ({ fontFamily:'var(--mono)', fontSize:10, padding:'4px 10px', borderRadius:3, cursor:'pointer',
  border:`1px solid ${on ? 'var(--burnt)' : 'var(--border)'}`, background: on ? 'var(--burnt)' : 'transparent', color: on ? '#fff' : 'var(--mid)' })
const lab = { fontFamily:'var(--mono)', fontSize:9, letterSpacing:'0.14em', textTransform:'uppercase', color:'var(--mid)', marginRight:4, alignSelf:'center' }
const th = { fontFamily:'var(--mono)', fontSize:9, letterSpacing:'0.1em', textTransform:'uppercase', color:'var(--mid)', padding:'8px 10px', textAlign:'right', borderBottom:'1px solid var(--border)', whiteSpace:'nowrap' }
const td = { padding:'7px 10px', borderBottom:'1px solid var(--border)', fontSize:12, textAlign:'right', fontFamily:'var(--mono)', verticalAlign:'top' }
const note = { fontFamily:'var(--mono)', fontSize:10, color:'var(--mid)', marginTop:8, lineHeight:1.6, maxWidth:900 }
const box = { background:'var(--surface)', border:'1px solid var(--border)', borderRadius:10, overflowX:'auto' }
const big = { fontSize:15, color:'var(--ink)', lineHeight:1.6, margin:'4px 0 12px', maxWidth:900 }
const dot = c => <span style={{ display:'inline-block', width:8, height:8, borderRadius:'50%', background:chapterColor(c), marginRight:6 }} />
const chip = c => <span style={{ fontFamily:'var(--mono)', fontSize:10, padding:'2px 6px', borderRadius:3, background:chapterColor(c), color:'#fff', whiteSpace:'nowrap' }}>{c}</span>

function Card({ kicker, title, intro, children, top = 48 }) {
  return (
    <div style={{ marginTop:top, marginBottom:8 }}>
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

function SeasonPick({ year, scope, setScope }) {
  return (
    <div style={{ display:'flex', gap:4, flexWrap:'wrap', marginBottom:10 }}>
      <span style={lab}>Seasons:</span>
      <button onClick={() => setScope('season')} style={btn(scope === 'season')}>{year} season</button>
      <button onClick={() => setScope('all')} style={btn(scope === 'all')}>All seasons on file</button>
    </div>
  )
}

// round buttons, with rounds not played yet as placeholders while the season is in progress
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

// ---- after a win, does a team keep the same chapter for its next game?
export function StickWithCrew({ data, allData = {}, years = [] }) {
  const year = data?.games?.[0]?.year
  const [scope, setScope] = useState('season')
  const byYear = useHomeChaptersByYear()
  const s = useSort()
  const seasons = scope === 'season' ? [year] : years.filter(y => allData[y]?.games?.length).sort((a, b) => a - b)
  const rows = useMemo(() => {
    if (!byYear) return null
    const t = {}   // next week -> counts
    for (const y of seasons) {
      const hm = byYear(y), by = {}
      for (const g of (allData[y] || (y === year ? data : null))?.games || []) for (const team of [g.team1, g.team2]) (by[team] = by[team] || []).push(g)
      for (const [team, gs] of Object.entries(by)) {
        gs.sort((a, b) => a.week - b.week)
        for (let i = 1; i < gs.length; i++) {
          const a = gs[i - 1], b = gs[i]
          if (b.week !== a.week + 1 || winnerOf(a) !== team || !a.chapter || !b.chapter) continue
          const r = t[b.week] = t[b.week] || { n: 0, kept: 0, homeN: 0, homeKept: 0, outN: 0, outKept: 0, toOpp: 0 }
          const ca = code(a.chapter), cb = code(b.chapter), mine = code(hm[team])
          const opp = b.team1 === team ? b.team2 : b.team1
          r.n++; if (ca === cb) r.kept++
          if (mine && ca === mine) { r.homeN++; if (cb === ca) r.homeKept++ } else { r.outN++; if (cb === ca) r.outKept++ }
          if (cb !== ca && code(hm[opp]) === cb) r.toOpp++
        }
      }
    }
    return t
  }, [byYear, scope, data, allData, years.join()])
  if (!rows) return null
  const weeks = Object.keys(rows).map(Number)
  const show = roundsToShow(weeks, scope === 'season' && isInProgress(data)).filter(w => w >= 2)
  const all = Object.values(rows).reduce((s, r) => ({ n: s.n + r.n, kept: s.kept + r.kept }), { n: 0, kept: 0 })
  const cell = (a, n) => n ? <>{pct(a, n)}% <span style={{ color:'var(--mid)', fontSize:10 }}>{a} of {n}</span></> : '—'
  return (
    <Card kicker="Same crew next round?" title="After a Win, Do Teams Keep Their Chapter?"
      intro={<>Each time a team won a playoff game and played again the next week: did the same chapter work its next game? Split by whether the crew from the win was the team's own home chapter.</>}>
      <SeasonPick year={year} scope={scope} setScope={setScope} />
      <div style={big}>Winners kept the same chapter for their next game <strong>{pct(all.kept, all.n)}%</strong> of the time ({all.kept} of {all.n}){scope === 'season' ? ` in ${year}` : ' across the seasons on file'}.</div>
      <div style={box}>
        <table style={{ width:'100%', borderCollapse:'collapse', minWidth:640 }}>
          <thead><tr>
            <SortTh s={s} k="w" text style={{ ...th, textAlign:'left' }}>Next game</SortTh>
            <SortTh s={s} k="kept" style={{ ...th, color:'var(--burnt)' }}>Kept the chapter</SortTh>
            <SortTh s={s} k="home" style={th}>…when it was their home chapter</SortTh>
            <SortTh s={s} k="out" style={th}>…when it was an outside chapter</SortTh>
            <SortTh s={s} k="opp" style={th}>Switched to the opponent's chapter</SortTh>
          </tr></thead>
          <tbody>{[...s.sort(show.filter(w => rows[w]), { w: w => w, kept: w => rows[w].n ? pct(rows[w].kept, rows[w].n) : null,
            home: w => rows[w].homeN ? pct(rows[w].homeKept, rows[w].homeN) : null, out: w => rows[w].outN ? pct(rows[w].outKept, rows[w].outN) : null,
            opp: w => rows[w].n - rows[w].kept ? rows[w].toOpp : null }), ...show.filter(w => !rows[w])].map(w => {
            const r = rows[w]
            if (!r) return <tr key={w} title={UPCOMING_TIP}><td style={{ ...td, textAlign:'left', fontFamily:'DM Sans', opacity:0.55 }}>{weekLabel(w, ROUNDS[w])}</td><td colSpan={4} style={{ ...td, ...upcomingCell, textAlign:'center' }}>{UPCOMING}</td></tr>
            const sw = r.n - r.kept
            return (
              <tr key={w}>
                <td style={{ ...td, textAlign:'left', fontFamily:'DM Sans' }}>{weekLabel(w, ROUNDS[w])}</td>
                <td style={{ ...td, fontWeight:700 }}>{cell(r.kept, r.n)}</td>
                <td style={td}>{cell(r.homeKept, r.homeN)}</td>
                <td style={td}>{cell(r.outKept, r.outN)}</td>
                <td style={td}>{sw ? <>{r.toOpp} <span style={{ color:'var(--mid)', fontSize:10 }}>of {sw} switches</span></> : '—'}</td>
              </tr>
            )
          })}</tbody>
        </table>
      </div>
      <div style={note}>Counts a team's game after a win, when both games have a chapter on file. The next game is chosen with a new opponent, whose coach has a say too.
        "Home chapter" = the chapter on the team's home list for that season; "the opponent's chapter" = the next opponent's home chapter.</div>
    </Card>
  )
}

// ---- the same two schools meeting in more than one season
export function RepeatPairings({ allData = {}, years = [] }) {
  const [show, setShow] = useState('all')   // all | same | changed
  const more = useCollapse()
  const pairs = useMemo(() => {
    const by = {}
    for (const y of years) for (const g of allData[y]?.games || []) {
      const k = [g.team1, g.team2].sort().join(' | ')
      ;(by[k] = by[k] || []).push({ ...g, year: g.year || y })
    }
    return Object.entries(by).filter(([, gs]) => new Set(gs.map(g => g.year)).size > 1).map(([k, gs]) => {
      gs.sort((a, b) => a.year - b.year || a.week - b.week)
      const chs = gs.map(g => code(g.chapter))
      const known = chs.filter(Boolean)
      return { k, teams: k.split(' | '), gs, known: known.length, same: known.length === gs.length && new Set(known).size === 1, changed: new Set(known).size > 1 }
    }).sort((a, b) => b.gs.length - a.gs.length || b.gs[b.gs.length - 1].year - a.gs[a.gs.length - 1].year)
  }, [allData, years.join()])
  if (!pairs.length) return null
  const full = pairs.filter(p => p.known === p.gs.length)
  const list = pairs.filter(p => show === 'all' || (show === 'same' ? p.same : p.changed))
  return (
    <Card kicker="Rematches" title="Playoff Rematches: Same Chapter Again?"
      intro={<>Schools that met in the playoffs in more than one season on file, and the chapter that worked each meeting.</>}>
      <div style={big}><strong>{pairs.length}</strong> pairs of schools met in more than one season. Of the {full.length} with every meeting's chapter on file,
        <strong> {full.filter(p => p.same).length}</strong> ({pct(full.filter(p => p.same).length, full.length)}%) had the same chapter every time.</div>
      <div style={{ display:'flex', gap:4, flexWrap:'wrap', marginBottom:10 }}>
        <span style={lab}>Show:</span>
        {[['all', `All (${pairs.length})`], ['same', `Same chapter every time (${pairs.filter(p => p.same).length})`], ['changed', `Chapter changed (${pairs.filter(p => p.changed).length})`]].map(([k, l]) =>
          <button key={k} onClick={() => setShow(k)} style={btn(show === k)}>{l}</button>)}
      </div>
      <div style={{ ...box, padding:'6px 14px' }}>
        {more.cut(list).map((p, i) => (
          <div key={p.k} style={{ padding:'8px 0', borderTop: i ? '1px dashed var(--border)' : 'none' }}>
            <div style={{ fontSize:13, fontWeight:600 }}>{p.teams[0]} v {p.teams[1]} <span style={{ fontFamily:'var(--mono)', fontSize:10, color: p.same ? 'var(--sage)' : p.changed ? 'var(--burnt)' : 'var(--mid)', fontWeight:400, marginLeft:6 }}>
              {p.same ? 'same chapter every time' : p.changed ? 'chapter changed' : 'chapter not on file for every meeting'}</span></div>
            <div style={{ display:'flex', gap:12, flexWrap:'wrap', marginTop:4 }}>
              {p.gs.map((g, j) => (
                <span key={j} style={{ display:'inline-flex', gap:6, alignItems:'center', fontSize:11, color:'var(--mid)' }}>
                  <span style={{ fontFamily:'var(--mono)' }}>{g.year} {roundName(g)}</span>
                  {g.chapter ? chip(code(g.chapter)) : <span style={{ fontFamily:'var(--mono)', fontSize:10 }}>—</span>}
                </span>
              ))}
            </div>
          </div>
        ))}
        {!list.length && <div style={{ fontSize:12, color:'var(--mid)', padding:'8px 0' }}>None.</div>}
      </div>
      <ShowMore c={more} total={list.length} noun="rematches" />
      <div style={note}>Seasons on file only; a rematch in a season that isn't on file isn't counted. School names as they appear in each season's bracket.</div>
    </Card>
  )
}

// the chapter whose main city is closest to a game site
const nearest = g => Object.entries(CHAPTER_CENTERS).reduce((best, [c, t]) => {
  const m = straightMiles(t[1], t[2], g.lat, g.lng)
  return !best || m < best.m ? { c, m } : best
}, null)?.c

// ---- what it costs when the crew isn't the nearest chapter
export function OutsideCrewCost({ data }) {
  const games = data?.games || [], year = games[0]?.year
  const [wk, setWk] = useState('all')
  const more = useCollapse()
  const s = useSort()
  const all = useMemo(() => games.map(g => {
    const actual = g.chapter && g.lat != null ? gameCost({ ...g, chapter: code(g.chapter) }) : null
    if (!actual) return null
    const near = nearest(g), alt = gameCost({ ...g, chapter: near })
    return { g, ch: code(g.chapter), near, actual: actual.total, alt: alt.total, extra: actual.total - alt.total }
  }).filter(Boolean), [data])
  const weeks = [...new Set(all.map(x => x.g.week))].sort((a, b) => a - b)
  const shown = all.filter(x => wk === 'all' || x.g.week === wk)
  if (!all.length) return null
  const sum = k => shown.reduce((t, x) => t + x[k], 0)
  const notNear = shown.filter(x => x.ch !== x.near)
  const by = {}
  for (const x of notNear) { const r = by[x.ch] = by[x.ch] || { c: x.ch, n: 0, extra: 0 }; r.n++; r.extra += x.extra }
  const rows = Object.values(by).sort((a, b) => b.extra - a.extra)
  const top = [...notNear].sort((a, b) => b.extra - a.extra)
  return (
    <Card kicker="Officiating costs" title="What Outside Crews Cost"
      intro={<>What each game's crew cost, compared with what it would have cost if the chapter nearest the game site had worked it. Coaches pick the chapter; the extra travel is paid by the schools.</>}>
      <RoundPick weeks={weeks} wk={wk} setWk={setWk} inProgress={isInProgress(data)} />
      <div style={big}>
        {wk === 'all' ? `In the ${year} playoffs so far` : `In ${weekLabel(wk, ROUNDS[wk])}`}, <strong>{notNear.length}</strong> of {shown.length} games ({pct(notNear.length, shown.length)}%) went to a chapter other than the nearest one.
        Crews cost an estimated <strong>{usd(sum('actual'))}</strong>; the nearest chapters would have cost about <strong>{usd(sum('alt'))}</strong>, so the picks added <strong>{usd(sum('extra'))}</strong>.
      </div>
      <div style={{ display:'flex', gap:14, flexWrap:'wrap', alignItems:'flex-start' }}>
        <div style={{ ...box, flex:'1 1 360px' }}>
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead><tr><SortTh s={s} k="name" text style={{ ...th, textAlign:'left' }}>Chapter picked</SortTh><SortTh s={s} k="n" style={th}>Games it wasn't nearest</SortTh><SortTh s={s} k="extra" style={{ ...th, color:'var(--burnt)' }}>Extra cost</SortTh></tr></thead>
            <tbody>{more.cut(s.sort(rows, { name: r => name(r.c), n: r => r.n, extra: r => r.extra })).map(r => (
              <tr key={r.c}><td style={{ ...td, textAlign:'left', fontFamily:'DM Sans' }}>{dot(r.c)}{name(r.c)}</td><td style={td}>{r.n}</td><td style={{ ...td, fontWeight:700 }}>{usd(r.extra)}</td></tr>
            ))}</tbody>
          </table>
        </div>
        <div style={{ ...box, flex:'1 1 420px', padding:'10px 14px' }}>
          <div style={{ fontFamily:'var(--mono)', fontSize:9, letterSpacing:'0.12em', textTransform:'uppercase', color:'var(--mid)', marginBottom:6 }}>Costliest outside picks</div>
          {top.slice(0, 10).map((x, i) => (
            <div key={i} style={{ display:'flex', gap:8, flexWrap:'wrap', alignItems:'center', fontSize:12, padding:'4px 0', borderTop: i ? '1px dashed var(--border)' : 'none' }}>
              <span style={{ flex:1, minWidth:180 }}>{x.g.team1} v {x.g.team2}<span style={{ color:'var(--mid)' }}> · {x.g.city || x.g.site}</span></span>
              {chip(x.ch)}<span style={{ fontFamily:'var(--mono)', fontSize:10, color:'var(--mid)' }}>nearest {x.near}</span>
              <strong style={{ fontFamily:'var(--mono)', minWidth:60, textAlign:'right' }}>+{usd(x.extra)}</strong>
            </div>
          ))}
        </div>
      </div>
      <ShowMore c={more} total={rows.length} noun="chapters" />
      <div style={note}>Estimates from the 2026 pay sheet, as on the Most Expensive Games card: lowest gate band, travel bands up to 90 miles one way, then per-mile pay, riders and playoff meals.
        "Nearest chapter" = the chapter whose main city is closest to the game site; real crews come from all over a chapter, and the nearest chapter may not have been available. Games without a site aren't counted.</div>
    </Card>
  )
}

// ---- games over 90 miles one way: per-mile pay, riders and meals
export function LongTrips({ data }) {
  const games = data?.games || [], year = games[0]?.year
  const [wk, setWk] = useState('all')
  const more = useCollapse(), moreG = useCollapse()
  const s = useSort()
  const all = useMemo(() => games.map(g => {
    const c = g.chapter && g.lat != null ? gameCost({ ...g, chapter: code(g.chapter) }) : null
    return c && c.oneWay > 90 ? { g, ch: code(g.chapter), c } : null
  }).filter(Boolean), [data])
  const weeks = [...new Set(games.filter(g => g.chapter && g.lat != null).map(g => g.week))].sort((a, b) => a - b)
  const shown = all.filter(x => wk === 'all' || x.g.week === wk)
  const mapped = games.filter(g => g.chapter && g.lat != null && (wk === 'all' || g.week === wk)).length
  const by = {}
  for (const x of shown) { const r = by[x.ch] = by[x.ch] || { c: x.ch, n: 0, cost: 0, far: x }; r.n++; r.cost += x.c.total; if (x.c.oneWay > r.far.c.oneWay) r.far = x }
  const rows = Object.values(by).sort((a, b) => b.n - a.n || b.cost - a.cost)
  const list = [...shown].sort((a, b) => b.c.oneWay - a.c.oneWay)
  const total = shown.reduce((t, x) => t + x.c.total, 0)
  return (
    <Card kicker="Officiating costs" title="Long Trips: Games Over 90 Miles Away"
      intro={<>Past 90 miles one way, the pay sheet switches from a flat travel band to paying mileage for the cars, a fee for each rider and a playoff meal for every official. These are the games where a chapter traveled that far.</>}>
      <RoundPick weeks={weeks} wk={wk} setWk={setWk} inProgress={isInProgress(data)} />
      <div style={big}><strong>{shown.length}</strong> of {mapped} mapped games ({pct(shown.length, mapped)}%) {wk === 'all' ? `in the ${year} playoffs so far` : `in ${weekLabel(wk, ROUNDS[wk])}`} were over 90 miles from the working chapter,
        costing an estimated <strong>{usd(total)}</strong> for those crews ({shown.length ? usd(total / shown.length) : '$0'} a game).</div>
      <div style={{ ...box, marginBottom:4 }}>
        <table style={{ width:'100%', borderCollapse:'collapse', minWidth:620 }}>
          <thead><tr><SortTh s={s} k="name" text style={{ ...th, textAlign:'left' }}>Chapter</SortTh><SortTh s={s} k="n" style={{ ...th, color:'var(--burnt)' }}>Long trips</SortTh><SortTh s={s} k="cost" style={th}>Est. cost</SortTh><SortTh s={s} k="far" style={{ ...th, textAlign:'left' }}>Longest</SortTh></tr></thead>
          <tbody>{more.cut(s.sort(rows, { name: r => name(r.c), n: r => r.n, cost: r => r.cost, far: r => r.far.c.oneWay })).map(r => (
            <tr key={r.c}>
              <td style={{ ...td, textAlign:'left', fontFamily:'DM Sans', whiteSpace:'nowrap' }}>{dot(r.c)}{name(r.c)}</td>
              <td style={{ ...td, fontWeight:700 }}>{r.n}</td>
              <td style={td}>{usd(r.cost)}</td>
              <td style={{ ...td, textAlign:'left', fontFamily:'DM Sans' }}>{r.far.g.team1} v {r.far.g.team2} · {r.far.g.city || r.far.g.site} · <strong>{Math.round(r.far.c.oneWay)} mi</strong></td>
            </tr>
          ))}
          {!rows.length && <tr><td colSpan={4} style={{ ...td, textAlign:'left', color:'var(--mid)' }}>None.</td></tr>}</tbody>
        </table>
      </div>
      <ShowMore c={more} total={rows.length} noun="chapters" />
      {list.length > 0 && (
        <div style={{ ...box, padding:'10px 14px', marginTop:12 }}>
          <div style={{ fontFamily:'var(--mono)', fontSize:9, letterSpacing:'0.12em', textTransform:'uppercase', color:'var(--mid)', marginBottom:6 }}>Every long trip, farthest first</div>
          {moreG.cut(list).map((x, i) => (
            <div key={i} style={{ display:'flex', gap:8, flexWrap:'wrap', alignItems:'center', fontSize:12, padding:'4px 0', borderTop: i ? '1px dashed var(--border)' : 'none' }}>
              <span style={{ fontFamily:'var(--mono)', fontSize:10, color:'var(--mid)', width:110 }}>{roundName(x.g)} · {x.g.classification}</span>
              <span style={{ flex:1, minWidth:180 }}>{x.g.team1} v {x.g.team2}<span style={{ color:'var(--mid)' }}> · {x.g.city || x.g.site}</span></span>
              {chip(x.ch)}
              <span style={{ fontFamily:'var(--mono)', fontSize:11, minWidth:150, textAlign:'right' }}>{Math.round(x.c.oneWay)} mi · <strong>{usd(x.c.total)}</strong></span>
            </div>
          ))}
          <ShowMore c={moreG} total={list.length} noun="trips" />
        </div>
      )}
      <div style={note}>Miles are estimated driving miles one way (straight line × {ROAD_FACTOR}) from the chapter's main city. Cost = game fees at the lowest gate band plus mileage for 2 cars, riders and meals, from the 2026 pay sheet.</div>
    </Card>
  )
}

// ---- estimated playoff pay per chapter member
export function PayPerMember({ members = {}, allData = {}, years = [] }) {
  const year = Math.max(...years.filter(y => allData[y]?.games?.length))
  const data = allData[year]
  const more = useCollapse()
  const s = useSort()
  const rows = useMemo(() => {
    if (!data) return []
    const by = {}
    for (const g of data.games) {
      const c = code(g.chapter)
      if (!c) continue
      const cost = g.lat != null ? gameCost({ ...g, chapter: c }) : null
      const r = by[c] = by[c] || { c, games: 0, mapped: 0, pay: 0 }
      r.games++
      if (cost) { r.mapped++; r.pay += cost.total }
    }
    return Object.values(by).filter(r => members[r.c]).map(r => {
      const pay = r.mapped ? r.pay * r.games / r.mapped : 0   // games without a site yet: counted at the chapter's average
      return { ...r, pay, m: members[r.c], per: pay / members[r.c], per100: 100 * r.games / members[r.c] }
    }).sort((a, b) => b.per - a.per)
  }, [data, members])
  if (!rows.length) return null
  const top = Math.max(...rows.map(r => r.per))
  const tot = rows.reduce((t, r) => t + r.pay, 0), totM = rows.reduce((t, r) => t + r.m, 0)
  return (
    <Card kicker="Playoff pay" title="Estimated Playoff Pay per Member"
      intro={<>The estimated pay for the playoff games each chapter worked this season (game fees and travel), divided by the chapter's membership. It shows how unevenly playoff money reaches officials across the state.</>}>
      <div style={big}>About <strong>{usd(tot)}</strong> in crew pay so far in the {year} playoffs, or <strong>{usd(tot / totM)}</strong> per member statewide.
        It ranges from <strong>{usd(rows[0].per)}</strong> per member ({name(rows[0].c)}) to <strong>{usd(rows[rows.length - 1].per)}</strong> ({name(rows[rows.length - 1].c)}).</div>
      <div style={box}>
        <table style={{ width:'100%', borderCollapse:'collapse', minWidth:640 }}>
          <thead><tr>
            <SortTh s={s} k="name" text style={{ ...th, textAlign:'left' }}>Chapter</SortTh><SortTh s={s} k="m" style={th}>Members</SortTh><SortTh s={s} k="games" style={th}>Games</SortTh><SortTh s={s} k="per100" style={th}>Games per 100 members</SortTh>
            <SortTh s={s} k="pay" style={th}>Est. crew pay</SortTh><SortTh s={s} k="per" style={{ ...th, color:'var(--burnt)' }}>Per member</SortTh><th style={{ ...th, width:'20%' }} />
          </tr></thead>
          <tbody>{more.cut(s.sort(rows, { name: r => name(r.c), m: r => r.m, games: r => r.games, per100: r => r.per100, pay: r => r.pay, per: r => r.per })).map(r => (
            <tr key={r.c}>
              <td style={{ ...td, textAlign:'left', fontFamily:'DM Sans', whiteSpace:'nowrap' }}>{dot(r.c)}{name(r.c)}</td>
              <td style={td}>{r.m.toLocaleString()}</td><td style={td}>{r.games}</td><td style={td}>{r.per100.toFixed(1)}</td>
              <td style={td}>{usd(r.pay)}</td><td style={{ ...td, fontWeight:700 }}>{usd(r.per)}</td>
              <td style={{ ...td, paddingLeft:4 }}><div style={{ height:8, borderRadius:4, background:chapterColor(r.c), width:`${Math.max(2, 100 * r.per / top)}%` }} /></td>
            </tr>
          ))}</tbody>
        </table>
      </div>
      <ShowMore c={more} total={rows.length} noun="chapters" />
      <div style={note}>{year} season so far, with this season's membership. Pay is estimated from the 2026 pay sheet at the lowest gate band (real gates often pay more), with travel from the chapter's main city;
        games without a site yet are counted at the chapter's average. Spread evenly across members for comparison; in practice the same officials work most playoff games.</div>
    </Card>
  )
}

// the pay-per-member card for pages that don't already have the membership numbers
export function PayPerMemberCard({ allData = {}, years = [] }) {
  const [members, setMembers] = useState(null)
  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}data/membership.json?v=${__BUILD_TIME__}`).then(r => r.ok ? r.json() : null)
      .then(d => setMembers(d?.members || {})).catch(() => setMembers({}))
  }, [])
  return members ? <PayPerMember members={members} allData={allData} years={years} /> : null
}
