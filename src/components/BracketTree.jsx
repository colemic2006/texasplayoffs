import React, { useMemo, useState } from 'react'
import { placeName, gameWhen } from '../placeName'
import { chapterColor, UNASSIGNED } from '../chapterColors'

// Classic bracket tree for one classification, drawn from the season's games.
// The games come from the UIL / MaxPreps brackets in bracket order, so first-round games
// 2k and 2k+1 feed the k-th game of the next round. A finished bracket is traced back
// from the final instead (each team's previous game), which doesn't depend on that order.

const ORDER = ['6A D1','6A D2','5A D1','5A D2','4A D1','4A D2','3A D1','3A D2','2A D1','2A D2','1A D1','1A D2','Six Man D1','Six Man D2']
const FALLBACK = ['Bi-District','Area','Regionals','Quarterfinals','Semifinals','State Final']
const BOX_W = 154, BOX_H = 46, ROW = 54, GAP = 20

const winnerOf = g => g && (g.winner || (g.score1 != null && g.score2 != null && g.score1 !== g.score2
  ? (g.score1 > g.score2 ? g.team1 : g.team2) : null))
const has = (g, t) => g && t && (g.team1 === t || g.team2 === t)

export function buildBracket(games) {
  const counts = {}
  games.forEach(g => { counts[g.week] = (counts[g.week] || 0) + 1 })
  // first-round size: the largest the data implies (a later round of n games means 2^i n first-round games)
  let size = 1
  ;[1, 2, 3, 4, 5, 6].forEach((w, i) => { if (counts[w]) size = Math.max(size, counts[w] * 2 ** i) })
  const R = Math.round(Math.log2(size)) + 1
  // 1A (and old six-man) play their state final in week 6 after an open week 5
  const weeks = R >= 6 ? [1, 2, 3, 4, 5, 6] : [...Array(R - 1).keys()].map(i => i + 1).concat(6)
  const byRound = weeks.map(w => games.filter(g => g.week === w))
  const slots = byRound.map((_, r) => Array(2 ** (R - 1 - r)).fill(null))
  const final = byRound[R - 1][0]

  if (final && byRound[0].length) {
    // trace back from the final: each team's game in the round before
    slots[R - 1][0] = final
    for (let r = R - 1; r > 0; r--) {
      slots[r].forEach((g, k) => {
        if (!g) return
        const prev = byRound[r - 1]
        let feeds = [g.team1, g.team2].map(t => prev.find(p => has(p, t)) || null)
        // keep the source's top-to-bottom order
        if (feeds[0] && feeds[1] && prev.indexOf(feeds[0]) > prev.indexOf(feeds[1])) feeds = [feeds[1], feeds[0]]
        slots[r - 1][2 * k] = feeds[0]
        slots[r - 1][2 * k + 1] = feeds[1]
      })
    }
  } else {
    // in progress: first round in source order, later rounds matched to the winners that feed them
    byRound[0].forEach((g, k) => { if (k < slots[0].length) slots[0][k] = g })
    for (let r = 1; r < R; r++) {
      const used = new Set()
      slots[r].forEach((_, k) => {
        const ws = [winnerOf(slots[r - 1][2 * k]), winnerOf(slots[r - 1][2 * k + 1])].filter(Boolean)
        const g = byRound[r].find(x => !used.has(x) && ws.some(w => has(x, w)))
        if (g) { used.add(g); slots[r][k] = g }
      })
      byRound[r].filter(x => !used.has(x)).forEach(x => {
        const k = slots[r].indexOf(null)
        if (k >= 0) slots[r][k] = x
      })
    }
  }
  // named counting back from the final, so 1A's first round is "Area" like the UIL brackets
  const names = slots.map((_, r) => FALLBACK[FALLBACK.length - R + r] || `Round ${r + 1}`)
  return { R, slots, names }
}

