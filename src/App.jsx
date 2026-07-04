import React, { useState, useEffect } from 'react'
import Header from './components/Header'
import Nav from './components/Nav'
import ChapterDashboard from './components/ChapterDashboard'
import BracketViewer from './components/BracketViewer'
import HistoryView from './components/HistoryView'
import TeamsView from './components/TeamsView'
import ChapterRegulars from './components/ChapterRegulars'
import ChampionshipsView from './components/ChampionshipsView'

const YEARS = [2026, 2025, 2024, 2023, 2022, 2018, 2015, 2010]

export default function App() {
  const [page, setPage] = useState('chapters')
  const [year, setYear] = useState(2025)
  const [data, setData] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Fetch data for the selected year (and cache it)
  useEffect(() => {
    if (data[year]) { setLoading(false); return }
    setLoading(true)
    setError(null)
    fetch(`${import.meta.env.BASE_URL}data/${year}.json?v=${__BUILD_TIME__}`)
      .then(r => {
        if (!r.ok) throw new Error(`Could not load ${year} data`)
        return r.json()
      })
      .then(d => {
        setData(prev => ({ ...prev, [year]: d }))
        setLoading(false)
      })
      .catch(err => { setError(err.message); setLoading(false) })
  }, [year])

  // Preload all years when Teams or Chapter Regulars tab is active
  useEffect(() => {
    if (page !== 'teams' && page !== 'regulars') return
    YEARS.filter(y => ![2026, 2010].includes(y)).forEach(y => {
      if (data[y]) return
      fetch(`${import.meta.env.BASE_URL}data/${y}.json?v=${__BUILD_TIME__}`)
        .then(r => r.ok ? r.json() : null)
        .then(d => { if (d) setData(prev => ({ ...prev, [y]: d })) })
        .catch(() => {})
    })
  }, [page])

  const yearData = data[year] || null
  const DATA_YEARS = YEARS.filter(y => ![2026, 2010].includes(y))
  const allYearsLoaded = (page === 'teams' || page === 'regulars') ? DATA_YEARS.every(y => data[y]) : true

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Header yearData={yearData} year={year} />
      <Nav
        page={page}
        setPage={setPage}
        year={year}
        setYear={setYear}
        years={YEARS}
      />

      <main style={{ flex: 1, maxWidth: 1100, margin: '0 auto', padding: '40px 24px 80px', width: '100%' }}>
        {page === 'championships' ? (
          <ChampionshipsView />
        ) : (page === 'teams' || page === 'regulars') ? (
          allYearsLoaded
            ? page === 'teams' ? <TeamsView allData={data} years={YEARS} /> : <ChapterRegulars allData={data} years={YEARS} />
            : <LoadingState />
        ) : (
          <>
            {loading && <LoadingState />}
            {error && <ErrorState message={error} />}
            {!loading && !error && yearData && (
              <>
                {page === 'chapters' && <ChapterDashboard data={yearData} year={year} />}
                {page === 'brackets' && <BracketViewer data={yearData} year={year} />}
                {page === 'history' && <HistoryView allData={data} years={YEARS} loadYear={(y) => {
                  if (data[y]) return
                  fetch(`${import.meta.env.BASE_URL}data/${y}.json?v=${__BUILD_TIME__}`)
                    .then(r => r.ok ? r.json() : null)
                    .then(d => { if (d) setData(prev => ({ ...prev, [y]: d })) })
                    .catch(() => {})
                }} />}
              </>
            )}
          </>
        )}
      </main>

      <footer style={{
        textAlign: 'center', padding: '28px 24px', borderTop: '1px solid var(--border)',
        fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.1em', color: 'var(--mid)',
        lineHeight: 1.8
      }}>
        <div>TEXAS HIGH SCHOOL FOOTBALL PLAYOFF TRACKER · texasplayoffs.com</div>
        <div style={{ marginTop: 6, fontSize: 9, opacity: 0.7, maxWidth: 640, margin: '6px auto 0' }}>
          This site is provided for informational purposes only and has no affiliation with the Texas Association of Sports Officials (TASO) or the University Interscholastic League (UIL).
        </div>
      </footer>
    </div>
  )
}

function LoadingState() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 80, gap: 12, color: 'var(--mid)' }}>
      <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--burnt)', animation: 'pulse 1s infinite' }} />
      <span style={{ fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase' }}>
        Loading data…
      </span>
      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }`}</style>
    </div>
  )
}

function ErrorState({ message }) {
  return (
    <div style={{
      background: 'rgba(193,68,14,0.06)', border: '1px solid rgba(193,68,14,0.2)',
      borderRadius: 10, padding: '24px 28px', marginTop: 24
    }}>
      <div style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--burnt)', marginBottom: 8 }}>
        Data Error
      </div>
      <div style={{ color: 'var(--mid)', fontSize: 13 }}>{message}</div>
    </div>
  )
}
