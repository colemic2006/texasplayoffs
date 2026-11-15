import React, { useMemo, useState } from 'react'
import { chapterColor } from '../chapterColors'

// Score stats across every season on file, by round, with the chapter that worked each game
const ROUNDS = { 1: 'Bi-District', 2: 'Area', 3: 'Regionals', 4: 'Quarterfinals', 5: 'Semifinals', 6: 'State Final' }
const CLASSES = ['6A D1','6A D2','5A D1','5A D2','4A D1','4A D2','3A D1','3A D2','2A D1','2A D2','1A D1','1A D2','Six Man D1','Six Man D2']
const normCh = c => ({ WACO: 'WAC' }[c] || c || '')
// six-man: its own brackets before the 2014 realignment, then 1A (which was eleven-man before that)
const sixMan = g => /six/i.test(g.classification) || (g.classification.startsWith('1A') && g.year >= 2014)
const avg = a => a.length ? a.reduce((s, x) => s + x, 0) / a.length : null
const f1 = n => n == null ? '—' : (Math.round(n * 10) / 10).toFixed(1)
const pct = (n, of) => of ? `${Math.round(100 * n / of)}%` : '—'

function Chip({ c }) {
  if (!c) return <span style={{ fontFamily:'var(--mono)', fontSize:9, color:'var(--mid)' }}>—</span>
  return <span style={{ fontFamily:'var(--mono)', fontSize:9, padding:'2px 6px', borderRadius:3, background: chapterColor(c), color:'#fff', whiteSpace:'nowrap' }}>{c}</span>
}

function Card({ n, title, intro, children }) {
  return (
    <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:10, padding:'16px 18px', marginBottom:20 }}>
      <div style={{ display:'flex', alignItems:'baseline', gap:10, marginBottom:4 }}>
        <span style={{ fontFamily:"'Bebas Neue', sans-serif", fontSize:26, color:'var(--gold)', lineHeight:1, WebkitTextStroke:'0.5px var(--burnt)' }}>{n}</span>
        <span style={{ fontFamily:"'Bebas Neue', sans-serif", fontSize:24, color:'var(--ink)', lineHeight:1 }}>{title}</span>
      </div>
      {intro && <div style={{ fontSize:12, color:'var(--mid)', marginBottom:10, lineHeight:1.5 }}>{intro}</div>}
      <div style={{ overflowX:'auto' }}>{children}</div>
    </div>
  )
}

const th = { fontFamily:'var(--mono)', fontSize:9, letterSpacing:'0.1em', textTransform:'uppercase', color:'var(--mid)', padding:'6px 8px', textAlign:'right', borderBottom:'1px solid var(--border)', whiteSpace:'nowrap' }
const td = { padding:'6px 8px', borderBottom:'1px solid rgba(15,13,11,0.06)', fontSize:12, textAlign:'right', fontFamily:'var(--mono)', whiteSpace:'nowrap' }
const tdl = { ...td, textAlign:'left', fontFamily:'DM Sans', whiteSpace:'normal' }

function GameList({ games, value, valueLabel }) {
  if (!games.length) return <div style={{ fontSize:12, color:'var(--mid)' }}>No games with scores yet.</div>
  return (
    <table style={{ width:'100%', borderCollapse:'collapse' }}>
      <thead><tr>
        <th style={{ ...th, textAlign:'left' }}>Year</th><th style={{ ...th, textAlign:'left' }}>Round</th><th style={{ ...th, textAlign:'left' }}>Class</th>
        <th style={{ ...th, textAlign:'left' }}>Game</th><th style={th}>{valueLabel}</th><th style={th}>Chapter</th>
      </tr></thead>
      <tbody>{games.map((g, i) => {
        const w = g.score1 >= g.score2
        return (
          <tr key={i}>
            <td style={{ ...td, textAlign:'left' }}>{g.year}</td>
            <td style={{ ...td, textAlign:'left', fontFamily:'DM Sans' }}>{ROUNDS[g.week]}</td>
            <td style={{ ...td, textAlign:'left' }}>{g.classification}</td>
            <td style={tdl}>
              <span style={{ fontWeight: w ? 700 : 400 }}>{g.team1} {g.score1}</span>
              <span style={{ color:'var(--mid)' }}>, </span>
              <span style={{ fontWeight: w ? 400 : 700 }}>{g.team2} {g.score2}</span>
            </td>
            <td style={{ ...td, fontWeight:700, color:'var(--burnt)' }}>{value(g)}</td>
            <td style={td}><Chip c={normCh(g.chapter)} /></td>
          </tr>
        )
      })}</tbody>
    </table>
  )
}