export default function BracketTree({ data, year }) {
  const games = data?.games || []
  const inProgress = data?.season?.status === 'in_progress'
  const classes = ORDER.filter(c => games.some(g => g.classification === c))
  const [cls, setCls] = useState(null)
  const current = classes.includes(cls) ? cls : classes[0]
  const [from, setFrom] = useState(0)
  const [follow, setFollow] = useState(null)
  const [onlyCh, setOnlyCh] = useState(null)

  const bracket = useMemo(() => current ? buildBracket(games.filter(g => g.classification === current)) : null, [games, current])
  if (!bracket) return null
  const { R, slots, names } = bracket
  const start = Math.min(from, R - 1)
  const cols = slots.slice(start)
  const rows = cols[0].length
  const height = rows * ROW
  const width = cols.length * (BOX_W + GAP) - GAP
  const y = (r, k) => (k * 2 ** r + (2 ** r - 1) / 2) * ROW + (ROW - BOX_H) / 2
  const x = r => r * (BOX_W + GAP)
  const champ = winnerOf(slots[R - 1][0])
  const legendCount = {}
  cols.flat().forEach(g => { if (g) legendCount[g.chapter || 'none'] = (legendCount[g.chapter || 'none'] || 0) + 1 })
  const legend = Object.entries(legendCount).sort((a, b) => (a[0] === 'none') - (b[0] === 'none') || b[1] - a[1] || a[0].localeCompare(b[0]))

  const chip = on => ({
    fontFamily:'var(--mono)', fontSize:9, letterSpacing:'0.08em', padding:'4px 10px', borderRadius:3,
    border:'1px solid var(--border)', cursor:'pointer',
    background: on ? 'var(--burnt)' : 'transparent', color: on ? '#fff' : 'var(--mid)',
  })

  return (
    <div>
      <div style={{ display:'flex', gap:4, flexWrap:'wrap', marginBottom:10 }}>
        {classes.map(c => <button key={c} onClick={() => { setCls(c); setFollow(null); setOnlyCh(null) }} style={chip(c === current)}>{c}</button>)}
      </div>
      <div style={{ display:'flex', alignItems:'center', gap:4, flexWrap:'wrap', marginBottom:14 }}>
        <span style={{ fontFamily:'var(--mono)', fontSize:9, letterSpacing:'0.14em', textTransform:'uppercase', color:'var(--mid)', marginRight:4 }}>Start at:</span>
        {names.slice(0, R - 1).map((n, r) => (
          <button key={r} onClick={() => setFrom(r)} style={{ ...chip(r === start), background: r === start ? 'var(--ink)' : 'transparent' }}>{n}</button>
        ))}
        {follow && (
          <button onClick={() => setFollow(null)} style={{ ...chip(true), marginLeft:'auto' }}>Following {follow} ✕</button>
        )}
      </div>

      {legend.length > 0 && (
        <div style={{ display:'flex', alignItems:'center', gap:4, flexWrap:'wrap', marginBottom:14 }}>
          <span style={{ fontFamily:'var(--mono)', fontSize:9, letterSpacing:'0.14em', textTransform:'uppercase', color:'var(--mid)', marginRight:4 }}>Chapters:</span>
          {legend.map(([c, n]) => {
            const on = onlyCh === c, col = c === 'none' ? UNASSIGNED : chapterColor(c)
            return (
              <button key={c} onClick={() => setOnlyCh(on ? null : c)} title={on ? 'Show all chapters' : 'Show only this chapter'} style={{
                display:'flex', alignItems:'center', gap:5, fontFamily:'var(--mono)', fontSize:9, letterSpacing:'0.06em',
                padding:'3px 8px', borderRadius:3, cursor:'pointer', border:`1px solid ${on ? col : 'var(--border)'}`,
                background: on ? col : 'transparent', color: on ? (c === 'none' ? 'var(--ink)' : '#fff') : 'var(--ink)',
                opacity: onlyCh && !on ? 0.5 : 1,
              }}>
                <span style={{ width:9, height:9, borderRadius:2, background:col, border: on ? '1px solid #fff' : 'none' }} />
                {c === 'none' ? 'Unassigned' : c} · {n}
              </button>
            )
          })}
        </div>
      )}

      <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:10, padding:'16px 16px 20px' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', flexWrap:'wrap', gap:8, marginBottom:4 }}>
          <div style={{ fontFamily:"'Bebas Neue', sans-serif", fontSize:26, color:'var(--ink)', lineHeight:1 }}>{year} {current}</div>
          <div style={{ fontFamily:'var(--mono)', fontSize:10, color:'var(--mid)' }}>
            {champ ? <>State champion: <strong style={{ color:'var(--burnt)' }}>{champ}</strong></> : 'Click a team to follow its path · chapter codes on each game'}
          </div>
        </div>
        <div style={{ overflowX:'auto', paddingBottom:6 }}>
          <div style={{ display:'flex', gap:GAP, width, margin:'10px 0 6px' }}>
            {cols.map((_, i) => (
              <div key={i} style={{ width:BOX_W, flexShrink:0, fontFamily:'var(--mono)', fontSize:9, letterSpacing:'0.12em', textTransform:'uppercase', color:'var(--mid)' }}>
                {names[start + i]}
              </div>
            ))}
          </div>
          <div style={{ position:'relative', width, height }}>
            <svg width={width} height={height} style={{ position:'absolute', inset:0 }} aria-hidden="true">
              {cols.slice(1).map((col, i) => col.map((g, k) => {
                const r = i + 1
                const xa = x(i) + BOX_W, xb = x(r), xm = xa + GAP / 2
                const yb = y(r, k) + BOX_H / 2
                const ya1 = y(i, 2 * k) + BOX_H / 2, ya2 = y(i, 2 * k + 1) + BOX_H / 2
                const on = follow && (has(g, follow) || has(cols[i][2 * k], follow) || has(cols[i][2 * k + 1], follow))
                const lit = t => follow && has(cols[i][t], follow) && has(g, follow)
                return (
                  <g key={`${r}-${k}`} fill="none" strokeWidth={1}>
                    <path d={`M${xa},${ya1} H${xm} V${yb}`} stroke={lit(2 * k) ? 'var(--burnt)' : 'var(--border)'} strokeWidth={lit(2 * k) ? 2 : 1} />
                    <path d={`M${xa},${ya2} H${xm} V${yb}`} stroke={lit(2 * k + 1) ? 'var(--burnt)' : 'var(--border)'} strokeWidth={lit(2 * k + 1) ? 2 : 1} />
                    <path d={`M${xm},${yb} H${xb}`} stroke={on && has(g, follow) ? 'var(--burnt)' : 'var(--border)'} strokeWidth={on && has(g, follow) ? 2 : 1} />
                  </g>
                )
              }))}
            </svg>
            {cols.map((col, i) => col.map((g, k) => (
              <Box key={`${i}-${k}`} g={g} left={x(i)} top={y(i, k)} follow={follow} setFollow={setFollow}
                   inProgress={inProgress} final={start + i === R - 1} onlyCh={onlyCh} />
            )))}
          </div>
        </div>
      </div>
      <div style={{ fontFamily:'var(--mono)', fontSize:10, color:'var(--mid)', marginTop:8, lineHeight:1.6 }}>
        Brackets are drawn from the UIL and MaxPreps brackets and fill in as results come in. Hover a game for its site and date.
      </div>
    </div>
  )
}

