import React, { useState, useMemo, useEffect, useRef } from 'react'
import 'leaflet/dist/leaflet.css'

const CLASSIFICATIONS = ['1A D1','1A D2','2A D1','2A D2','3A D1','3A D2','4A D1','4A D2','5A D1','5A D2','6A D1','6A D2']
const WEEKS = [1,2,3,4,5,6]
const ROUND_NAMES = {
  1: 'Bi-District / Area',
  2: 'Area',
  3: 'Regional Quarterfinals',
  4: 'Regional Semifinals',
  5: 'Regional Finals',
  6: 'State Championships',
}

const KNOWN_CHAPTERS = new Set(['ABI','AMA','AUS','BEA','STX','COM','CSC','CTX','DAL','ELP','FTW','HOU','NTX','PBC','PVC','RGV','SAT','SAN','SFA','SPC','TYL','WAC','WACO'])
const BAD_NAMES = new Set(['total bracket counts','totals','total','bye','filler',''])

function isValidTeam(name) {
  if (!name) return false
  const n = name.trim()
  if (!n || /^\d+$/.test(n) || KNOWN_CHAPTERS.has(n.toUpperCase()) || BAD_NAMES.has(n.toLowerCase())) return false
  return true
}

function SectionLabel({ children }) {
  return <div style={{ fontFamily:'var(--mono)', fontSize:10, letterSpacing:'0.18em', textTransform:'uppercase', color:'var(--mid)', marginBottom:6 }}>{children}</div>
}

