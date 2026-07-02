import React from 'react'

const LINKS = [
  { id: 'chapters', label: 'Chapter Stats' },
  { id: 'brackets', label: 'Brackets' },
  { id: 'history', label: 'Multi-Year History' },
  { id: 'teams', label: 'Teams' },
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
          {years.map(y => (
            <button
              key={y}
              onClick={() => setYear(y)}
              style={{
                fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.1em',
                padding: '5px 10px', borderRadius: 4, border: '1px solid',
                cursor: 'pointer', transition: 'all 0.15s',
                background: year === y ? 'var(--burnt)' : 'transparent',
                borderColor: year === y ? 'var(--burnt)' : 'rgba(255,255,255,0.15)',
                color: year === y ? '#fff' : 'rgba(245,240,232,0.5)',
              }}
            >{y}</button>
          ))}
        </div>
      </div>
    </nav>
  )
}
