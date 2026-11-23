import React, { useEffect, useMemo, useState } from 'react'
import { chapterColor } from '../chapterColors'

// Does a chapter's share of playoff games follow its share of TASO members? By classification.
// Members: the current season's membership (public/data/membership.json); games: 2022 on, the
// seasons membership numbers cover.
const NAMES = {
  ABI:'Abilene', AMA:'Amarillo', AUS:'Austin', BEA:'Southeast Texas', COM:'Commerce', CSC:'College Station', CTX:'Central Texas',
  DAL:'Dallas', ELP:'El Paso', FTW:'Fort Worth', HOU:'Houston', NTX:'North Texas', PBC:'Permian Basin', PVC:'Pecan Valley',
  RGV:'Rio Grande Valley', SAN:'San Angelo', SAT:'San Antonio', SFA:'Stephen F. Austin', SPC:'South Plains', STX:'South Texas',
  TYL:'Tyler', WAC:'Waco',
}
const CODE = { WACO: 'WAC', ETX: 'TYL' }
const CLASSES = ['6A', '5A', '4A', '3A', '2A', '1A']
const FROM = 2022

function pearson(xs, ys) {
  const n = xs.length, mx = xs.reduce((a, b) => a + b, 0) / n, my = ys.reduce((a, b) => a + b, 0) / n
  let sxy = 0, sxx = 0, syy = 0
  for (let i = 0; i < n; i++) { sxy += (xs[i] - mx) * (ys[i] - my); sxx += (xs[i] - mx) ** 2; syy += (ys[i] - my) ** 2 }
  return sxx && syy ? sxy / Math.sqrt(sxx * syy) : 0
}

