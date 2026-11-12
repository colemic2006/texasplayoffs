import React from 'react'

// Recent changes to a game's date, kickoff or site, from scripts/season.py (game.changes)
export const ALERT = '#c62828'
export const ALERT_BG = 'rgba(198,40,40,0.07)'
const LABEL = { date: 'Date', time: 'Kickoff', site: 'Site' }
const fmtDate = v => /^\d{4}-\d\d-\d\d/.test(v || '') ? `${v.slice(5, 7)}/${v.slice(8, 10)}` : v
export const fmtValue = (field, v) => !v ? '(none)' : field === 'date' ? fmtDate(v) : v
export const fmtWhen = at => new Date(at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'America/Chicago' }) + ' CT'

export const hasChanges = g => !!(g && g.changes && g.changes.length)
export const changed = (g, field) => hasChanges(g) && g.changes.some(c => c.field === field)

// one line per change: "Date: 11/13 → 11/12"
export function changeText(g) {
  return (g.changes || []).map(c => c.status === 'conflict'
    ? `${LABEL[c.field]}: source now lists ${fmtValue(c.field, c.new)} (site shows ${fmtValue(c.field, c.old)})`
    : `${LABEL[c.field]}: ${fmtValue(c.field, c.old)} → ${fmtValue(c.field, c.new)}`).join(' · ')
}

export function ChangeBadge({ game, compact }) {
  if (!hasChanges(game)) return null
  const conflict = game.changes.every(c => c.status === 'conflict')
  const last = game.changes.map(c => c.at).sort().slice(-1)[0]
  return (
    <span title={`${changeText(game)} (detected ${fmtWhen(last)})`} style={{
      display:'inline-flex', alignItems:'center', gap:4, fontFamily:'var(--mono)', fontSize:9, letterSpacing:'0.08em',
      textTransform:'uppercase', fontWeight:700, padding:'2px 6px', borderRadius:3, whiteSpace:'nowrap',
      background: ALERT, color:'#fff', verticalAlign:'middle',
    }}>⚠ {conflict ? 'Check' : 'Changed'}</span>
  )
}

// the change spelled out, for places with room
export function ChangeDetail({ game }) {
  if (!hasChanges(game)) return null
  return (
    <div style={{ fontSize:11, color:ALERT, fontWeight:600, marginTop:3, lineHeight:1.45 }}>
      {game.changes.map((c, i) => (
        <div key={i}>
          ⚠ {LABEL[c.field]} {c.status === 'conflict' ? <>— source now lists <strong>{fmtValue(c.field, c.new)}</strong> (shown: {fmtValue(c.field, c.old)})</>
            : <>changed: <s style={{ opacity:0.7, fontWeight:400 }}>{fmtValue(c.field, c.old)}</s> → <strong>{fmtValue(c.field, c.new)}</strong></>}
          <span style={{ fontWeight:400, opacity:0.8 }}> · {fmtWhen(c.at)}</span>
        </div>
      ))}
    </div>
  )
}
