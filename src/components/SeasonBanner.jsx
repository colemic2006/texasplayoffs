import React from 'react'

const ROUND_LABELS = { 1:'Bi-District', 2:'Area', 3:'Regionals', 4:'Quarterfinals', 5:'Semifinals', 6:'Championship' }
// games in a full round: 10 brackets of 64 teams (2A-6A) plus two 1A brackets of 32, which are idle in week 5
const EXPECTED = { 1:352, 2:176, 3:88, 4:44, 5:20, 6:12 }

// Shown for a season that is still being played (data built by scripts/season.py)
export default function SeasonBanner({ data, year }) {
  const season = data?.season
  if (!season || season.status !== 'in_progress') return null

  // last time the season's data changed, shown in Texas time
  const updated = !season.updated ? null
    : season.updated.includes('T')
      ? new Date(season.updated).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'America/Chicago' }) + ' CT'
      : new Date(season.updated + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  const weeks = Object.entries(season.weeks || {}).filter(([, w]) => w.games > 0)
  const pct = (n, of) => of ? Math.round(100 * n / of) : 0
  // the round being played now: the latest week with games
  const current = weeks.length ? weeks[weeks.length - 1] : null

  return (
    <div style={{
      background:'var(--surface)', border:'1px solid var(--border)', borderRadius:10,
      padding:'16px 20px', marginBottom:32, position:'relative', overflow:'hidden'
    }}>
      <div style={{ position:'absolute', top:0, left:0, bottom:0, width:3, background:'var(--burnt)' }} />
      <div style={{ fontFamily:'var(--mono)', fontSize:10, letterSpacing:'0.16em', textTransform:'uppercase', color:'var(--burnt)', marginBottom:6 }}>
        {year} Playoffs · In Progress
      </div>
      {season.games === 0 ? (
        <div style={{ fontSize:14, color:'var(--ink)' }}>
          Bi-District games begin November 12. Brackets fill in from UIL as matchups are set, and chapter assignments are added each week.
        </div>
      ) : (
        <>
          <div style={{ fontSize:14, color:'var(--ink)', marginBottom:10 }}>
            {current ? <>
              {ROUND_LABELS[current[0]]} (Week {current[0]}) chapter assignments: <strong>{current[1].assigned}/{current[1].games}</strong> games ({pct(current[1].assigned, current[1].games)}% complete)
              {EXPECTED[current[0]] && current[1].games < EXPECTED[current[0]] && <span style={{ color:'var(--mid)' }}> · {current[1].games} of {EXPECTED[current[0]]} matchups set so far</span>}.
            </> : null}
            {updated ? ` Last updated ${updated}.` : ''}
          </div>
          <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
            {weeks.map(([w, wk]) => (
              <div key={w} style={{
                fontFamily:'var(--mono)', fontSize:10, letterSpacing:'0.08em', color:'var(--mid)',
                border:'1px solid var(--border)', borderRadius:4, padding:'4px 8px'
              }}>
                {ROUND_LABELS[w]} · {wk.assigned}/{wk.games} · {pct(wk.assigned, wk.games)}%
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
