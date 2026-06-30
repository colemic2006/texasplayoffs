import React from 'react'

export default function Header({ yearData, year }) {
  const chapters = yearData?.chapters || []
  const totalGames = chapters.reduce((s, c) => s + (c.total || 0), 0)
  const numChapters = chapters.filter(c => c.total > 0).length

  return (
    <header style={{
      background: 'var(--ink)', color: 'var(--cream)',
      padding: '44px 40px 36px', position: 'relative', overflow: 'hidden'
    }}>
      {/* Decorative gradient bar */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, height: 3,
        background: 'linear-gradient(90deg, var(--burnt) 0%, var(--gold) 50%, var(--burnt) 100%)'
      }} />
      {/* Large bg text */}
      <div style={{
        position: 'absolute', fontFamily: "'Bebas Neue', sans-serif",
        fontSize: 220, color: 'rgba(255,255,255,0.03)',
        right: -20, top: -30, lineHeight: 1, letterSpacing: -4,
        pointerEvents: 'none', userSelect: 'none'
      }}>UIL</div>

      <div style={{
        fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.18em',
        textTransform: 'uppercase', color: 'var(--gold)', marginBottom: 10
      }}>
        UIL Football · Officiating Data · {year} Season
      </div>

      <h1 style={{
        fontFamily: "'Bebas Neue', sans-serif", fontSize: 56, lineHeight: 0.95,
        letterSpacing: 1.5, marginBottom: 10
      }}>
        Texas Playoff<br />
        <span style={{ color: 'var(--burnt)' }}>Chapter Tracker</span>
      </h1>

      <p style={{
        maxWidth: 560, fontSize: 14, fontWeight: 300,
        color: 'rgba(245,240,232,0.6)', lineHeight: 1.55, marginBottom: 28
      }}>
        Per-chapter game assignments across all 12 UIL classifications — week by week, cumulative, and year over year.
      </p>

      <div style={{ display: 'flex', gap: 36, flexWrap: 'wrap' }}>
        {[
          { label: 'Active Chapters', value: numChapters || '—' },
          { label: 'Total Playoff Games', value: totalGames || '—' },
          { label: 'Classifications', value: 12 },
          { label: 'Playoff Weeks', value: 6 },
        ].map(({ label, value }) => (
          <div key={label}>
            <div style={{
              fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '0.16em',
              textTransform: 'uppercase', color: 'rgba(245,240,232,0.35)', marginBottom: 3
            }}>{label}</div>
            <div style={{
              fontFamily: "'Bebas Neue', sans-serif", fontSize: 26, letterSpacing: 0.5
            }}>{value}</div>
          </div>
        ))}
      </div>
    </header>
  )
}
