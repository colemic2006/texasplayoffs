import React, { useState, useEffect } from 'react'
import Header from './components/Header'
import Nav from './components/Nav'
import ChapterDashboard from './components/ChapterDashboard'
import BracketViewer from './components/BracketViewer'
import ChapterTravel from './components/ChapterTravel'
import SchoolTravel from './components/SchoolTravel'
import ChapterRuns from './components/ChapterRuns'
import OutsideChapterGames from './components/OutsideChapterGames'
import LocalMatchups from './components/LocalMatchups'
import UilPicks from './components/UilPicks'
import FavoriteSites from './components/FavoriteSites'
import ClassBreakdown from './components/ClassBreakdown'
import LocalShare from './components/LocalShare'
import OfficialsCost from './components/OfficialsCost'
import { StickWithCrew, RepeatPairings, OutsideCrewCost, LongTrips, PayPerMemberCard } from './components/MoreStats'
import RecentChanges from './components/RecentChanges'
import MembershipView from './components/MembershipView'
import ChapterCoverageMap from './components/ChapterCoverageMap'
import PlayoffFootprint from './components/PlayoffFootprint'
import FootprintFindings from './components/FootprintFindings'
import LinksView from './components/LinksView'
import PayIssuesView from './components/PayIssuesView'
import ScoresView from './components/ScoresView'
import HistoryView from './components/HistoryView'
import TeamsView from './components/TeamsView'
import ChapterRegulars from './components/ChapterRegulars'
import ChampionshipsView from './components/ChampionshipsView'
import ChampShare from './components/ChampShare'
import SiteSearch from './components/SiteSearch'
import ContactView from './components/ContactView'
import SubmitAssignmentView from './components/SubmitAssignmentView'
import SeasonBanner from './components/SeasonBanner'
import WeekMap from './components/WeekMap'
import MissingGames from './components/MissingGames'
import TeamSearch from './components/TeamSearch'

// every season with a data file, newest first (see vite.config.js): a new season appears on its own
const YEARS = [...__SEASONS__].reverse()
// pages built from every season on file: they wait until all seasons have loaded
const ALL_YEAR_PAGES = ['teams', 'regulars', 'scores', 'picks']