function Box({ g, left, top, follow, setFollow, inProgress, final, onlyCh }) {
  const base = { position:'absolute', left, top, width:BOX_W, height:BOX_H, borderRadius:5, boxSizing:'border-box' }
  if (!g) {
    return <div style={{ ...base, border:'1px dashed var(--border)', background:'transparent' }} />
  }
  const w = winnerOf(g)
  const lit = follow && has(g, follow)
  const tip = [g.chapter && `Chapter: ${g.chapter}`, g.site && placeName(g), g.date && gameWhen(g)].filter(Boolean).join(' · ')
  const row = (t, s) => {
    const win = w && t === w, lose = w && t !== w
    return (
      <div onClick={() => t && setFollow(follow === t ? null : t)}
           style={{ display:'flex', alignItems:'center', gap:4, height:(BOX_H - 2) / 2, padding:'0 6px', cursor:'pointer',
                    background: follow && t === follow ? 'rgba(70,29,124,0.10)' : 'transparent' }}>
        <span style={{ flex:1, minWidth:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', fontSize:11,
                       fontWeight: win ? 700 : 400, color: lose ? 'var(--mid)' : 'var(--ink)' }}>{t || '—'}</span>
        {s != null && <span style={{ fontFamily:'var(--mono)', fontSize:10, fontWeight: win ? 700 : 400, color: win ? 'var(--burnt)' : 'var(--mid)' }}>{s}</span>}
      </div>
    )
  }
  return (
    <div title={tip || (inProgress ? 'Site and date to be announced' : '')}
         style={{ ...base, background:'var(--surface)', overflow:'hidden', display:'flex',
                  opacity: onlyCh && (g.chapter || 'none') !== onlyCh ? 0.25 : 1, transition:'opacity 0.15s',
                  border: `1px solid ${lit ? 'var(--burnt)' : final ? 'var(--gold)' : 'var(--border)'}`,
                  boxShadow: lit ? '0 0 0 1px var(--burnt)' : 'none' }}>
      <div style={{ width:28, flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center',
                    fontFamily:'var(--mono)', fontSize:8, letterSpacing:'0.04em',
                    background: g.chapter ? chapterColor(g.chapter) : UNASSIGNED, color: g.chapter ? '#fff' : 'var(--ink)' }}>
        {g.chapter || '?'}
      </div>
      <div style={{ flex:1, minWidth:0 }}>
        {row(g.team1, g.score1)}
        <div style={{ height:1, background:'var(--border)', margin:'0 6px' }} />
        {row(g.team2, g.score2)}
      </div>
    </div>
  )
}
