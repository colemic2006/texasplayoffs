import React from 'react'

// The seasons with chapter assignments on file (each season's public/data/<year>.json)
export const SEASONS_ON_FILE = [2010, 2013, 2015, 2018, 2021, 2022, 2023, 2024, 2025, 2026]
export const GAPS = '2011–12, 2014, 2016–17, 2019 and 2020'

// Gold "these are not all-time records" note for pages built from the seasons on file
export default function NotAllTime({ children }) {
  return (
    <div style={{ background:'rgba(253,208,35,0.16)', border:'1px solid var(--gold)', borderLeft:'4px solid var(--gold)', borderRadius:8,
      padding:'12px 16px', marginBottom:18, fontSize:13, lineHeight:1.55, color:'var(--ink)' }}>
      <strong>These are not all-time records.</strong> {children}
    </div>
  )
}
