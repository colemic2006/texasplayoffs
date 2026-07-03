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
      display: 'flex', alignItems: 'center',
      padding: '0 24px', borderBottom: '1px solid rgba(255,255,255,0.08)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        {LINKS.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setPage(id)}
            style={{
              fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.14em',
              textTransform: 'uppercase', color: page === id ? 'var(--gold)' : 'rgba(245,240,232,0.45)',
              padding: '14px 16px', background: 'none', border: 'none',
              borderBottom: page === id ? '2px solid var(--gold)' : '2px solid transparent',
              transition: 'all 0.15s', cursor: 'pointer'
            }}
          >{label}</button>
        ))}

        <div style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.12)', margin: '0 12px' }} />

        {/* Year selector */}
        <div style={{ display: 'flex', gap: 6 }}>
          {years.map(y => {
            const inactive = [2026, 2018, 2015, 2010].includes(y)
            const active = year === y
            return (
              <button
                key={y}
                onClick={() => !inactive && setYear(y)}
                title={inactive ? 'Coming soon — no data yet' : undefined}
                style={{
                  fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.1em',
                  padding: '5px 10px', borderRadius: 4, border: '1px solid',
                  transition: 'all 0.15s',
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
      </div>
    </nav>
  )
}
