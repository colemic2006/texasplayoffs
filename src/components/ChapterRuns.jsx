import React, { useMemo, useState } from 'react'
import { chapterColor } from '../chapterColors'
import { roundName } from '../roundName'

// Teams that keep drawing the same chapter: runs of 2+ playoff games in a row with one chapter, and
// 2+ games with one chapter overall. For one season, or across every season on file (in order).
const NAMES = {
  ABI:'Abilene', AMA:'Amarillo', AUS:'Austin', BEA:'Southeast Texas', COM:'Commerce', CSC:'College Station', CTX:'Central Texas',
  DAL:'Dallas', ELP:'El Paso', ETX:'East Texas', FTW:'Fort Worth', HOU:'Houston', NTX:'North Texas', PBC:'Permian Basin',
  PVC:'Pecan Valley', RGV:'Rio Grande Valley', SAN:'San Angelo', SAT:'San Antonio', SFA:'Stephen F. Austin', SPC:'South Plains',
  STX:'South Texas', TYL:'Tyler', WAC:'Waco',
}
const CODE = { WACO: 'WAC' }

export default function ChapterRuns({ data, allData, years }) {
  const [scope, setScope] = useState('season')   // 'season' | 'all'
  const [show, setShow] = useState(15)
  const season = data?.games?.[0]?.year

  const { runs, totals } = useMemo(() => {
    const ys = scope === 'season' ? [season] : [...years].filter(y => allData[y]?.games).sort((a, b) => a - b)
    const by = {}   // team -> its games in order
    for (const y of ys) for (const g of (allData[y] || (y === season ? data : null))?.games || []) {
      for (const [team, opp] of [[g.team1, g.team2], [g.team2, g.team1]]) {
        if (!team) continue
        ;(by[team] = by[team] || []).push({ ...g, year: g.year || y, opp, ch: CODE[g.chapter] || g.chapter || null })
      }
    }
    const runs = [], totals = []
    for (const [team, gs] of Object.entries(by)) {
      gs.sort((a, b) => a.year - b.year || a.week - b.week)
      // runs in a row: consecutive games of this team with the same chapter (a game without one breaks it)
      let cur = []
      const close = () => { if (cur.length >= 2) runs.push({ team, ch: cur[0].ch, games: cur, live: cur[cur.length - 1] === gs[gs.length - 1] && (gs[gs.length - 1].score1 == null || gs[gs.length - 1].winner === team) }); cur = [] }
      for (const g of gs) {
        if (g.ch && cur.length && cur[0].ch === g.ch) cur.push(g)
        else { close(); cur = g.ch ? [g] : [] }
      }
      close()
      // altogether: 2+ games with one chapter, in a row or not
      const n = {}
      for (const g of gs) if (g.ch) (n[g.ch] = n[g.ch] || []).push(g)
      for (const [ch, list] of Object.entries(n)) if (list.length >= 2) totals.push({ team, ch, games: list, of: gs.length })
    }
    runs.sort((a, b) => b.games.length - a.games.length || (b.live - a.live) || a.team.localeCompare(b.team))
    totals.sort((a, b) => b.games.length - a.games.length || b.games.length / b.of - a.games.length / a.of || a.team.localeCompare(b.team))
    return { runs, totals }
  }, [data, allData, years, scope, season])

  const btn = on => ({ fontFamily:'var(--mono)', fontSize:10, padding:'4px 10px', borderRadius:3, cursor:'pointer',
    border:`1px solid ${on ? 'var(--burnt)' : 'var(--border)'}`, background: on ? 'var(--burnt)' : 'transparent', color: on ? '#fff' : 'var(--mid)' })
  const chip = c => <span style={{ fontFamily:'var(--mono)', fontSize:10, padding:'2px 7px', borderRadius:3, background:chapterColor(c), color:'#fff', whiteSpace:'nowrap' }}>{NAMES[c] || c}</span>
  const gameLine = g => `${scope === 'all' ? g.year + ' ' : ''}${roundName(g)} v ${g.opp}${g.score1 != null && g.score2 != null ? '' : ' (upcoming)'}`

  const List = ({ title, rows, kind }) => (
    <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:10, padding:'14px 16px', flex:'1 1 440px', minWidth:0 }}>
      <div style={{ fontFamily:'var(--mono)', fontSize:9, letterSpacing:'0.12em', textTransform:'uppercase', color:'var(--mid)', marginBottom:8 }}>{title} · {rows.length}</div>
      {rows.length === 0 && <div style={{ fontSize:12, color:'var(--mid)' }}>None yet.</div>}
      {rows.slice(0, show).map((r, i) => (
        <div key={r.team + r.ch + i} style={{ padding:'7px 0', borderBottom:'1px dashed var(--border)' }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
            <span style={{ fontFamily:"'Bebas Neue', sans-serif", fontSize:20, color:'var(--burnt)', minWidth:22 }}>{r.games.length}</span>
            <span style={{ fontSize:13, fontWeight:600 }}>{r.team}</span>
            {chip(r.ch)}
            {kind === 'run' && r.live && <span style={{ fontFamily:'var(--mono)', fontSize:9, color:'var(--sage)', textTransform:'uppercase', letterSpacing:'0.08em' }}>still going</span>}
            {kind === 'total' && <span style={{ fontFamily:'var(--mono)', fontSize:10, color:'var(--mid)' }}>of {r.of} game{r.of === 1 ? '' : 's'}</span>}
          </div>
          <div style={{ fontSize:11, color:'var(--mid)', marginTop:2, paddingLeft:30 }}>
            {r.games.length <= 5 ? r.games.map(gameLine).join(' · ')
              : `${gameLine(r.games[0])} … ${gameLine(r.games[r.games.length - 1])} · ${[...new Set(r.games.map(g => g.year))].length} seasons`}
          </div>
        </div>
      ))}
    </div>
  )

  return (
    <div style={{ marginBottom:48, marginTop:40 }}>
      <div style={{ fontFamily:'var(--mono)', fontSize:10, letterSpacing:'0.18em', textTransform:'uppercase', color:'var(--mid)', marginBottom:6 }}>Same crew, again</div>
      <div style={{ fontFamily:"'Bebas Neue', sans-serif", fontSize:30, color:'var(--ink)', marginBottom:6, paddingBottom:12, borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', gap:12 }}>
        <div style={{ width:4, height:28, borderRadius:2, background:'var(--burnt)' }} />
        Teams That Keep Getting the Same Chapter
      </div>
      <div style={{ display:'flex', gap:4, flexWrap:'wrap', margin:'10px 0 8px' }}>
        <button onClick={() => setScope('season')} style={btn(scope === 'season')}>{season} season</button>
        <button onClick={() => setScope('all')} style={btn(scope === 'all')}>All seasons on file</button>
      </div>
      <div style={{ fontSize:13, color:'var(--mid)', lineHeight:1.55, margin:'4px 0 14px', maxWidth:820 }}>
        Left: the same chapter working 2 or more of a team's playoff games <strong style={{ color:'var(--ink)' }}>in a row</strong>.
        Right: the same chapter working 2 or more of a team's games <strong style={{ color:'var(--ink)' }}>altogether</strong>, in a row or not.
        {scope === 'all' && ' Across seasons, games run in order from the earliest season on file, so a run can carry over from one season to the next.'}
      </div>
      <div style={{ display:'flex', gap:16, flexWrap:'wrap' }}>
        <List title="In a row" rows={runs} kind="run" />
        <List title="Altogether" rows={totals} kind="total" />
      </div>
      {Math.max(runs.length, totals.length) > show && (
        <button onClick={() => setShow(s => s + 25)} style={{ ...btn(false), marginTop:10 }}>Show more</button>
      )}
      <div style={{ fontFamily:'var(--mono)', fontSize:10, color:'var(--mid)', marginTop:8, lineHeight:1.6 }}>
        Counts games with a chapter on file; a game without one breaks a run. "Still going" means the run includes the team's latest game and the team is still alive.
        {scope === 'all' && ' Seasons on file: ' + [...years].filter(y => allData[y]?.games).sort((a, b) => a - b).join(', ') + ' (not every season, so a run can skip seasons that aren\'t on file).'}
      </div>
    </div>
  )
}
