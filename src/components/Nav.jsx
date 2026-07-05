import React from 'react'

const LINKS = [
  { id: 'chapters', label: 'Chapter Stats' },
  { id: 'regulars', label: 'Chapter Regulars' },
  { id: 'brackets', label: 'Brackets' },
  { id: 'history', label: 'Multi-Year History' },
  { id: 'teams', label: 'Teams' },
  { id: 'championships', label: 'Championships' },
]

export default function Nav({ page, setPage, year, setYear, years }) {
  return (
    <nav style={{
      position: 'sticky', top: 0, background: 'var(--ink)', zIndex: 100,
      borderBottom: '1px solid rgba(255,255,255,0.08)'
    }}>
      {/* Page links row */}
      <div className="nav-links" style={{
        display: 'flex', alignItems: 'center', padding: '0 16px',
        overflowX: 'auto', WebkitOverflowScrolling: 'touch',
        scrollbarWidth: 'none',
      }}>
        {LINKS.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setPage(id)}
            style={{
              fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.14em',
              textTransform: 'uppercase', color: page === id ? 'var(--gold)' : 'rgba(245,240,232,0.45)',
              padding: '14px 14px', background: 'none', border: 'none',
              borderBottom: page === id ? '2px solid var(--gold)' : '2px solid transparent',
              transition: 'all 0.15s', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
            }}
          >{label}</button>
        ))}
      </div>

      {/* Year selector row */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '6px 16px 8px', overflowX: 'auto', WebkitOverflowScrolling: 'touch',
        scrollbarWidth: 'none', borderTop: '1px solid rgba(255,255,255,0.06)'
      }}>
        {years.map(y => {
          const inactive = [2026, 2010].includes(y)
          const active = year === y
          return (
            <button
              key={y}
              onClick={() => !inactive && setYear(y)}
              title={inactive ? 'Coming soon — no data yet' : undefined}
              style={{
                fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.1em',
                padding: '5px 10px', borderRadius: 4, border: '1px solid',
                transition: 'all 0.15s', flexShrink: 0,
                cursor: inactive ? 'not-allowed' : 'pointer',
                opacity: inactive ? 0.35 : 1,
                background: active && !inactive ? 'var(--burnt)' : 'transparent',
                borderColor: active && !inactive ? 'var(--burnt)' : 'rgba(255,255,255,0.15)',
                color: active && !inactive ? '#fff' : 'rgba(245,240,232,0.5)',
              }}
            >{y}</button>
          )
        })}
      </div>
    </nav>
  )
}
