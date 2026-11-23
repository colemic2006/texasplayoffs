import React from 'react'

// The seasons with chapter assignments on file: every public/data/<year>.json, read when the site
// is built (vite.config.js), so a new season is included as soon as its file exists
export const SEASONS_ON_FILE = __SEASONS__
// the seasons in between that aren't on file, written out ("2011–12, 2014, 2016–17, 2019 and 2020")
export const GAPS = (() => {
  const runs = []
  for (let i = 1; i < SEASONS_ON_FILE.length; i++) {
    const a = SEASONS_ON_FILE[i - 1] + 1, b = SEASONS_ON_FILE[i] - 1
    if (a <= b) runs.push(a === b ? `${a}` : `${a}–${String(b).slice(b - a < 10 && Math.floor(a / 100) === Math.floor(b / 100) ? 2 : 0)}`)
  }
  return runs.length > 1 ? `${runs.slice(0, -1).join(', ')} and ${runs[runs.length - 1]}` : (runs[0] || 'none')
})()

// Gold "these are not all-time records" note for pages built from the seasons on file
export default function NotAllTime({ children }) {
  return (
    <div style={{ background:'rgba(253,208,35,0.16)', border:'1px solid var(--gold)', borderLeft:'4px solid var(--gold)', borderRadius:8,
      padding:'12px 16px', marginBottom:18, fontSize:13, lineHeight:1.55, color:'var(--ink)' }}>
      <strong>These are not all-time records.</strong> {children}
    </div>
  )
}