export default function App() {
  const [page, setPage] = useState('chapters')
  const [year, setYear] = useState(YEARS[0])
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

  // every season's games (the Teams pages, and team search's history)
  const loadAllYears = () => YEARS.forEach(y => {
    if (data[y]) return
    fetch(`${import.meta.env.BASE_URL}data/${y}.json?v=${__BUILD_TIME__}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setData(prev => ({ ...prev, [y]: d })) })
      .catch(() => {})
  })

  // Preload all years when Teams or Chapter Regulars tab is active
  useEffect(() => {
    if (!ALL_YEAR_PAGES.includes(page)) return
    YEARS.forEach(y => {
      if (data[y]) return
      fetch(`${import.meta.env.BASE_URL}data/${y}.json?v=${__BUILD_TIME__}`)
        .then(r => r.ok ? r.json() : null)
        .then(d => { if (d) setData(prev => ({ ...prev, [y]: d })) })
        .catch(() => {})
    })
  }, [page])

  const yearData = data[year] || null
  const allYearsLoaded = ALL_YEAR_PAGES.includes(page) ? YEARS.every(y => data[y]) : true
  // a season that hasn't started yet would show as a dip to zero in the trend lines
  const HISTORY_YEARS = YEARS.filter(y => !(data[y] && (data[y].games || []).length === 0))

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

      <main className="main-content" style={{ flex: 1, maxWidth: 1100, margin: '0 auto', padding: '40px 24px 80px', width: '100%' }}>
        {page === 'contact' ? (
          <ContactView />
        ) : page === 'submit' ? (
          <SubmitAssignmentView />
        ) : page === 'links' ? (
          <LinksView />
        ) : page === 'pay' ? (
          <><PayIssuesView /><PayPerMemberCard allData={data} years={YEARS} /></>
        ) : page === 'coverage' ? (
          <><ChapterCoverageMap />{yearData && <PlayoffFootprint data={yearData} />}</>
        ) : page === 'membership' ? (
          <MembershipView allData={data} years={YEARS} loadAllYears={loadAllYears} />
        ) : ALL_YEAR_PAGES.includes(page) && !allYearsLoaded ? (
          <LoadingState />
        ) : page === 'scores' ? (
          <><ChampionshipsView /><ChampShare allData={data} years={YEARS} loadAllYears={loadAllYears} /><ScoresView allData={data} years={YEARS} /></>
        ) : page === 'teams' ? (
          <TeamsView allData={data} years={YEARS} />
        ) : page === 'regulars' ? (
          <>
            <ChapterRegulars allData={data} years={YEARS} />
            <ClassBreakdown allData={data} years={YEARS} loadAllYears={loadAllYears} />
            {yearData && <FootprintFindings data={yearData} allData={data} years={YEARS} loadAllYears={loadAllYears} cards={['bigshare']} />}
            <HistoryView allData={data} years={HISTORY_YEARS} loadYear={() => {}} />
          </>
        ) : page === 'picks' ? (
          yearData && <>
            <LocalMatchups data={yearData} allData={data} years={YEARS} loadAllYears={loadAllYears} />
            <UilPicks data={yearData} />
            <OutsideChapterGames data={yearData} />
            <FootprintFindings data={yearData} allData={data} years={YEARS} loadAllYears={loadAllYears} cards={['trade', 'stayhome']} />
            <LocalShare allData={data} years={YEARS} />
            <ChapterRuns data={yearData} allData={data} years={YEARS} />
            <StickWithCrew data={yearData} allData={data} years={YEARS} />
            <RepeatPairings allData={data} years={YEARS} />
          </>
        ) : page === 'travel' ? (
          yearData ? <>
            <ChapterTravel data={yearData} />
            <OfficialsCost data={yearData} />
            <OutsideCrewCost data={yearData} />
            <LongTrips data={yearData} />
            <FootprintFindings data={yearData} allData={data} years={YEARS} loadAllYears={loadAllYears} cards={['reach', 'elpaso']} />
            <SchoolTravel data={yearData} />
          </> : <LoadingState />
        ) : (
          <>
            {loading && <LoadingState />}
            {error && <ErrorState message={error} />}
            {!loading && !error && yearData && (
              <>
                {page === 'chapters' && <MissingGames data={yearData} onSubmit={() => setPage('submit')} />}
                {page === 'chapters' && <SeasonBanner data={yearData} year={year} />}
                {page === 'chapters' && <RecentChanges data={yearData} />}
                {page === 'chapters' && <TeamSearch data={yearData} year={year} allData={data} years={YEARS} loadAllYears={loadAllYears} />}
                {page === 'chapters' && yearData.season && <WeekMap data={yearData} />}
                {page === 'chapters' && <ChapterDashboard data={yearData} year={year} allData={data} years={YEARS} loadAllYears={loadAllYears} />}
                {page === 'brackets' && <BracketViewer data={yearData} year={year} />}
                {page === 'brackets' && <SiteSearch allData={data} years={YEARS} loadAllYears={loadAllYears} />}
                {page === 'brackets' && <FavoriteSites data={yearData} allData={data} loadAllYears={loadAllYears} />}
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
        <div style={{ marginTop: 8, fontSize: 11, fontWeight: 700, maxWidth: 640, margin: '8px auto 0', color: 'var(--mid)' }}>
          This site is provided for informational purposes only and is not affiliated with, endorsed by, or supported by the Texas Association of Sports Officials (TASO) or the University Interscholastic League (UIL).
        </div>
        <div style={{ marginTop: 8 }}>
          Stadium information courtesy of Robert McSpadden, <a href="https://texasbob.com/stadium/index.html" target="_blank" rel="noopener noreferrer" style={{ color: 'inherit' }}>TexasBob.com</a>
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
      background: 'rgba(70,29,124,0.06)', border: '1px solid rgba(70,29,124,0.2)',
      borderRadius: 10, padding: '24px 28px', marginTop: 24
    }}>
      <div style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--burnt)', marginBottom: 8 }}>
        Data Error
      </div>
      <div style={{ color: 'var(--mid)', fontSize: 13 }}>{message}</div>
    </div>
  )
}