export default function SizeVsShare({ members: current, history = {}, allData = {}, years = [], loadAllYears }) {
  const [cls, setCls] = useState('6A')
  const [span, setSpan] = useState('all')   // 'all' (every season from 2022) or one season
  const [hover, setHover] = useState(null)
  useEffect(() => { loadAllYears?.() }, [])
  const allSeasons = years.filter(y => y >= FROM && allData[y]?.games?.length).sort((a, b) => a - b)
  const seasons = span === 'all' ? allSeasons : allSeasons.filter(y => y === span)
  // membership: that season's numbers where on file (2022), East Texas folded into Tyler; otherwise this season's
  const members = useMemo(() => {
    const h = span !== 'all' && history[String(span)]
    if (!h) return current
    const out = {}
    for (const [c, n] of Object.entries(h)) { const k = CODE[c] || c; out[k] = (out[k] || 0) + n }
    return out
  }, [current, history, span])
  const memYear = span !== 'all' && history[String(span)] ? span : 'this season'

  const stats = useMemo(() => {
    if (!members || !seasons.length) return null
    const T = Object.values(members).reduce((a, b) => a + b, 0)
    const count = {}
    for (const y of seasons) for (const g of allData[y].games) {
      if (!g.chapter) continue
      const c = (g.classification || '').slice(0, 2), ch = CODE[g.chapter] || g.chapter
      if (!CLASSES.includes(c)) continue
      ;(count[c] = count[c] || {})[ch] = (count[c][ch] || 0) + 1
    }
    const by = {}
    for (const c of CLASSES) {
      const tot = Object.values(count[c] || {}).reduce((a, b) => a + b, 0)
      const pts = Object.entries(members).map(([ch, n]) => ({ ch, mem: n / T, games: (count[c]?.[ch] || 0), share: tot ? (count[c]?.[ch] || 0) / tot : 0 }))
      by[c] = { tot, pts, r: pearson(pts.map(p => p.mem), pts.map(p => p.share)) }
    }
    return { T, by }
  }, [members, allData, seasons.join()])
  if (!stats) return null
  const cur = stats.by[cls]

  const btn = on => ({ fontFamily:'var(--mono)', fontSize:10, padding:'4px 10px', borderRadius:3, cursor:'pointer',
    border:`1px solid ${on ? 'var(--burnt)' : 'var(--border)'}`, background: on ? 'var(--burnt)' : 'transparent', color: on ? '#fff' : 'var(--mid)' })
  const W = 720, H = 400, L = 54, R = 20, T = 16, B = 44
  const xMax = Math.ceil(100 * Math.max(...cur.pts.map(p => p.mem)) / 5) * 5 / 100
  const yMax = Math.max(xMax, Math.ceil(100 * Math.max(...cur.pts.map(p => p.share)) / 5) * 5 / 100)
  const x = v => L + (W - L - R) * v / xMax, y = v => H - B - (H - T - B) * v / yMax
  const pct = v => `${Math.round(100 * v)}%`
  // axis marks every 5% (every 10% on a tall axis)
  const ticks = m => { const st = m > 0.3 ? 0.1 : 0.05; const out = []; for (let v = 0; v <= m + 1e-9; v += st) out.push(Math.round(v * 100) / 100); return out }
  const ratioCell = (p) => {
    const v = p.mem ? p.share / p.mem : 0
    const bg = !p.games ? 'rgba(200,60,40,0.08)' : v >= 1.15 ? `rgba(80,140,90,${Math.min(0.75, 0.15 + 0.12 * v)})` : v <= 0.85 ? `rgba(200,60,40,${0.12 + 0.3 * (1 - v)})` : 'transparent'
    return { bg, txt: !p.games ? '0' : `${v.toFixed(1)}×`, dark: v >= 3 }
  }
  const th = { fontFamily:'var(--mono)', fontSize:9, letterSpacing:'0.1em', textTransform:'uppercase', color:'var(--mid)', padding:'7px 8px', textAlign:'center', borderBottom:'1px solid var(--border)' }
  const td = { padding:'5px 8px', borderBottom:'1px solid var(--border)', fontSize:12, textAlign:'center', fontFamily:'var(--mono)' }
  const chapters = [...cur.pts].sort((a, b) => b.mem - a.mem).map(p => p.ch)

  return (
    <div style={{ marginTop:40 }}>
      <div style={{ fontFamily:'var(--mono)', fontSize:10, letterSpacing:'0.18em', textTransform:'uppercase', color:'var(--mid)', marginBottom:6 }}>Size and share</div>
      <div className="card-title" style={{ fontFamily:"'Bebas Neue', sans-serif", fontSize:26, color:'var(--ink)', marginBottom:6, paddingBottom:10, borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', gap:12 }}>
        <div style={{ width:4, height:24, borderRadius:2, background:'var(--burnt)' }} />Chapter Size vs. Share of Games, by Class
      </div>
      <div style={{ fontSize:13, color:'var(--mid)', lineHeight:1.55, margin:'8px 0 12px', maxWidth:860 }}>
        If games followed membership, a chapter with 10% of TASO's members would work about 10% of each class's playoff games. In the big classes they do;
        in the small-school classes, size barely matters and a few West Texas chapters work far more than their share. Games from {seasons.length > 1 ? `${seasons[0]}–${seasons[seasons.length - 1]}` : seasons[0]}.
      </div>

      <div style={{ display:'flex', gap:4, flexWrap:'wrap', alignItems:'center', marginBottom:8 }}>
        <span style={{ fontFamily:'var(--mono)', fontSize:9, letterSpacing:'0.14em', textTransform:'uppercase', color:'var(--mid)', marginRight:4 }}>Seasons:</span>
        <button onClick={() => setSpan('all')} style={btn(span === 'all')}>All, {allSeasons[0]}–{allSeasons[allSeasons.length - 1]}</button>
        {[...allSeasons].reverse().map(y => <button key={y} onClick={() => setSpan(y)} style={btn(span === y)}>{y}</button>)}
      </div>
      <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:10, padding:'14px 16px', marginBottom:14 }}>
        <div style={{ fontFamily:'var(--mono)', fontSize:9, letterSpacing:'0.12em', textTransform:'uppercase', color:'var(--mid)', marginBottom:8 }}>How closely game share follows chapter size (correlation, 1 = perfectly)</div>
        {CLASSES.map(c => {
          const r = stats.by[c].r
          return (
            <div key={c} onClick={() => setCls(c)} style={{ display:'grid', gridTemplateColumns:'40px 1fr 60px', gap:10, alignItems:'center', padding:'3px 0', cursor:'pointer' }}>
              <span style={{ fontFamily:'var(--mono)', fontSize:12, fontWeight: c === cls ? 700 : 400, color: c === cls ? 'var(--burnt)' : 'var(--ink)' }}>{c}</span>
              <div style={{ position:'relative', height:12, background:'rgba(15,13,11,0.06)', borderRadius:6 }}>
                <div style={{ position:'absolute', left:0, top:0, bottom:0, width:`${Math.max(0, r) * 100}%`, background: c === cls ? 'var(--burnt)' : '#9B79D2', borderRadius:6 }} />
              </div>
              <span style={{ fontFamily:'var(--mono)', fontSize:12, fontWeight:700, textAlign:'right' }}>{r.toFixed(2)}</span>
            </div>
          )
        })}
      </div>

      <div style={{ display:'flex', gap:4, flexWrap:'wrap', marginBottom:8 }}>
        {CLASSES.map(c => <button key={c} onClick={() => setCls(c)} style={btn(cls === c)}>{c} ({stats.by[c].tot} games)</button>)}
      </div>
      <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:10, padding:'14px 16px', marginBottom:14 }}>
        <svg viewBox={`0 0 ${W} ${H}`} style={{ width:'100%', height:'auto', display:'block' }} role="img"
          aria-label={`Each chapter's share of members against its share of ${cls} playoff games`}>
          {ticks(yMax).map(v => (
            <g key={'y' + v}>
              <line x1={L} x2={W - R} y1={y(v)} y2={y(v)} stroke="rgba(15,13,11,0.07)" />
              <text x={L - 8} y={y(v) + 4} textAnchor="end" fontSize="11" fill="#6B6058" fontFamily="DM Mono">{pct(v)}</text>
            </g>
          ))}
          {ticks(xMax).map(v => (
            <text key={'x' + v} x={x(v)} y={H - B + 18} textAnchor="middle" fontSize="11" fill="#6B6058" fontFamily="DM Mono">{pct(v)}</text>
          ))}
          <line x1={x(0)} y1={y(0)} x2={x(Math.min(xMax, yMax))} y2={y(Math.min(xMax, yMax))} stroke="#3B1475" strokeDasharray="5 4" />
          <text x={x(Math.min(xMax, yMax)) - 4} y={y(Math.min(xMax, yMax)) + 14} textAnchor="end" fontSize="10" fill="#3B1475" fontFamily="DM Mono">fair share</text>
          <line x1={L} x2={W - R} y1={H - B} y2={H - B} stroke="#6B6058" />
          <line x1={L} x2={L} y1={T} y2={H - B} stroke="#6B6058" />
          <text x={(L + W - R) / 2} y={H - 6} textAnchor="middle" fontSize="11" fill="#6B6058" fontFamily="DM Mono">SHARE OF TASO MEMBERS</text>
          <text transform={`translate(14 ${(T + H - B) / 2}) rotate(-90)`} textAnchor="middle" fontSize="11" fill="#6B6058" fontFamily="DM Mono">SHARE OF {cls} GAMES</text>
          {cur.pts.map(p => (
            <g key={p.ch} onMouseEnter={() => setHover(p.ch)} onMouseLeave={() => setHover(null)}>
              <circle cx={x(p.mem)} cy={y(p.share)} r={hover === p.ch ? 8 : 6} fill={chapterColor(p.ch)} stroke="#fff" strokeWidth="1.5" />
              {p.games > 0 && <text x={x(p.mem) + 8} y={y(p.share) + 4} fontSize="10.5" fontFamily="DM Mono" fill="#1a1230">{p.ch}</text>}
              {hover === p.ch && (() => {
                const bx = Math.min(x(p.mem) + 12, W - 230), by = Math.max(T, y(p.share) - 60)
                return <g><rect x={bx} y={by} width="220" height="50" rx="5" fill="#fff" stroke="#ccc" />
                  <text x={bx + 8} y={by + 18} fontSize="12" fontWeight="600" fill="#1a1230">{NAMES[p.ch]}</text>
                  <text x={bx + 8} y={by + 36} fontSize="11" fill="#6B6058" fontFamily="DM Mono">{pct(p.mem)} of members · {p.games} games ({pct(p.share)})</text></g>
              })()}
            </g>
          ))}
        </svg>
        <div style={{ fontSize:12, color:'var(--mid)', marginTop:4 }}>
          Dots above the dashed line work more than their share of {cls} games for their size; dots below work less. Unlabeled dots on the bottom line worked no {cls} games (hover for the chapter).
        </div>
      </div>

      <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:10, overflowX:'auto' }}>
        <div style={{ fontFamily:'var(--mono)', fontSize:9, letterSpacing:'0.12em', textTransform:'uppercase', color:'var(--mid)', padding:'12px 10px 4px' }}>
          Share of games ÷ share of members (1.0× = exactly its size; green above, red below)
        </div>
        <table style={{ width:'100%', borderCollapse:'collapse' }}>
          <thead><tr>
            <th style={{ ...th, textAlign:'left' }}>Chapter</th><th style={th}>Members</th>
            {CLASSES.map(c => <th key={c} style={{ ...th, color: c === cls ? 'var(--burnt)' : 'var(--mid)', cursor:'pointer' }} onClick={() => setCls(c)}>{c}</th>)}
          </tr></thead>
          <tbody>
            {chapters.map(ch => (
              <tr key={ch}>
                <td style={{ ...td, textAlign:'left', fontFamily:'DM Sans', whiteSpace:'nowrap' }}>
                  <span style={{ display:'inline-block', width:8, height:8, borderRadius:'50%', background:chapterColor(ch), marginRight:6 }} />{NAMES[ch] || ch}</td>
                <td style={td}>{members[ch]} <span style={{ color:'var(--mid)', fontSize:10 }}>({pct(members[ch] / stats.T)})</span></td>
                {CLASSES.map(c => {
                  const p = stats.by[c].pts.find(q => q.ch === ch), r = ratioCell(p)
                  return <td key={c} title={`${p.games} of ${stats.by[c].tot} ${c} games (${pct(p.share)})`}
                    style={{ ...td, background: r.bg, color: r.dark ? '#fff' : !p.games ? 'rgba(160,40,30,0.6)' : 'var(--ink)', fontWeight: c === cls ? 700 : 400 }}>{r.txt}</td>
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ fontFamily:'var(--mono)', fontSize:10, color:'var(--mid)', marginTop:8, lineHeight:1.6, maxWidth:900 }}>
        Members: {Object.values(members).reduce((a, b) => a + b, 0).toLocaleString()} registered football officials ({memYear === 'this season' ? 'this season' : memYear}{memYear !== 'this season' ? ', East Texas counted with Tyler' : ''}). Games: playoff games with a chapter on file, {seasons.join(', ')};
        East Texas games count as Tyler. Correlation compares each chapter's share of members with its share of that class's games across all chapters.
      </div>
    </div>
  )
}