// Geocode a location string via Nominatim (rate-limited, cached)
const geocodeCache = {}
async function geocode(query) {
  if (geocodeCache[query]) return geocodeCache[query]
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query + ', Texas')}&format=json&limit=1`
    const res = await fetch(url, { headers: { 'Accept-Language': 'en', 'User-Agent': 'TexasPlayoffs/1.0' } })
    const data = await res.json()
    if (data[0]) {
      const result = { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) }
      geocodeCache[query] = result
      return result
    }
  } catch {}
  return null
}

// Match a site string to the stadiums lookup
function findStadium(site, stadiums) {
  if (!site || !stadiums.length) return null
  const parts = site.split(',').map(s => s.trim())
  const name = parts[0]?.toLowerCase()
  const city = parts[1]?.toLowerCase()

  if (name && city) {
    const exact = stadiums.find(s => s.name.toLowerCase() === name && s.city.toLowerCase() === city)
    if (exact) return exact
  }
  if (name) {
    const byName = stadiums.find(s => s.name.toLowerCase() === name)
    if (byName) return byName
  }
  return null
}

export default function BracketViewer({ data, year }) {
  const [selectedWeek, setSelectedWeek] = useState(1)
  const [classFilter, setClassFilter] = useState('all')
  const [showMap, setShowMap] = useState(false)
  const [stadiums, setStadiums] = useState([])
  const [mapMarkers, setMapMarkers] = useState([])
  const [geocoding, setGeocoding] = useState(false)

  // Load stadiums lookup once
  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}data/stadiums.json`)
      .then(r => r.json())
      .then(d => setStadiums(d.stadiums || []))
      .catch(() => {})
  }, [])

  const allGames = useMemo(() => {
    if (!data?.games) return []
    return data.games.filter(g => isValidTeam(g.team1) && isValidTeam(g.team2))
  }, [data])

  const weekGames = useMemo(() => {
    let games = allGames.filter(g => g.week === selectedWeek)
    if (classFilter !== 'all') games = games.filter(g => g.classification === classFilter)
    return games
  }, [allGames, selectedWeek, classFilter])

  const gamesByClass = useMemo(() => {
    const map = {}
    weekGames.forEach(g => {
      if (!map[g.classification]) map[g.classification] = []
      map[g.classification].push(g)
    })
    return map
  }, [weekGames])

  const activeClasses = CLASSIFICATIONS.filter(c => gamesByClass[c]?.length > 0)
  const weeksWithGames = WEEKS.filter(w => allGames.some(g => g.week === w))

  // Geocode games with sites for the map
  useEffect(() => {
    if (!showMap) return
    const gamesWithSite = weekGames.filter(g => g.site)
    if (!gamesWithSite.length) { setMapMarkers([]); return }

    setGeocoding(true)
    const delay = ms => new Promise(r => setTimeout(r, ms))

    async function run() {
      const markers = []
      for (let i = 0; i < gamesWithSite.length; i++) {
        const g = gamesWithSite[i]
        const stadium = findStadium(g.site, stadiums)
        const query = stadium
          ? `${stadium.address}, ${stadium.city}, Texas`
          : g.site
        const coords = await geocode(query)
        if (coords) {
          markers.push({ ...coords, game: g, stadium })
        }
        if (i < gamesWithSite.length - 1) await delay(1100) // Nominatim rate limit
      }
      setMapMarkers(markers)
      setGeocoding(false)
    }
    run()
  }, [showMap, weekGames, stadiums])

  const gamesWithSite = weekGames.filter(g => g.site)

  return (
    <div>
      <SectionLabel>03 · Brackets</SectionLabel>
      <div style={{
        fontFamily:"'Bebas Neue', sans-serif", fontSize:30, letterSpacing:0.5,
        color:'var(--ink)', marginBottom:20, paddingBottom:12,
        borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', gap:12
      }}>
        <div style={{ width:4, height:28, borderRadius:2, background:'var(--steel)', flexShrink:0 }} />
        Playoff Brackets · {year}
      </div>

      {/* Week tabs */}
      <div style={{ display:'flex', gap:4, flexWrap:'wrap', marginBottom:16 }}>
        {WEEKS.map(w => {
          const hasGames = weeksWithGames.includes(w)
          return (
            <button key={w} onClick={() => hasGames && setSelectedWeek(w)} style={{
              fontFamily:'var(--mono)', fontSize:9, letterSpacing:'0.12em', textTransform:'uppercase',
              padding:'6px 14px', borderRadius:4, border:'1px solid var(--border)',
              background: selectedWeek === w ? 'var(--steel)' : 'transparent',
              color: selectedWeek === w ? '#fff' : hasGames ? 'var(--mid)' : 'rgba(15,13,11,0.2)',
              cursor: hasGames ? 'pointer' : 'default', transition:'all 0.15s',
              borderColor: selectedWeek === w ? 'var(--steel)' : 'var(--border)'
            }}>
              Wk {w}
            </button>
          )
        })}
        <div style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:6 }}>
          {gamesWithSite.length > 0 && (
            <button onClick={() => setShowMap(v => !v)} style={{
              fontFamily:'var(--mono)', fontSize:9, letterSpacing:'0.1em', textTransform:'uppercase',
              padding:'6px 14px', borderRadius:4, border:'1px solid var(--border)',
              background: showMap ? 'var(--burnt)' : 'transparent',
              color: showMap ? '#fff' : 'var(--mid)', cursor:'pointer', transition:'all 0.15s'
            }}>
              {showMap ? '▼ Hide Map' : '▲ Show Map'}
            </button>
          )}
        </div>
      </div>

      {/* Week label */}
      <div style={{ fontFamily:'var(--mono)', fontSize:10, color:'var(--mid)', letterSpacing:'0.12em', textTransform:'uppercase', marginBottom:16 }}>
        Week {selectedWeek} · {ROUND_NAMES[selectedWeek]}
        <span style={{ marginLeft:12, opacity:0.6 }}>{weekGames.length} game{weekGames.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Classification filter */}
      <div style={{ display:'flex', gap:4, flexWrap:'wrap', marginBottom:20 }}>
        <button onClick={() => setClassFilter('all')} style={{
          fontFamily:'var(--mono)', fontSize:9, letterSpacing:'0.08em',
          padding:'4px 10px', borderRadius:3, border:'1px solid var(--border)',
          background: classFilter === 'all' ? 'var(--ink)' : 'transparent',
          color: classFilter === 'all' ? 'var(--cream)' : 'var(--mid)', cursor:'pointer'
        }}>All</button>
        {CLASSIFICATIONS.filter(c => allGames.some(g => g.classification === c && g.week === selectedWeek)).map(cls => (
          <button key={cls} onClick={() => setClassFilter(cls)} style={{
            fontFamily:'var(--mono)', fontSize:9, letterSpacing:'0.08em',
            padding:'4px 10px', borderRadius:3, border:'1px solid var(--border)',
            background: classFilter === cls ? 'var(--steel)' : 'transparent',
            color: classFilter === cls ? '#fff' : 'var(--mid)', cursor:'pointer'
          }}>{cls}</button>
        ))}
      </div>

      {/* Map */}
      {showMap && (
        <div style={{ marginBottom:24, borderRadius:10, overflow:'hidden', border:'1px solid var(--border)', height:380 }}>
          {geocoding && (
            <div style={{ height:'100%', display:'flex', alignItems:'center', justifyContent:'center', background:'var(--surface)', gap:8 }}>
              <div style={{ width:8, height:8, borderRadius:'50%', background:'var(--burnt)', animation:'pulse 1s infinite' }} />
              <span style={{ fontFamily:'var(--mono)', fontSize:11, color:'var(--mid)' }}>Geocoding {gamesWithSite.length} locations…</span>
              <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.3}}`}</style>
            </div>
          )}
          {!geocoding && mapMarkers.length === 0 && gamesWithSite.length > 0 && (
            <div style={{ height:'100%', display:'flex', alignItems:'center', justifyContent:'center', background:'var(--surface)' }}>
              <span style={{ fontFamily:'var(--mono)', fontSize:11, color:'var(--mid)' }}>No locations could be resolved.</span>
            </div>
          )}
          {!geocoding && mapMarkers.length > 0 && (
            <GameMap markers={mapMarkers} />
          )}
          {gamesWithSite.length === 0 && (
            <div style={{ height:'100%', display:'flex', alignItems:'center', justifyContent:'center', background:'var(--surface)' }}>
              <span style={{ fontFamily:'var(--mono)', fontSize:11, color:'var(--mid)' }}>No location data for this week.</span>
            </div>
          )}
        </div>
      )}

      {/* Games grouped by classification */}
      {weekGames.length === 0 ? (
        <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:10, padding:'40px 28px', textAlign:'center', color:'var(--mid)' }}>
          <div style={{ fontFamily:"'Bebas Neue', sans-serif", fontSize:22, marginBottom:8, color:'var(--ink)' }}>No Games</div>
          <div style={{ fontSize:13 }}>No games found for Week {selectedWeek} in {year}{classFilter !== 'all' ? ` · ${classFilter}` : ''}.</div>
        </div>
      ) : (
        <div>
          {(classFilter === 'all' ? activeClasses : [classFilter]).map(cls => {
            const games = gamesByClass[cls] || []
            if (!games.length) return null
            return (
              <div key={cls} style={{ marginBottom:28 }}>
                <div style={{
                  display:'flex', alignItems:'center', gap:10, marginBottom:12,
                  paddingBottom:8, borderBottom:'1px dashed var(--border)'
                }}>
                  <span style={{
                    fontFamily:'var(--mono)', fontSize:9, letterSpacing:'0.1em',
                    background:'var(--steel)', color:'#fff', borderRadius:3, padding:'2px 8px'
                  }}>{cls}</span>
                  <span style={{ fontFamily:'var(--mono)', fontSize:9, color:'var(--mid)' }}>
                    {games.length} game{games.length !== 1 ? 's' : ''}
                  </span>
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(300px, 1fr))', gap:10 }}>
                  {games.map((game, i) => <GameCard key={i} game={game} />)}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function GameCard({ game }) {
  const hasScore = game.score1 !== null && game.score2 !== null && game.score1 !== undefined
  const t1Wins = hasScore && game.score1 > game.score2
  const t2Wins = hasScore && game.score2 > game.score1

  return (
    <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:10, overflow:'hidden' }}>
      <div style={{ padding:'14px 16px' }}>
        <TeamRow name={game.team1} score={game.score1} isWinner={t1Wins} hasScore={hasScore} />
        <div style={{ height:1, background:'var(--border)', margin:'8px 0' }} />
        <TeamRow name={game.team2} score={game.score2} isWinner={t2Wins} hasScore={hasScore} />
      </div>

      {/* Location */}
      {game.site && (
        <div style={{
          borderTop:'1px solid var(--border)', padding:'5px 12px',
          background:'rgba(15,13,11,0.015)',
          display:'flex', alignItems:'center', gap:6
        }}>
          <span style={{ fontSize:10 }}>📍</span>
          <span style={{ fontFamily:'var(--mono)', fontSize:9, color:'var(--mid)' }}>{game.site}</span>
        </div>
      )}

      {/* Footer */}
      <div style={{
        borderTop:'1px solid var(--border)', padding:'5px 12px',
        display:'flex', justifyContent:'space-between', alignItems:'center',
        background:'rgba(15,13,11,0.02)'
      }}>
        <span style={{ fontFamily:'var(--mono)', fontSize:9, color: hasScore ? 'var(--sage)' : 'rgba(15,13,11,0.2)', letterSpacing:'0.1em' }}>
          {hasScore ? 'FINAL' : 'SCHEDULED'}
        </span>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          {hasScore && Math.abs((game.score1||0)-(game.score2||0)) > 0 && (
            <span style={{ fontFamily:'var(--mono)', fontSize:9, color:'var(--mid)' }}>
              +{Math.abs((game.score1||0)-(game.score2||0))}
            </span>
          )}
          {game.chapter && (
            <span style={{
              fontFamily:'var(--mono)', fontSize:9, letterSpacing:'0.1em',
              background:'rgba(44,74,110,0.1)', color:'var(--steel)',
              padding:'2px 7px', borderRadius:3, border:'1px solid rgba(44,74,110,0.2)'
            }}>{game.chapter}</span>
          )}
        </div>
      </div>
    </div>
  )
}

function TeamRow({ name, score, isWinner, hasScore }) {
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:8 }}>
      <div style={{
        fontSize:12, color: isWinner ? 'var(--ink)' : hasScore ? 'var(--mid)' : 'var(--ink)',
        fontWeight: isWinner ? 600 : 400, flex:1, lineHeight:1.3
      }}>
        {isWinner && <span style={{ color:'var(--burnt)', marginRight:4, fontSize:10 }}>▲</span>}
        {name || '—'}
      </div>
      {score !== null && score !== undefined && (
        <div style={{
          fontFamily:"'Bebas Neue', sans-serif", fontSize:20,
          color: isWinner ? 'var(--burnt)' : 'var(--mid)',
          minWidth:28, textAlign:'right'
        }}>{score}</div>
      )}
    </div>
  )
}

// Leaflet map rendered imperatively to avoid SSR/CSR issues
function GameMap({ markers }) {
  const mapRef = useRef(null)
  const leafletMap = useRef(null)
  const markersRef = useRef([])

  useEffect(() => {
    if (!mapRef.current) return
    // Dynamically import leaflet to avoid SSR issues
    import('leaflet').then(L => {
      // Fix default icon paths
      delete L.Icon.Default.prototype._getIconUrl
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      })

      if (!leafletMap.current) {
        leafletMap.current = L.map(mapRef.current, { zoomControl: true }).setView([31.0, -99.0], 6)
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors'
        }).addTo(leafletMap.current)
      }

      // Clear old markers
      markersRef.current.forEach(m => m.remove())
      markersRef.current = []

      // Add new markers
      markers.forEach(({ lat, lng, game, stadium }) => {
        const winner = game.score1 > game.score2 ? game.team1 : game.score2 > game.score1 ? game.team2 : null
        const mapsUrl = stadium?.map_link || `https://www.google.com/maps?q=${lat},${lng}`
        const popup = `
          <div style="font-family:monospace;font-size:12px;min-width:180px">
            <div style="font-weight:600;margin-bottom:4px">${game.classification}</div>
            <div>${game.team1} <strong>${game.score1 ?? ''}</strong></div>
            <div>${game.team2} <strong>${game.score2 ?? ''}</strong></div>
            ${stadium ? `<div style="margin-top:6px;font-size:11px;color:#666">${stadium.name}<br>${stadium.city}, TX</div>` : ''}
            ${winner ? `<div style="margin-top:4px;color:#c1440e;font-size:11px">▲ ${winner}</div>` : ''}
            <div style="margin-top:8px"><a href="${mapsUrl}" target="_blank" rel="noopener noreferrer" style="font-size:11px;color:#1a73e8;text-decoration:none">📍 Open in Google Maps</a></div>
          </div>
        `
        const marker = L.marker([lat, lng]).addTo(leafletMap.current).bindPopup(popup)
        markersRef.current.push(marker)
      })

      // Fit bounds to markers
      if (markers.length > 0) {
        const bounds = L.latLngBounds(markers.map(m => [m.lat, m.lng]))
        leafletMap.current.fitBounds(bounds, { padding: [40, 40] })
      }
    })

    return () => {
      // Don't destroy map on re-render, just update markers
    }
  }, [markers])

  useEffect(() => {
    return () => {
      if (leafletMap.current) {
        leafletMap.current.remove()
        leafletMap.current = null
      }
    }
  }, [])

  return <div ref={mapRef} style={{ height:'100%', width:'100%' }} />
}
