import React from 'react'
import { hasChanges, fmtValue, fmtWhen, ALERT, ALERT_BG } from '../changes'
import { placeName, gameWhen } from '../placeName'

const LABEL = { date: 'Date', time: 'Kickoff', site: 'Site', score: 'Score' }

// Games whose date, kickoff or site changed recently, newest first
export default function RecentChanges({ data }) {
  const games = (data?.games || []).filter(hasChanges)
  if (!games.length) return null
  const rows = games.flatMap(g => g.changes.map(c => ({ g, c }))).sort((a, b) => b.c.at.localeCompare(a.c.at))
  return (
    <div style={{ background:ALERT_BG, border:`1px solid ${ALERT}`, borderLeft:`4px solid ${ALERT}`, borderRadius:10, padding:'14px 18px', marginBottom:28 }}>
      <div style={{ fontFamily:'var(--mono)', fontSize:10, letterSpacing:'0.16em', textTransform:'uppercase', color:ALERT, fontWeight:700, marginBottom:8 }}>
        ⚠ Schedule & score changes · {games.length} game{games.length === 1 ? '' : 's'}
      </div>
      <div style={{ fontSize:12, color:'var(--ink)', marginBottom:10 }}>
        These games' date, kickoff, site or final score changed after they were first posted. Checked against the UIL / MaxPreps brackets every 15 minutes.
      </div>
      {rows.map(({ g, c }, i) => (
        <div key={i} style={{ display:'flex', flexWrap:'wrap', gap:'2px 12px', alignItems:'baseline', padding:'6px 0', borderTop: i ? '1px solid rgba(198,40,40,0.2)' : 'none', fontSize:13 }}>
          <strong style={{ minWidth:220 }}>{g.team1} v {g.team2}</strong>
          <span style={{ fontFamily:'var(--mono)', fontSize:10, color:'var(--mid)' }}>{g.classification}{g.chapter ? ` · ${g.chapter}` : ''}</span>
          <span style={{ color:ALERT, fontWeight:600 }}>
            {LABEL[c.field]}{c.status === 'conflict'
              ? <>: source now lists {fmtValue(c.field, c.new)} (site shows {fmtValue(c.field, c.old)}, set by hand — being checked)</>
              : <>: <s style={{ fontWeight:400, opacity:0.7 }}>{fmtValue(c.field, c.old)}</s> → {fmtValue(c.field, c.new)}</>}
          </span>
          <span style={{ fontFamily:'var(--mono)', fontSize:10, color:'var(--mid)' }}>now: {[g.site && placeName(g), gameWhen(g)].filter(Boolean).join(' · ')} · detected {fmtWhen(c.at)}</span>
        </div>
      ))}
    </div>
  )
}
