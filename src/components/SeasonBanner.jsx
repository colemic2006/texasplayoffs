import React from 'react'

const ROUND_LABELS = { 1:'Bi-District', 2:'Area', 3:'Regionals', 4:'Quarterfinals', 5:'Semifinals', 6:'Championship' }

// Shown for a season that is still being played (data built by scripts/season.py)
export default function SeasonBanner({ data, year }) {
  const season = data?.season
  if (!season || season.status !== 'in_progress') return null

  const updated = season.updated
    ? new Date(season.updated + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : null
  const weeks = Object.entries(season.weeks || {}).filter(([, w]) => w.games > 0)

  return (
    <div style={{
      background:'var(--surface)', border:'1px solid var(--border)', borderRadius:10,
      padding:'16px 20px', marginBottom:32, position:'relative', overflow:'hidden'
    }}>
      <div style={{ position:'absolute', top:0, left:0, bottom:0, width:3, background:'var(--burnt)' }} />
      <div style={{ fontFamily:'var(--mono)', fontSize:10, letterSpacing:'0.16em', textTransform:'uppercase', color:'var(--burnt)', marginBottom:6 }}>
        {year} Playoffs · In Progress{updated ? ` · Updated ${updated}` : ''}
      </div>
      {season.games === 0 ? (
        <div style={{ fontSize:14, color:'var(--ink)' }}>
          Bi-District games begin November 12. Brackets fill in from UIL as matchups are set, and chapter assignments are added each week.
        </div>
      ) : (
        <>
          <div style={{ fontSize:14, color:'var(--ink)', marginBottom:10 }}>
            {season.assigned} of {season.games} games have a chapter assignment so far. Counts update weekly.
          </div>
          <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
            {weeks.map(([w, wk]) => (
              <div key={w} style={{
                fontFamily:'var(--mono)', fontSize:10, letterSpacing:'0.08em', color:'var(--mid)',
                border:'1px solid var(--border)', borderRadius:4, padding:'4px 8px'
              }}>
                {ROUND_LABELS[w]} · {wk.assigned}/{wk.games}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
