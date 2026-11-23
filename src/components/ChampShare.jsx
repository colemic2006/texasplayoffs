import React, { useEffect, useMemo, useState } from 'react'
import { chapterColor } from '../chapterColors'
import { useCollapse, ShowMore } from '../ShowMore'

// Share of state championship games vs share of all playoff games, by chapter and class.
// Before 2014 UIL's classes were one step lower (old 5A = today's 6A ... six-man = today's 1A);
// both sides are put in today's class names.
const NAMES = {
  ABI:'Abilene', AMA:'Amarillo', AUS:'Austin', BEA:'Southeast Texas', COM:'Commerce', CSC:'College Station', CTX:'Central Texas',
  DAL:'Dallas', ELP:'El Paso', FTW:'Fort Worth', HOU:'Houston', NTX:'North Texas', PBC:'Permian Basin', PVC:'Pecan Valley',
  RGV:'Rio Grande Valley', SAN:'San Angelo', SAT:'San Antonio', SFA:'Stephen F. Austin', SPC:'South Plains', STX:'South Texas',
  TYL:'Tyler', WAC:'Waco',
}
const CODE = { WACO: 'WAC', ETX: 'TYL' }
const CLASSES = ['6A', '5A', '4A', '3A', '2A', '1A']
const OLD = { '5A': '6A', '4A': '5A', '3A': '4A', '2A': '3A', '1A': '2A', '6M': '1A', 'Six Man': '1A' }
function modern(cls, year) {
  const m = /^(Six Man|6M|\dA)/.exec(cls || '')
  if (!m) return null
  return year < 2014 ? OLD[m[1]] : (m[1] === '6M' || m[1] === 'Six Man' ? '1A' : m[1])
}