export default function ScoresView({ allData, years }) {
  const current = Math.max(...years)
  const [round, setRound] = useState('all')
  const [scope, setScope] = useState('all')   // 'season' | 'all'
  const [kind, setKind] = useState('eleven')  // 'eleven' (2A-6A) | 'six' (1A six-man)

  const raw = useMemo(() => years.flatMap(y => (allData[y]?.games || [])
    .filter(g => Number.isFinite(g.score1) && Number.isFinite(g.score2) && !g.forfeit && (g.score1 + g.score2) > 0 && g.score1 !== g.score2)
    .map(g => ({ ...g, year: y, total: g.score1 + g.score2, margin: Math.abs(g.score1 - g.score2), high: Math.max(g.score1, g.score2), low: Math.min(g.score1, g.score2) }))), [allData, years])
  // six-man has its own rules, shorter quarters and a 45-point mercy rule, so it's never mixed in
  const all = raw.filter(g => kind === 'six' ? sixMan(g) : !sixMan(g))
  const BLOW = kind === 'six' ? 45 : 35
  const inRound = g => round === 'all' || g.week === +round
  const scoped = all.filter(g => inRound(g) && (scope === 'all' || g.year === current))
  const season = all.filter(g => g.year === current)
  const hist = all.filter(g => g.year !== current)
  const top = (arr, key, n = 10, asc = false) => [...arr].sort((a, b) => asc ? a[key] - b[key] || b.total - a.total : b[key] - a[key] || b.total - a.total).slice(0, n)
  const weeks = [1, 2, 3, 4, 5, 6].filter(w => all.some(g => g.week === w))

  // per-chapter profile over the current filters
  const chapters = useMemo(() => {
    const by = {}
    scoped.forEach(g => { const c = normCh(g.chapter); if (!c) return; (by[c] = by[c] || []).push(g) })
    return Object.entries(by).map(([c, gs]) => ({ c, n: gs.length, total: avg(gs.map(g => g.total)), margin: avg(gs.map(g => g.margin)),
      close: gs.filter(g => g.margin <= 8).length, blow: gs.filter(g => g.margin >= BLOW).length, shut: gs.filter(g => g.low === 0).length }))
      .filter(x => x.n >= 5).sort((a, b) => b.total - a.total)
  }, [scoped, BLOW])

  const chip = on => ({ fontFamily:'var(--mono)', fontSize:9, letterSpacing:'0.08em', padding:'5px 11px', borderRadius:3, border:'1px solid var(--border)', cursor:'pointer',
    background: on ? 'var(--burnt)' : 'transparent', color: on ? '#fff' : 'var(--mid)' })
  const scopeLabel = scope === 'all' ? `all seasons on file (${Math.min(...years)}–${current})` : `${current}`

  return (
    <div>
      <div style={{ fontFamily:'var(--mono)', fontSize:10, letterSpacing:'0.18em', textTransform:'uppercase', color:'var(--mid)', marginBottom:6 }}>Playoff Scoring</div>
      <div style={{ fontFamily:"'Bebas Neue', sans-serif", fontSize:30, color:'var(--ink)', marginBottom:16, paddingBottom:12, borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', gap:12 }}>
        <div style={{ width:4, height:28, borderRadius:2, background:'var(--burnt)' }} />
        Score Stats
      </div>

      <div style={{ display:'flex', gap:4, flexWrap:'wrap', marginBottom:8, alignItems:'center' }}>
        <span style={{ fontFamily:'var(--mono)', fontSize:9, letterSpacing:'0.14em', textTransform:'uppercase', color:'var(--mid)', marginRight:4 }}>Football:</span>
        {[['eleven', 'Eleven-man'], ['six', 'Six-man']].map(([k, l]) => (
          <button key={k} onClick={() => { setKind(k); setRound('all') }} style={{ ...chip(kind === k), background: kind === k ? 'var(--gold)' : 'transparent', color: kind === k ? 'var(--ink)' : 'var(--mid)', fontWeight: kind === k ? 700 : 400 }}>{l}</button>
        ))}
        <span style={{ fontFamily:'var(--mono)', fontSize:10, color:'var(--mid)', marginLeft:8 }}>{kind === 'six' ? 'Six-man: 1A since 2014 (its own brackets before), 10-minute quarters, 45-point mercy rule at halftime or later' : 'Eleven-man: 2A–6A, plus 1A before the 2014 realignment'}</span>
      </div>
      <div style={{ display:'flex', gap:4, flexWrap:'wrap', marginBottom:8, alignItems:'center' }}>
        <span style={{ fontFamily:'var(--mono)', fontSize:9, letterSpacing:'0.14em', textTransform:'uppercase', color:'var(--mid)', marginRight:4 }}>Round:</span>
        <button onClick={() => setRound('all')} style={chip(round === 'all')}>All rounds</button>
        {weeks.map(w => <button key={w} onClick={() => setRound(String(w))} style={chip(round === String(w))}>{ROUNDS[w]}</button>)}
      </div>
      <div style={{ display:'flex', gap:4, flexWrap:'wrap', marginBottom:20, alignItems:'center' }}>
        <span style={{ fontFamily:'var(--mono)', fontSize:9, letterSpacing:'0.14em', textTransform:'uppercase', color:'var(--mid)', marginRight:4 }}>Games from:</span>
        <button onClick={() => setScope('all')} style={{ ...chip(scope === 'all'), background: scope === 'all' ? 'var(--ink)' : 'transparent' }}>All seasons</button>
        <button onClick={() => setScope('season')} style={{ ...chip(scope === 'season'), background: scope === 'season' ? 'var(--ink)' : 'transparent' }}>{current} only</button>
        <span style={{ fontFamily:'var(--mono)', fontSize:10, color:'var(--mid)', marginLeft:8 }}>{scoped.length.toLocaleString()} games with final scores</span>
      </div>

      <Card n="1" title="Points and Margins by Round" intro={`Average combined points and winning margin, ${current} vs. every earlier season on file. One-score game = decided by 8 or fewer.`}>
        <table style={{ width:'100%', borderCollapse:'collapse' }}>
          <thead><tr>
            <th style={{ ...th, textAlign:'left' }}>Round</th>
            <th style={th}>{current} avg total</th><th style={th}>Historical avg total</th>
            <th style={th}>{current} avg margin</th><th style={th}>Historical avg margin</th>
            <th style={th}>{current} one-score</th><th style={th}>Historical one-score</th>
          </tr></thead>
          <tbody>{weeks.map(w => {
            const s = season.filter(g => g.week === w), h = hist.filter(g => g.week === w)
            return (
              <tr key={w} style={{ background: String(w) === round ? 'rgba(70,29,124,0.06)' : 'transparent' }}>
                <td style={{ ...tdl, fontWeight:600 }}>{ROUNDS[w]}</td>
                <td style={{ ...td, fontWeight:700 }}>{f1(avg(s.map(g => g.total)))}</td><td style={td}>{f1(avg(h.map(g => g.total)))}</td>
                <td style={{ ...td, fontWeight:700 }}>{f1(avg(s.map(g => g.margin)))}</td><td style={td}>{f1(avg(h.map(g => g.margin)))}</td>
                <td style={{ ...td, fontWeight:700 }}>{pct(s.filter(g => g.margin <= 8).length, s.length)}</td><td style={td}>{pct(h.filter(g => g.margin <= 8).length, h.length)}</td>
              </tr>
            )
          })}</tbody>
        </table>
      </Card>

      <Card n="2" title="Average Score by Division" intro={`Average combined points and margin for each division (${round === 'all' ? 'all rounds' : ROUNDS[round]}), ${current} vs. history, with the chapter that worked the most of those games ${current === Math.max(...years) ? 'this season' : ''}.`}>
        <table style={{ width:'100%', borderCollapse:'collapse' }}>
          <thead><tr>
            <th style={{ ...th, textAlign:'left' }}>Division</th>
            <th style={th}>{current} avg total</th><th style={th}>Historical avg total</th><th style={th}>{current} avg margin</th><th style={th}>Historical avg margin</th><th style={th}>Most games ({current})</th>
          </tr></thead>
          <tbody>{CLASSES.filter(c => all.some(g => g.classification === c && inRound(g))).map(c => {
            const s = season.filter(g => g.classification === c && inRound(g)), h = hist.filter(g => g.classification === c && inRound(g))
            const cnt = {}; s.forEach(g => { const k = normCh(g.chapter); if (k) cnt[k] = (cnt[k] || 0) + 1 })
            const lead = Object.entries(cnt).sort((a, b) => b[1] - a[1])[0]
            return (
              <tr key={c}>
                <td style={{ ...tdl, fontWeight:600 }}>{c}</td>
                <td style={{ ...td, fontWeight:700 }}>{f1(avg(s.map(g => g.total)))}</td><td style={td}>{f1(avg(h.map(g => g.total)))}</td>
                <td style={{ ...td, fontWeight:700 }}>{f1(avg(s.map(g => g.margin)))}</td><td style={td}>{f1(avg(h.map(g => g.margin)))}</td>
                <td style={td}>{lead ? <><Chip c={lead[0]} /> <span style={{ color:'var(--mid)' }}>{lead[1]}</span></> : '—'}</td>
              </tr>
            )
          })}</tbody>
        </table>
      </Card>

      <Card n="2b" title="Winning and Losing Scores" intro={`Average winning score – average losing score, by division and round (${scopeLabel}). The All column covers every round.`}>
        <table style={{ width:'100%', borderCollapse:'collapse' }}>
          <thead><tr>
            <th style={{ ...th, textAlign:'left' }}>Division</th>
            {weeks.map(w => <th key={w} style={th}>{ROUNDS[w]}</th>)}
            <th style={{ ...th, color:'var(--burnt)' }}>All</th>
          </tr></thead>
          <tbody>{CLASSES.filter(c => all.some(g => g.classification === c)).map(c => {
            const base = all.filter(g => g.classification === c && (scope === 'all' || g.year === current))
            const cell = gs => gs.length ? <><strong>{f1(avg(gs.map(g => g.high)))}</strong><span style={{ color:'var(--mid)' }}> – {f1(avg(gs.map(g => g.low)))}</span></> : '—'
            return (
              <tr key={c}>
                <td style={{ ...tdl, fontWeight:600 }}>{c}</td>
                {weeks.map(w => <td key={w} style={{ ...td, background: String(w) === round ? 'rgba(70,29,124,0.06)' : 'transparent' }}>{cell(base.filter(g => g.week === w))}</td>)}
                <td style={{ ...td, background:'rgba(253,208,35,0.12)' }}>{cell(base)}</td>
              </tr>
            )
          })}
          <tr>
            <td style={{ ...tdl, fontWeight:700 }}>All divisions</td>
            {weeks.map(w => { const gs = all.filter(g => g.week === w && (scope === 'all' || g.year === current)); return <td key={w} style={{ ...td, fontWeight:700 }}>{gs.length ? `${f1(avg(gs.map(g => g.high)))} – ${f1(avg(gs.map(g => g.low)))}` : '—'}</td> })}
            {(() => { const gs = all.filter(g => scope === 'all' || g.year === current); return <td style={{ ...td, fontWeight:700, background:'rgba(253,208,35,0.12)' }}>{gs.length ? `${f1(avg(gs.map(g => g.high)))} – ${f1(avg(gs.map(g => g.low)))}` : '—'}</td> })()}
          </tr></tbody>
        </table>
      </Card>

      <Card n="3" title="Closest Games" intro={`Smallest winning margins, ${scopeLabel}.`}>
        <GameList games={top(scoped, 'margin', 10, true)} value={g => g.margin} valueLabel="Margin" />
      </Card>

      <Card n="4" title="Biggest Blowouts" intro={`Largest winning margins, ${scopeLabel}.${kind === 'six' ? ' Six-man games end once a team leads by 45 at halftime or later, so final margins rarely go far past 45 unless the lead came late.' : ''}`}>
        <GameList games={top(scoped, 'margin')} value={g => g.margin} valueLabel="Margin" />
      </Card>

      <Card n="5" title="Highest-Scoring Games" intro={`Most combined points, ${scopeLabel}.`}>
        <GameList games={top(scoped, 'total')} value={g => g.total} valueLabel="Total" />
      </Card>

      <Card n="6" title="Lowest-Scoring Games" intro={`Fewest combined points, ${scopeLabel}.`}>
        <GameList games={top(scoped, 'total', 10, true)} value={g => g.total} valueLabel="Total" />
      </Card>

      <Card n="7" title="Most Points by One Team" intro={`Single-team scoring highs, ${scopeLabel}.`}>
        <GameList games={top(scoped, 'high')} value={g => g.high} valueLabel="Points" />
      </Card>

      <Card n="8" title="Shutouts" intro={`Games where a team didn't score, by round, ${current} vs. history, with the most recent ones.`}>
        <table style={{ width:'100%', borderCollapse:'collapse', marginBottom:12 }}>
          <thead><tr><th style={{ ...th, textAlign:'left' }}>Round</th><th style={th}>{current} shutouts</th><th style={th}>{current} rate</th><th style={th}>Historical shutouts</th><th style={th}>Historical rate</th></tr></thead>
          <tbody>{weeks.map(w => {
            const s = season.filter(g => g.week === w), h = hist.filter(g => g.week === w)
            const ss = s.filter(g => g.low === 0).length, hs = h.filter(g => g.low === 0).length
            return <tr key={w}><td style={{ ...tdl, fontWeight:600 }}>{ROUNDS[w]}</td><td style={{ ...td, fontWeight:700 }}>{ss}</td><td style={td}>{pct(ss, s.length)}</td><td style={td}>{hs}</td><td style={td}>{pct(hs, h.length)}</td></tr>
          })}</tbody>
        </table>
        <GameList games={[...scoped.filter(g => g.low === 0)].sort((a, b) => b.year - a.year || b.week - a.week || b.margin - a.margin).slice(0, 10)} value={g => g.margin} valueLabel="Margin" />
      </Card>

      <Card n="9" title="Six-Man vs. Eleven-Man" intro="Six-man football scores very differently from eleven-man. Average combined points and margin by round, all seasons on file.">
        <table style={{ width:'100%', borderCollapse:'collapse' }}>
          <thead><tr><th style={{ ...th, textAlign:'left' }}>Round</th><th style={th}>Six-man avg total</th><th style={th}>Six-man avg margin</th><th style={th}>Eleven-man avg total</th><th style={th}>Eleven-man avg margin</th><th style={th}>Six-man 45+ margins</th></tr></thead>
          <tbody>{weeks.map(w => {
            const six = raw.filter(g => g.week === w && sixMan(g)), ele = raw.filter(g => g.week === w && !sixMan(g))
            return <tr key={w}><td style={{ ...tdl, fontWeight:600 }}>{ROUNDS[w]}</td>
              <td style={{ ...td, fontWeight:700 }}>{f1(avg(six.map(g => g.total)))}</td><td style={td}>{f1(avg(six.map(g => g.margin)))}</td>
              <td style={{ ...td, fontWeight:700 }}>{f1(avg(ele.map(g => g.total)))}</td><td style={td}>{f1(avg(ele.map(g => g.margin)))}</td>
              <td style={td}>{pct(six.filter(g => g.margin >= 45).length, six.length)}</td></tr>
          })}</tbody>
        </table>
        <div style={{ fontSize:11, color:'var(--mid)', marginTop:6 }}>Six-man games end when one team leads by 45 or more after halftime, so its margins cluster at 45+.</div>
      </Card>

      {kind === 'six' && (
        <Card n="9b" title="Mercy-Rule Games" intro={`Six-man games decided by 45 or more, by round (${current} vs. history) and by chapter (${scopeLabel}).`}>
          <table style={{ width:'100%', borderCollapse:'collapse', marginBottom:12 }}>
            <thead><tr><th style={{ ...th, textAlign:'left' }}>Round</th><th style={th}>{current} mercy-rule games</th><th style={th}>{current} rate</th><th style={th}>Historical</th><th style={th}>Historical rate</th></tr></thead>
            <tbody>{weeks.map(w => {
              const s6 = season.filter(g => g.week === w), h6 = hist.filter(g => g.week === w)
              const a = s6.filter(g => g.margin >= 45).length, b = h6.filter(g => g.margin >= 45).length
              return <tr key={w}><td style={{ ...tdl, fontWeight:600 }}>{ROUNDS[w]}</td><td style={{ ...td, fontWeight:700 }}>{a}</td><td style={td}>{pct(a, s6.length)}</td><td style={td}>{b}</td><td style={td}>{pct(b, h6.length)}</td></tr>
            })}</tbody>
          </table>
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead><tr><th style={{ ...th, textAlign:'left' }}>Chapter</th><th style={th}>Six-man games</th><th style={th}>Mercy-rule games</th><th style={th}>Rate</th></tr></thead>
            <tbody>{chapters.slice().sort((a, b) => b.blow / b.n - a.blow / a.n).map(x => (
              <tr key={x.c}><td style={{ ...td, textAlign:'left' }}><Chip c={x.c} /></td><td style={td}>{x.n}</td><td style={{ ...td, fontWeight:700 }}>{x.blow}</td><td style={td}>{pct(x.blow, x.n)}</td></tr>
            ))}</tbody>
          </table>
        </Card>
      )}

      <Card n="10" title="Chapter Scoring Profiles" intro={`For the games each chapter worked (${scopeLabel}${round === 'all' ? '' : `, ${ROUNDS[round]}`}): average points, average margin, close games (8 or fewer), ${kind === 'six' ? 'mercy-rule games (45+)' : 'blowouts (35+)'} and shutouts. Chapters with at least 5 scored games.`}>
        <table style={{ width:'100%', borderCollapse:'collapse' }}>
          <thead><tr><th style={{ ...th, textAlign:'left' }}>Chapter</th><th style={th}>Games</th><th style={th}>Avg total</th><th style={th}>Avg margin</th><th style={th}>Close</th><th style={th}>{kind === 'six' ? 'Mercy-rule' : 'Blowouts'}</th><th style={th}>Shutouts</th></tr></thead>
          <tbody>{chapters.map(x => (
            <tr key={x.c}>
              <td style={{ ...td, textAlign:'left' }}><Chip c={x.c} /></td>
              <td style={td}>{x.n}</td><td style={{ ...td, fontWeight:700 }}>{f1(x.total)}</td><td style={td}>{f1(x.margin)}</td>
              <td style={td}>{x.close} <span style={{ color:'var(--mid)' }}>({pct(x.close, x.n)})</span></td>
              <td style={td}>{x.blow} <span style={{ color:'var(--mid)' }}>({pct(x.blow, x.n)})</span></td>
              <td style={td}>{x.shut}</td>
            </tr>
          ))}</tbody>
        </table>
        <div style={{ fontSize:11, color:'var(--mid)', marginTop:6 }}>{kind === 'six' ? 'Six-man games only.' : 'Eleven-man games only; switch to Six-man above for six-man.'}</div>
      </Card>
      <div style={{ fontFamily:'var(--mono)', fontSize:10, color:'var(--mid)' }}>Games without a final score, forfeits and recorded ties (a data-entry error, since playoff games can't tie) aren't counted.</div>
    </div>
  )
}
