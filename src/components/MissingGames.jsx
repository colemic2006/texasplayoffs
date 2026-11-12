import React from 'react'
import { placeName, gameWhen } from '../placeName'
import { ChangeBadge, ChangeDetail } from '../changes'

const ROUNDS = { 1:'Bi-District', 2:'Area', 3:'Regionals', 4:'Quarterfinals', 5:'Semifinals', 6:'Championship' }
const CLASSES = ['1A D1','1A D2','2A D1','2A D2','3A D1','3A D2','4A D1','4A D2','5A D1','5A D2','6A D1','6A D2']
export const SHOW_AT_MOST = 24   // the list appears once this round is down to this many unassigned games

// While a season is in progress: the current round's games that no chapter has claimed yet,
// shown only once there are few enough left to be worth chasing down.
export default function MissingGames({ data, onSubmit }) {
  if (data?.season?.status !== 'in_progress') return null
  const games = data.games || []
  const week = Math.max(0, ...games.map(g => g.week))
  const round = games.filter(g => g.week === week)
  const missing = round.filter(g => !g.chapter)
    .sort((a, b) => CLASSES.indexOf(a.classification) - CLASSES.indexOf(b.classification) || (a.date || '').localeCompare(b.date || ''))
  if (!missing.length || missing.length > SHOW_AT_MOST) return null

  const th = { fontFamily:'var(--mono)', fontSize:9, letterSpacing:'0.12em', textTransform:'uppercase', color:'var(--mid)', textAlign:'left', padding:'8px 12px', fontWeight:500 }
  const td = { padding:'8px 12px', fontSize:12, color:'var(--ink)', borderTop:'1px solid rgba(15,13,11,0.06)' }
  return (
    <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:10, marginBottom:32, overflow:'hidden' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:10, padding:'14px 16px', borderBottom:'1px solid var(--border)' }}>
        <div>
          <div style={{ fontFamily:'var(--mono)', fontSize:10, letterSpacing:'0.16em', textTransform:'uppercase', color:'var(--burnt)', marginBottom:4 }}>
            {ROUNDS[week] || `Week ${week}`} · Still unassigned
          </div>
          <div style={{ fontSize:14, color:'var(--ink)' }}>
            {missing.length} of {round.length} games don't have a chapter yet. Know who has one?
          </div>
        </div>
        {onSubmit && (
          <button onClick={onSubmit} style={{
            fontFamily:'var(--mono)', fontSize:10, letterSpacing:'0.12em', textTransform:'uppercase', padding:'9px 16px',
            borderRadius:6, border:'none', background:'var(--burnt)', color:'#fff', cursor:'pointer',
          }}>Submit an assignment</button>
        )}
      </div>
      <div style={{ overflowX:'auto' }}>
        <table style={{ width:'100%', borderCollapse:'collapse' }}>
          <thead><tr><th style={th}>Class</th><th style={th}>Game</th><th style={th}>Site</th><th style={th}>When</th></tr></thead>
          <tbody>
            {missing.map((g, i) => (
              <tr key={i}>
                <td style={{ ...td, fontFamily:'var(--mono)', fontSize:10, color:'var(--steel)', whiteSpace:'nowrap' }}>{g.classification}</td>
                <td style={td}>{g.team1} <span style={{ color:'var(--mid)' }}>vs</span> {g.team2}</td>
                <td style={{ ...td, color:'var(--mid)' }}>{g.site ? placeName(g) : 'TBD'}</td>
                <td style={{ ...td, fontFamily:'var(--mono)', fontSize:10, color:'var(--mid)', whiteSpace:'nowrap' }}>{g.date ? gameWhen(g) : 'TBD'} <ChangeBadge game={g} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
