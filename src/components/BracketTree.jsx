import { UilTag, UIL_TIP } from '../uilPick'
import React, { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { placeName, gameWhen } from '../placeName'
import { chapterColor, UNASSIGNED } from '../chapterColors'
import { hasChanges, changeText, ALERT } from '../changes'

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

// UIL's bracket line for each first-round game, from this season's seeds and UIL's fixed bracket
// order (public/data/bracket_template.json): lets an in-progress bracket be laid out in UIL's order
let orderCache = null
function useBracketOrder(year) {
  const [d, setD] = useState(orderCache)
  useEffect(() => {
    if (orderCache) return
    Promise.all(['seeds', 'bracket_template'].map(f => fetch(`${import.meta.env.BASE_URL}data/${f}.json?v=${__BUILD_TIME__}`).then(r => r.ok ? r.json() : null).catch(() => null)))
      .then(([seeds, tpl]) => { orderCache = { seeds: seeds || {}, tpl: tpl?.classes || {} }; setD(orderCache) })
  }, [])
  return useMemo(() => cls => {
    const s = d?.seeds?.[year]?.[cls], t = d?.tpl?.[cls]
    if (!s || !t) return null
    const idx = Object.fromEntries(t.map((l, i) => [l, i]))
    const line = team => { const x = s[team]; return x ? idx[`${'WRTF'[x.place - 1]}${x.district}`] : undefined }
    return g => { const a = line(g.team1), b = line(g.team2); return a == null || b == null ? null : Math.min(a, b) }
  }, [d, year])
}

export function buildBracket(games, posOf) {
  const counts = {}
  games.forEach(g => { counts[g.week] = (counts[g.week] || 0) + 1 })
  // first-round size: the largest the data implies (a later round of n games means 2^i n first-round games)
  // weeks 1-5 are rounds 1-5; week 6 (the final) is round 5 for 1A (which skips week 5) and round 6 for
  // everyone else, so it only sets the size when nothing earlier is known
  let size = 1
  ;[1, 2, 3, 4, 5].forEach((w, i) => { if (counts[w]) size = Math.max(size, counts[w] * 2 ** i) })
  if (size === 1 && counts[6]) size = 32
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
    // in progress: the source's first-round order isn't always bracket order, so arrange it from the
    // later-round games already set: the two first-round blocks that feed a known game become siblings
    let first = byRound[0].slice()
    const pos = posOf ? first.map(posOf) : []
    const byUIL = first.length > 0 && pos.length === first.length && pos.every(p => p != null)
    if (byUIL) first = first.map((g, i) => [pos[i], g]).sort((a, b) => a[0] - b[0]).map(x => x[1])   // UIL's own bracket order
    for (let r = 1; r < R && !byUIL; r++) {
      const size = 2 ** (r - 1)   // first-round games per feeder block at this round
      for (const g of byRound[r]) {
        const blockOf = t => { const i = first.findIndex(x => has(x, t)); return i < 0 ? -1 : Math.floor(i / size) }
        const a = blockOf(g.team1), b = blockOf(g.team2)
        if (a < 0 || b < 0 || a === b || (a ^ 1) === b) continue
        const s = a ^ 1   // swap block b into a's sibling place
        for (let j = 0; j < size; j++) {
          const x = s * size + j, y = b * size + j
          ;[first[x], first[y]] = [first[y], first[x]]
        }
      }
    }
    first.forEach((g, k) => { if (k < slots[0].length) slots[0][k] = g })
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
  const [printing, setPrinting] = useState(null)   // divisions being printed, or null

  const orderFor = useBracketOrder(year)
  const bracket = useMemo(() => current ? buildBracket(games.filter(g => g.classification === current), orderFor(current)) : null, [games, current, orderFor])
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

  const pdfBtn = { fontFamily:'var(--mono)', fontSize:9, letterSpacing:'0.08em', padding:'5px 10px', borderRadius:4, cursor:'pointer',
                  border:'1px solid var(--burnt)', background:'transparent', color:'var(--burnt)', fontWeight:600 }

  return (
    <div>
      {printing && <PrintBrackets games={games} classes={printing} year={year} inProgress={inProgress} onDone={() => setPrinting(null)} />}
      <div style={{ display:'flex', gap:4, flexWrap:'wrap', marginBottom:10 }}>
        {classes.map(c => <button key={c} onClick={() => { setCls(c); setOnlyCh(null) }} style={chip(c === current)}>{c}</button>)}
      </div>
      <div style={{ display:'flex', alignItems:'center', gap:4, flexWrap:'wrap', marginBottom:14 }}>
        <span style={{ fontFamily:'var(--mono)', fontSize:9, letterSpacing:'0.14em', textTransform:'uppercase', color:'var(--mid)', marginRight:4 }}>Start at:</span>
        {names.slice(0, R - 1).map((n, r) => (
          <button key={r} onClick={() => setFrom(r)} style={{ ...chip(r === start), background: r === start ? 'var(--ink)' : 'transparent' }}>{n}</button>
        ))}
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
          <div style={{ display:'flex', gap:6 }}>
            <button onClick={() => setPrinting([current])} style={pdfBtn} title="Opens your browser's print window: choose Save as PDF">⤓ PDF: {current}</button>
            <button onClick={() => setPrinting(classes)} style={pdfBtn} title="Every division, one per page">⤓ PDF: all divisions</button>
          </div>
          <div style={{ fontFamily:'var(--mono)', fontSize:10, color:'var(--mid)' }}>
            {champ ? <>State champion: <strong style={{ color:'var(--burnt)' }}>{champ}</strong></> : 'Click a game for its MaxPreps page · chapter codes on each game'}
          </div>
        </div>
        <div style={{ overflowX:'auto', paddingBottom:6 }}>
          <TreeView slots={slots} names={names} R={R} start={start} follow={follow} setFollow={setFollow}
                    inProgress={inProgress} onlyCh={onlyCh} />
        </div>
      </div>
      <div style={{ fontFamily:'var(--mono)', fontSize:10, color:'var(--mid)', marginTop:8, lineHeight:1.6 }}>
        Brackets are drawn from the UIL and MaxPreps brackets and fill in as results come in. Hover a game for its site and date.
      </div>
    </div>
  )
}

// the drawn bracket, two-sided like UIL's printed brackets: the top half of the draw runs left to right,
// the bottom half right to left, and the two meet at the State Final in the middle, so each half's
// champions face each other across the page. Rounds before `start` are left off.
function TreeView({ slots, names, R, start, follow = null, setFollow = () => {}, inProgress, onlyCh = null }) {
  const n = R - 1 - start                       // rounds on each side before the final
  const half = r => slots[r].length / 2         // games per side in round r
  const height = Math.max(1, half(start)) * ROW
  const width = (2 * n + 1) * (BOX_W + GAP) - GAP
  const x = c => c * (BOX_W + GAP)              // column c, 0 = far left
  const y = (r, k) => { const rr = r - start; return (k * 2 ** rr + (2 ** rr - 1) / 2) * ROW + (ROW - BOX_H) / 2 }
  const yFinal = (height - BOX_H) / 2
  const final = slots[R - 1][0]
  const side = (r, s) => slots[r].slice(s * half(r), (s + 1) * half(r))   // s 0 = left (top half), 1 = right
  const colOf = (r, s) => s === 0 ? r - start : 2 * n - (r - start)
  const titles = [...Array(2 * n + 1)].map((_, c) => names[c < n ? start + c : c === n ? R - 1 : start + 2 * n - c])
  const line = (d, on, key) => <path key={key} d={d} fill="none" stroke={on ? 'var(--burnt)' : '#c9c2b8'} strokeWidth={on ? 2 : 1} />
  const lines = []
  for (let s = 0; s < 2; s++) {
    for (let r = start + 1; r < R - 1; r++) {
      side(r, s).forEach((g, k) => {
        const a = side(r - 1, s)[2 * k], b = side(r - 1, s)[2 * k + 1]
        const ca = colOf(r - 1, s), cb = colOf(r, s)
        const xa = s === 0 ? x(ca) + BOX_W : x(ca), xb = s === 0 ? x(cb) : x(cb) + BOX_W, xm = (xa + xb) / 2
        const yb = y(r, k) + BOX_H / 2
        const lit = t => follow && has(t, follow) && has(g, follow)
        lines.push(line(`M${xa},${y(r - 1, 2 * k) + BOX_H / 2} H${xm} V${yb}`, lit(a), `${s}-${r}-${k}-a`))
        lines.push(line(`M${xa},${y(r - 1, 2 * k + 1) + BOX_H / 2} H${xm} V${yb}`, lit(b), `${s}-${r}-${k}-b`))
        lines.push(line(`M${xm},${yb} H${xb}`, follow && has(g, follow), `${s}-${r}-${k}-c`))
      })
    }
    // each side's last game into the final
    const g = side(R - 2, s)[0], c = colOf(R - 2, s)
    const xa = s === 0 ? x(c) + BOX_W : x(c), xb = s === 0 ? x(n) : x(n) + BOX_W
    const ya = y(R - 2, 0) + BOX_H / 2, yb = yFinal + BOX_H / 2
    lines.push(line(`M${xa},${ya} H${(xa + xb) / 2} V${yb} H${xb}`, follow && has(g, follow) && has(final, follow), `${s}-final`))
  }
  return (
    <div style={{ width }}>
      <div style={{ display:'flex', gap:GAP, width, margin:'10px 0 6px' }}>
        {titles.map((t, c) => (
          <div key={c} style={{ width:BOX_W, flexShrink:0, fontFamily:'var(--mono)', fontSize:9, letterSpacing:'0.12em', textTransform:'uppercase',
            color: c === n ? 'var(--burnt)' : 'var(--mid)', textAlign: c === n ? 'center' : c > n ? 'right' : 'left', fontWeight: c === n ? 700 : 400 }}>{t}</div>
        ))}
      </div>
      <div style={{ position:'relative', width, height }}>
        <svg width={width} height={height} style={{ position:'absolute', inset:0 }} aria-hidden="true">{lines}</svg>
        {[0, 1].map(s => [...Array(n)].map((_, i) => side(start + i, s).map((g, k) => (
          <Box key={`${s}-${i}-${k}`} g={g} left={x(colOf(start + i, s))} top={y(start + i, k)} follow={follow} setFollow={setFollow}
               inProgress={inProgress} final={false} onlyCh={onlyCh} />
        ))))}
        <Box g={final} left={x(n)} top={yFinal} follow={follow} setFollow={setFollow} inProgress={inProgress} final onlyCh={onlyCh} />
      </div>
    </div>
  )
}

// Print-only copy of one or more divisions, one per page, each scaled to fit a letter page.
// Rendered into <body> so print CSS can hide the rest of the site (see .print-root in index.css).
const PAGE_W = 990, PAGE_H = 680   // CSS pixels of a landscape letter page inside 0.35in margins, less the title
function PrintBrackets({ games, classes, year, inProgress, onDone }) {
  const orderFor = useBracketOrder(year)
  useEffect(() => {
    document.body.classList.add('printing')
    const done = () => { document.body.classList.remove('printing'); onDone() }
    window.addEventListener('afterprint', done, { once: true })
    const t = setTimeout(() => window.print(), 300)
    return () => { clearTimeout(t); window.removeEventListener('afterprint', done); document.body.classList.remove('printing') }
  }, [])
  const printed = new Date().toLocaleString('en-US', { month:'short', day:'numeric', year:'numeric', hour:'numeric', minute:'2-digit', timeZone:'America/Chicago' })
  return createPortal(
    <div className="print-root">
      {classes.map(c => {
        const b = buildBracket(games.filter(g => g.classification === c), orderFor(c))
        const width = (2 * (b.R - 1) + 1) * (BOX_W + GAP) - GAP, height = Math.max(1, b.slots[0].length / 2) * ROW + 30
        const scale = Math.min(1, PAGE_W / width, PAGE_H / height)
        const champ = winnerOf(b.slots[b.R - 1][0])
        return (
          <div key={c} className="print-page">
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', borderBottom:'2px solid #461D7C', paddingBottom:4, marginBottom:6 }}>
              <div style={{ fontFamily:"'Bebas Neue', sans-serif", fontSize:26, color:'#0F0D0B' }}>{year} UIL Football Playoffs · {c}</div>
              <div style={{ fontFamily:'var(--mono)', fontSize:9, color:'#6B6058', textAlign:'right' }}>
                {champ ? `State champion: ${champ} · ` : ''}texasplayoffs.com · printed {printed} CT
              </div>
            </div>
            <div style={{ width: width * scale, height: height * scale, overflow:'hidden' }}>
              <div style={{ transform:`scale(${scale})`, transformOrigin:'top left' }}>
                <TreeView slots={b.slots} names={b.names} R={b.R} start={0} inProgress={inProgress} />
              </div>
            </div>
            <div style={{ fontFamily:'var(--mono)', fontSize:8, color:'#6B6058', marginTop:6 }}>
              Colored tab = officiating chapter (? = not assigned yet). Brackets from the UIL and MaxPreps brackets; check texasplayoffs.com for the latest.
            </div>
          </div>
        )
      })}
    </div>,
    document.body
  )
}

function Box({ g, left, top, follow, setFollow, inProgress, final, onlyCh }) {
  const base = { position:'absolute', left, top, width:BOX_W, height:BOX_H, borderRadius:5, boxSizing:'border-box' }
  if (!g) {
    return <div style={{ ...base, border:'1px dashed var(--border)', background:'transparent' }} />
  }
  const w = winnerOf(g)
  const lit = follow && has(g, follow)
  const tip = [hasChanges(g) && `⚠ CHANGED: ${changeText(g)}`, g.chapter && `Chapter: ${g.chapter}${g.uil_pick ? ' (UIL pick)' : ''}`, g.site && placeName(g), g.date && gameWhen(g), g.mp_url && 'Click for the MaxPreps game page'].filter(Boolean).join(' · ')
  const row = (t, s) => {
    const win = w && t === w, lose = w && t !== w
    return (
      <div style={{ display:'flex', alignItems:'center', gap:4, height:(BOX_H - 2) / 2, padding:'0 6px' }}>
        <span style={{ flex:1, minWidth:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', fontSize:11,
                       fontWeight: win ? 700 : 400, color: lose ? 'var(--mid)' : 'var(--ink)' }}>{t || '—'}</span>
        {s != null && <span style={{ fontFamily:'var(--mono)', fontSize:10, fontWeight: win ? 700 : 400, color: win ? 'var(--burnt)' : 'var(--mid)' }}>{s}</span>}
      </div>
    )
  }
  return (
    <div title={tip || (inProgress ? 'Site and date to be announced' : '')}
         onClick={g.mp_url ? () => window.open(g.mp_url, '_blank', 'noopener,noreferrer') : undefined}
         style={{ ...base, background:'var(--surface)', overflow:'hidden', display:'flex', cursor: g.mp_url ? 'pointer' : 'default',
                  opacity: onlyCh && (g.chapter || 'none') !== onlyCh ? 0.25 : 1, transition:'opacity 0.15s',
                  border: `${hasChanges(g) ? 2 : 1}px solid ${hasChanges(g) ? ALERT : lit ? 'var(--burnt)' : final ? 'var(--gold)' : 'var(--border)'}`,
                  boxShadow: lit ? '0 0 0 1px var(--burnt)' : 'none' }}>
      <div style={{ width:28, flexShrink:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
                    fontFamily:'var(--mono)', fontSize:8, letterSpacing:'0.04em',
                    background: g.chapter ? chapterColor(g.chapter) : UNASSIGNED, color: g.chapter ? '#fff' : 'var(--ink)' }}>
        {g.chapter || '?'}
        {g.uil_pick && <span title={UIL_TIP} style={{ fontSize:6, fontWeight:700, marginTop:1, padding:'0 2px', borderRadius:2, background:'var(--gold)', color:'var(--ink)' }}>UIL</span>}
      </div>
      <div style={{ flex:1, minWidth:0 }}>
        {row(g.team1, g.score1)}
        <div style={{ height:1, background:'var(--border)', margin:'0 6px' }} />
        {row(g.team2, g.score2)}
      </div>
      {hasChanges(g) && <span style={{ position:'absolute', right:0, top:0, background:ALERT, color:'#fff', fontSize:8, fontWeight:700,
                                       fontFamily:'var(--mono)', padding:'0 4px', borderBottomLeftRadius:3, lineHeight:'12px' }}>!</span>}
    </div>
  )
}