export default function ChampShare({ allData = {}, years = [], loadAllYears }) {
  const [finals, setFinals] = useState(null)
  const [cls, setCls] = useState('all')
  const [span, setSpan] = useState('all')   // 'all' | 'onfile' | a season
  const [open, setOpen] = useState(null)   // chapter whose finals are listed
  const more = useCollapse()
  useEffect(() => {
    loadAllYears?.()
    fetch(`${import.meta.env.BASE_URL}data/championship_games.json?v=${__BUILD_TIME__}`).then(r => r.ok ? r.json() : null).then(setFinals).catch(() => setFinals({}))
  }, [])
  const seasons = years.filter(y => allData[y]?.games?.length).sort((a, b) => a - b)

  // finals and playoff games per season: { year: { class: { chapter: n } } } ('all' holds every class)
  const raw = useMemo(() => {
    if (!finals) return null
    const champY = {}, playY = {}, list = []   // list: every final with its chapter, season and class
    const add = (o, y, c, ch) => {
      const t = o[y] = o[y] || {}
      for (const k of [c, 'all']) { t[k] = t[k] || {}; t[k][ch] = (t[k][ch] || 0) + 1 }
    }
    for (const [ch0, ys] of Object.entries(finals)) for (const [y, gs] of Object.entries(ys)) for (const g of gs) {
      const c = modern(g.classification, +y); if (c) { add(champY, +y, c, CODE[ch0] || ch0); list.push({ ...g, ch: CODE[ch0] || ch0, cls: c, year: +y }) }
    }
    // seasons after the championship file (2022 on) come from the season data's state finals
    const fileYears = new Set(Object.keys(champY).map(Number))
    for (const y of seasons) {
      if (fileYears.has(y)) continue
      for (const g of allData[y].games) {
        if (g.week !== 6 || !g.chapter) continue
        const c = modern(g.classification, y); if (c) { add(champY, y, c, CODE[g.chapter] || g.chapter); list.push({ ...g, ch: CODE[g.chapter] || g.chapter, cls: c, year: y }) }
      }
    }
    for (const y of seasons) for (const g of allData[y].games) {
      if (!g.chapter) continue
      const c = modern(g.classification, y); if (c) add(playY, y, c, CODE[g.chapter] || g.chapter)
    }
    return { champY, playY, list }
  }, [finals, allData, seasons.length])
  // both sides for the chosen span: every final on file vs every playoff season ('all'), the same seasons
  // on both sides ('onfile'), or one season
  const both = raw ? Object.keys(raw.champY).map(Number).filter(y => raw.playY[y]).sort((a, b) => a - b) : []
  const data = useMemo(() => {
    if (!raw) return null
    const sum = (o, ys) => {
      const out = {}
      for (const y of ys) for (const [c, m] of Object.entries(o[y] || {})) {
        out[c] = out[c] || {}
        for (const [ch, n] of Object.entries(m)) out[c][ch] = (out[c][ch] || 0) + n
      }
      return out
    }
    const allChamp = Object.keys(raw.champY).map(Number).sort((a, b) => a - b)
    const cy = span === 'all' ? allChamp : span === 'onfile' ? both : [span]
    const py = span === 'all' ? seasons : cy
    const inSpan = new Set(cy)
    return { champ: sum(raw.champY, cy), play: sum(raw.playY, py), from: cy[0], to: cy[cy.length - 1], cy, py,
      list: raw.list.filter(g => inSpan.has(g.year)).sort((a, b) => b.year - a.year || CLASSES.indexOf(a.cls) - CLASSES.indexOf(b.cls) || (a.classification || '').localeCompare(b.classification || '')) }
  }, [raw, span, seasons.length])
  if (!data || !seasons.length) return null

  const total = o => Object.values(o || {}).reduce((a, b) => a + b, 0)
  const ct = total(data.champ[cls]), pt = total(data.play[cls])
  const rows = Object.keys(NAMES).map(c => {
    const cw = data.champ[cls]?.[c] || 0, pw = data.play[cls]?.[c] || 0
    const cs = ct ? cw / ct : 0, ps = pt ? pw / pt : 0
    return { c, cw, pw, cs, ps, ratio: ps ? cs / ps : (cw ? Infinity : 0), expected: ps * ct }
  }).filter(r => r.cw || r.pw).sort((a, b) => (b.cw - b.expected) - (a.cw - a.expected))
  const pct = v => `${(100 * v).toFixed(v >= 0.1 ? 0 : 1)}%`
  // stand-outs: at least 3 championship games and at least 1.5x (or half) their playoff share
  const over = rows.filter(r => r.cw >= 3 && r.ratio >= 1.5)
  const under = rows.filter(r => r.pw && r.expected >= 3 && r.ratio <= 0.5)
  const btn = on => ({ fontFamily:'var(--mono)', fontSize:10, padding:'4px 10px', borderRadius:3, cursor:'pointer',
    border:`1px solid ${on ? 'var(--burnt)' : 'var(--border)'}`, background: on ? 'var(--burnt)' : 'transparent', color: on ? '#fff' : 'var(--mid)' })
  const th = { fontFamily:'var(--mono)', fontSize:9, letterSpacing:'0.1em', textTransform:'uppercase', color:'var(--mid)', padding:'8px 10px', textAlign:'right', borderBottom:'1px solid var(--border)' }
  const td = { padding:'7px 10px', borderBottom:'1px solid var(--border)', fontSize:12, textAlign:'right', fontFamily:'var(--mono)', verticalAlign:'middle' }
  const maxShare = Math.max(0.01, ...rows.flatMap(r => [r.cs, r.ps]))
  const label = cls === 'all' ? 'all classes' : cls

  return (
    <div style={{ marginTop:48 }}>
      <div style={{ fontFamily:'var(--mono)', fontSize:10, letterSpacing:'0.18em', textTransform:'uppercase', color:'var(--mid)', marginBottom:6 }}>Finals vs. the field</div>
      <div className="card-title" style={{ fontFamily:"'Bebas Neue', sans-serif", fontSize:30, color:'var(--ink)', marginBottom:6, paddingBottom:12, borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', gap:12 }}>
        <div style={{ width:4, height:28, borderRadius:2, background:'var(--burnt)' }} />
        Championship Share vs. Playoff Share, by Class
      </div>
      <div style={{ fontSize:13, color:'var(--mid)', lineHeight:1.55, margin:'10px 0 12px', maxWidth:860 }}>
        If championship games went to chapters in line with the rest of the playoffs, a chapter that works 24% of a class's playoff games would work about 24% of its
        state finals too. Here each chapter's share of championship games ({data.from === data.to ? data.from : `${data.from}–${data.to}`}) is set against its share of all that class's playoff games
        ({span === 'all' ? 'every season on file' : data.py.length === 1 ? `the ${data.py[0]} playoffs` : `the same ${data.py.length} seasons`}), along with how many finals that share "should" have given it.
      </div>
      <div style={{ display:'flex', gap:4, flexWrap:'wrap', alignItems:'center', marginBottom:6 }}>
        <span style={{ fontFamily:'var(--mono)', fontSize:9, letterSpacing:'0.14em', textTransform:'uppercase', color:'var(--mid)', marginRight:4 }}>Seasons:</span>
        <button onClick={() => setSpan('all')} style={btn(span === 'all')} title="Every final on file (2000 on) against every playoff season on file">All finals, cumulative</button>
        <button onClick={() => setSpan('onfile')} style={btn(span === 'onfile')} title="Only seasons with both the final and every playoff round on file">Same seasons both sides</button>
        {[...both].reverse().map(y => <button key={y} onClick={() => setSpan(y)} style={btn(span === y)}>{y}</button>)}
      </div>
      <div style={{ display:'flex', gap:4, flexWrap:'wrap', marginBottom:10 }}>
        <span style={{ fontFamily:'var(--mono)', fontSize:9, letterSpacing:'0.14em', textTransform:'uppercase', color:'var(--mid)', marginRight:4, alignSelf:'center' }}>Class:</span>
        <button onClick={() => setCls('all')} style={btn(cls === 'all')}>All classes ({total(data.champ.all)} finals)</button>
        {CLASSES.map(c => <button key={c} onClick={() => setCls(c)} style={btn(cls === c)}>{c} ({total(data.champ[c])})</button>)}
      </div>

      {(over.length > 0 || under.length > 0) && (
        <div style={{ background:'rgba(253,208,35,0.22)', border:'2px solid var(--gold)', borderRadius:10, padding:'12px 16px', marginBottom:12, fontSize:14, lineHeight:1.6, color:'var(--ink)', maxWidth:900 }}>
          {over.length > 0 && <div><strong>More finals than their playoff share ({label}):</strong>{' '}
            {over.map(r => `${NAMES[r.c]} ${r.cw} finals vs. ~${r.expected.toFixed(1)} expected (${pct(r.cs)} of finals, ${pct(r.ps)} of playoff games)`).join('; ')}.</div>}
          {under.length > 0 && <div style={{ marginTop: over.length ? 6 : 0 }}><strong>Fewer:</strong>{' '}
            {under.map(r => `${NAMES[r.c]} ${r.cw} vs. ~${r.expected.toFixed(1)} expected`).join('; ')}.</div>}
        </div>
      )}

      <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:10, overflowX:'auto' }}>
        <table style={{ width:'100%', borderCollapse:'collapse', minWidth:720 }}>
          <thead><tr>
            <th style={{ ...th, textAlign:'left' }}>Chapter</th>
            <th style={th}>Share of playoff games</th>
            <th style={th}>Share of finals</th>
            <th style={th}>Finals worked</th>
            <th style={th}>Expected</th>
            <th style={{ ...th, color:'var(--burnt)' }}>Finals ÷ playoffs</th>
            <th style={{ ...th, width:'26%', textAlign:'left' }}><span style={{ color:'#9B79D2' }}>■</span> playoffs <span style={{ color:'var(--burnt)', marginLeft:6 }}>■</span> finals</th>
          </tr></thead>
          <tbody>
            {more.cut(rows).map(r => {
              const hot = r.cw >= 3 && r.ratio >= 1.5, cold = r.expected >= 3 && r.ratio <= 0.5
              return (
                <React.Fragment key={r.c}>
                <tr onClick={() => r.cw && setOpen(open === r.c ? null : r.c)} title={r.cw ? 'Show the finals this chapter worked' : undefined}
                  style={{ background: hot ? 'rgba(80,140,90,0.10)' : cold ? 'rgba(200,60,40,0.07)' : 'transparent', cursor: r.cw ? 'pointer' : 'default' }}>
                  <td style={{ ...td, textAlign:'left', fontFamily:'DM Sans', whiteSpace:'nowrap' }}>
                    <span style={{ color:'var(--burnt)', fontSize:10, display:'inline-block', width:12 }}>{r.cw ? (open === r.c ? '▾' : '▸') : ''}</span>
                    <span style={{ display:'inline-block', width:8, height:8, borderRadius:'50%', background:chapterColor(r.c), marginRight:6 }} />{NAMES[r.c]}</td>
                  <td style={td}>{pct(r.ps)}</td>
                  <td style={{ ...td, fontWeight:700 }}>{pct(r.cs)}</td>
                  <td style={td}>{r.cw} <span style={{ color:'var(--mid)', fontSize:10 }}>of {ct}</span></td>
                  <td style={{ ...td, color:'var(--mid)' }}>{r.expected.toFixed(1)}</td>
                  <td style={{ ...td, fontWeight:700, color: hot ? 'var(--sage)' : cold ? 'var(--burnt)' : 'var(--ink)' }}>
                    {r.ps ? `${r.ratio.toFixed(1)}×` : '—'}</td>
                  <td style={{ ...td, textAlign:'left' }}>
                    <div style={{ height:6, borderRadius:3, background:'#9B79D2', width:`${100 * r.ps / maxShare}%`, minWidth: r.ps ? 2 : 0, marginBottom:3 }} />
                    <div style={{ height:6, borderRadius:3, background:'var(--burnt)', width:`${100 * r.cs / maxShare}%`, minWidth: r.cs ? 2 : 0 }} />
                  </td>
                </tr>
                {open === r.c && (
                  <tr><td colSpan={7} style={{ padding:'4px 10px 10px 34px', borderBottom:'1px solid var(--border)', background:'var(--bg, #fff)' }}>
                    {data.list.filter(g => g.ch === r.c && (cls === 'all' || g.cls === cls)).map((g, i) => {
                      const played = g.score1 != null && g.score2 != null
                      return (
                        <div key={i} style={{ display:'flex', gap:10, flexWrap:'wrap', fontSize:12, padding:'4px 0', borderTop: i ? '1px dashed var(--border)' : 'none' }}>
                          <span style={{ fontFamily:'var(--mono)', fontSize:10, color:'var(--mid)', width:150 }}>{g.year} · {g.classification}{g.year < 2014 ? ` (today's ${g.cls})` : ''}</span>
                          <span>{g.team1}{played && <span style={{ color:'var(--mid)' }}> {g.score1}</span>} v {g.team2}{played && <span style={{ color:'var(--mid)' }}> {g.score2}</span>}</span>
                        </div>
                      )
                    })}
                  </td></tr>
                )}
                </React.Fragment>
              )
            })}
          </tbody>
        </table>
      </div>
      <ShowMore c={more} total={rows.length} noun="chapters" />
      <div style={{ fontFamily:'var(--mono)', fontSize:10, color:'var(--mid)', marginTop:8, lineHeight:1.6, maxWidth:900 }}>
        "Expected" = the chapter's share of that class's playoff games × the number of finals. Sorted by finals above expected. Click a chapter to list its finals. Highlighted: at least 3 finals and
        1.5× or more its playoff share (green), or at least 3 expected and half or less (red). Only {ct} finals {cls === 'all' ? 'in all' : `in ${cls}`}, so one or two games
        moves a share a lot. Playoff shares use {span === 'all' ? `seasons on file (${seasons.join(', ')})` : data.py.join(', ')}; finals use {span === 'all' ? 'every championship on file' : data.cy.join(', ')}. A single season has only about a dozen finals (2 per class), so a one-year view shows who got the finals that year more than any pattern. Classes before 2014 are in today's names;
        East Texas counts as Tyler.
      </div>
    </div>
  )
}
