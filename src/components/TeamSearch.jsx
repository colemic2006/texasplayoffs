import React, { useEffect, useMemo, useState } from 'react'
import { placeName, gameWhen } from '../placeName'
import { useDctfTeams, DctfLinks } from '../dctf'
import { canonicalize, isValidTeam } from './TeamsView'
import { useFinals } from '../finals'
import { useHomeChapters } from '../homeChapters'

const ROUNDS = { 1:'Bi-District', 2:'Area', 3:'Regionals', 4:'Quarterfinals', 5:'Semifinals', 6:'Championship' }
const CHAPTERS = {
  ABI:'Abilene', AMA:'Amarillo', AUS:'Austin', BEA:'Beaumont', COM:'Commerce', CSC:'College Station',
  CTX:'Central Texas', DAL:'Dallas', ELP:'El Paso', ETX:'East Texas', FTW:'Fort Worth', HOU:'Houston',
  NTX:'North Texas', PBC:'Permian Basin', PVC:'Pecan Valley', RGV:'Rio Grande Valley', SAT:'San Antonio',
  SAN:'San Angelo', SFA:'Stephen F. Austin', SPC:'South Plains', STX:'South Texas', TYL:'Tyler', WAC:'Waco', WACO:'Waco',
}
const words = s => (s || '').toLowerCase().replace(/\(\?\)/g, '').replace(/[^a-z0-9 ]+/g, ' ').split(/\s+/).filter(Boolean)
const label = { fontFamily:'var(--mono)', fontSize:9, letterSpacing:'0.12em', textTransform:'uppercase', color:'var(--mid)' }
const chName = c => c ? `${CHAPTERS[c] || c} (${c})` : ''

// Look a team up: its games this season (chapter, site, kickoff) and its playoff history
// in every season on the site, the same facts as the Teams page.
export default function TeamSearch({ data, year, allData = {}, years = [], loadAllYears }) {
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(null)   // team whose past games are listed
  const [homes, setHomes] = useState({})
  const dctf = useDctfTeams()
  const finals = useFinals(allData, years)
  const homeCh = useHomeChapters()
  const games = data?.games || []
  const inProgress = data?.season?.status === 'in_progress'
  const searching = q.trim().length >= 2

  // history needs every season: fetch them the first time someone searches
  useEffect(() => { if (searching && loadAllYears) loadAllYears() }, [searching])
  useEffect(() => {
    if (!searching || Object.keys(homes).length) return
    fetch(`${import.meta.env.BASE_URL}data/home_stadiums.json?v=${__BUILD_TIME__}`)
      .then(r => r.ok ? r.json() : null).then(d => d && setHomes(d.teams || {})).catch(() => {})
  }, [searching])

  // every team on the site, with each season's games
  const teams = useMemo(() => {
    const map = new Map()
    for (const y of years) {
      for (const g of allData[y]?.games || []) {
        if (!isValidTeam(g.team1) || !isValidTeam(g.team2)) continue
        for (const [raw, opp, mine, theirs] of [[g.team1, g.team2, g.score1, g.score2], [g.team2, g.team1, g.score2, g.score1]]) {
          const name = canonicalize(raw.replace(/\s*\(\?\)$/, ''))
          if (!map.has(name)) map.set(name, { name, games: [] })
          map.get(name).games.push({ year: y, game: g, opp, mine, theirs })
        }
      }
    }
    return map
  }, [allData, years])
  const names = useMemo(() => [...teams.keys()].sort(), [teams])

  const hits = useMemo(() => {
    const qw = words(q)
    if (!searching || !qw.length) return []
    // every word typed must start a word of the name ("lake trav" finds Austin Lake Travis)
    const fits = name => { const nw = words(name); return qw.every(w => nw.some(n => n.startsWith(w))) }
    const exact = names.find(n => n.toLowerCase() === q.trim().toLowerCase())
    return (exact ? [exact] : names.filter(fits)).map(n => teams.get(n))
      .sort((a, b) => (b.games.some(x => x.year === year) - a.games.some(x => x.year === year)) || b.games.length - a.games.length)
  }, [q, names, teams, year, searching])

  if (!games.length) return null
  const loading = searching && years.some(y => !allData[y])

  return (
    <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:10, padding:'16px 18px', marginBottom:32 }}>
      <label htmlFor="team-search" style={{ ...label, color:'var(--burnt)', fontSize:10, letterSpacing:'0.16em', display:'block', marginBottom:8 }}>
        Find a team: {year} games, chapters and playoff history
      </label>
      <div style={{ position:'relative' }}>
        <input id="team-search" list="team-search-names" value={q} onChange={e => { setQ(e.target.value); setOpen(null) }} autoComplete="off"
               placeholder="Type a school, e.g. Dalhart, Katy, Lake Travis…"
               style={{ width:'100%', boxSizing:'border-box', fontFamily:'var(--sans)', fontSize:15, padding:'11px 40px 11px 14px',
                        border:'1px solid var(--border)', borderRadius:8, background:'var(--cream)', color:'var(--ink)', outline:'none' }} />
        {q && <button onClick={() => { setQ(''); setOpen(null) }} aria-label="Clear" style={{ position:'absolute', right:8, top:'50%', transform:'translateY(-50%)',
                 border:'none', background:'transparent', fontSize:18, color:'var(--mid)', cursor:'pointer' }}>×</button>}
        <datalist id="team-search-names">{names.map(t => <option key={t} value={t} />)}</datalist>
      </div>

      {searching && (
        <div style={{ marginTop:14 }}>
          {loading && <div style={{ fontSize:12, color:'var(--mid)', marginBottom:8 }}>Loading past seasons…</div>}
          {!loading && !hits.length && <div style={{ fontSize:13, color:'var(--mid)' }}>No team matches “{q}”. Try fewer letters or another part of the name.</div>}
          {hits.slice(0, 6).map(t => <TeamCard key={t.name} t={t} homeChapter={homeCh[t.name]} finals={finals[t.name] || []} year={year} inProgress={inProgress} home={homes[t.name]} dctf={dctf}
                                               open={open === t.name || hits.length === 1} toggle={() => setOpen(open === t.name ? null : t.name)} />)}
          {hits.length > 6 && <div style={{ fontSize:12, color:'var(--mid)', marginTop:6 }}>{hits.length - 6} more teams match; type more of the name to narrow it down.</div>}
        </div>
      )}
    </div>
  )
}

function TeamCard({ t, homeChapter, finals, year, inProgress, home, dctf, open, toggle }) {
  const now = t.games.filter(x => x.year === year).sort((a, b) => b.game.week - a.game.week)
  const past = t.games.filter(x => x.year !== year).sort((a, b) => b.year - a.year || b.game.week - a.game.week)
  const seasons = [...new Set(t.games.map(x => x.year))].sort((a, b) => b - a)
  const chapters = Object.entries(t.games.reduce((m, x) => (x.game.chapter ? (m[x.game.chapter] = (m[x.game.chapter] || 0) + 1, m) : m), {}))
    .sort((a, b) => b[1] - a[1])
  const record = t.games.reduce((r, x) => (x.mine != null && x.theirs != null ? (x.mine > x.theirs ? r.w++ : x.mine < x.theirs ? r.l++ : 0, r) : r), { w:0, l:0 })
  const classes = [...new Set(t.games.map(x => x.game.classification))].join(' · ')

  return (
    <div style={{ border:'1px solid var(--border)', borderRadius:8, padding:'14px 16px', marginBottom:12 }}>
      <div style={{ display:'flex', flexWrap:'wrap', justifyContent:'space-between', gap:8, alignItems:'baseline' }}>
        <div>
          <div style={{ fontFamily:"'Bebas Neue', sans-serif", fontSize:24, color:'var(--ink)', letterSpacing:0.5, lineHeight:1 }}>
            {t.name}{finals.some(f => f.won) && <span style={{ fontSize:16, marginLeft:8 }} title="State champion">🏆{finals.filter(f => f.won).length > 1 ? `×${finals.filter(f => f.won).length}` : ''}</span>}
          </div>
          <div style={{ fontFamily:'var(--mono)', fontSize:10, color:'var(--steel)', marginTop:4 }}>{classes}</div>
          {homeChapter && <div style={{ fontSize:12, color:'var(--mid)', marginTop:4 }}>Home chapter: <strong style={{ color:'var(--burnt)' }}>{chName(homeChapter)}</strong></div>}
          {home && (
            <div style={{ fontSize:12, color:'var(--mid)', marginTop:4 }}>
              Home stadium: <a href={home.map_link || `https://texasbob.com/stadium/stadium.php?id=${home.stadium_id}`} target="_blank" rel="noopener noreferrer" style={{ color:'var(--ink)' }}>{home.stadium}</a>
              {home.city ? `, ${home.city}` : ''}{home.capacity ? ` · ${home.capacity.toLocaleString()} seats` : ''}
            </div>
          )}
        </div>
        {dctf[t.name] && <DctfLinks game={{ team1: t.name }} teams={dctf} />}
      </div>

      {/* this season */}
      <div style={{ ...label, color:'var(--burnt)', marginTop:14 }}>{year}</div>
      {!now.length && <div style={{ fontSize:13, color:'var(--mid)', marginTop:4 }}>Not in the {year} playoffs{inProgress ? ' (so far)' : ''}.</div>}
      {now.map(({ game: g, opp, mine, theirs }, i) => (
        <div key={i} style={{ display:'flex', flexWrap:'wrap', gap:'6px 18px', alignItems:'center', padding:'8px 0', borderTop: i ? '1px solid rgba(15,13,11,0.07)' : 'none' }}>
          <div style={{ flex:'2 1 240px' }}>
            <div style={label}>{ROUNDS[g.week] || `Week ${g.week}`} · {g.classification}</div>
            <div style={{ fontSize:15, color:'var(--ink)', marginTop:2 }}>
              vs <strong>{opp}</strong>{mine != null && theirs != null ? <span style={{ fontFamily:'var(--mono)', fontSize:12, marginLeft:8 }}>{mine > theirs ? 'W' : mine < theirs ? 'L' : 'T'} {mine}–{theirs}</span> : null}
            </div>
          </div>
          <div style={{ flex:'1 1 150px' }}>
            <div style={label}>Chapter</div>
            <div style={{ fontSize:14, marginTop:2, color: g.chapter ? 'var(--burnt)' : 'var(--mid)', fontWeight: g.chapter ? 600 : 400 }}>
              {g.chapter ? chName(g.chapter) : (inProgress ? 'Not assigned yet' : '—')}
            </div>
          </div>
          <div style={{ flex:'2 1 240px' }}>
            <div style={label}>Site · Kickoff</div>
            <div style={{ fontSize:13, marginTop:2, color:'var(--ink)' }}>
              {g.site
                ? (g.map_link || g.lat != null)
                  ? <a href={g.map_link || `https://www.google.com/maps?q=${g.lat},${g.lng}`} target="_blank" rel="noopener noreferrer" style={{ color:'var(--ink)' }}>{placeName(g)}</a>
                  : placeName(g)
                : (inProgress ? 'Site TBD' : '—')}
              <span style={{ fontFamily:'var(--mono)', fontSize:11, color:'var(--mid)', marginLeft:8 }}>{g.date ? gameWhen(g) : (inProgress ? 'Date TBD' : '')}</span>
            </div>
          </div>
        </div>
      ))}

      {/* history, as on the Teams page */}
      <div style={{ display:'flex', flexWrap:'wrap', gap:'10px 28px', marginTop:14, paddingTop:12, borderTop:'1px solid var(--border)' }}>
        <Fact k="Playoff appearances" v={seasons.length} sub={seasons.join(', ')} />
        <Fact k="Playoff games" v={t.games.length} sub={record.w + record.l ? `${record.w}–${record.l} where scores are known` : ''} />
        <div style={{ flex:'2 1 260px' }}>
          <div style={label}>Chapters that have worked their games</div>
          <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginTop:6 }}>
            {chapters.length ? chapters.map(([c, n]) => (
              <span key={c} style={{ fontFamily:'var(--mono)', fontSize:10, padding:'3px 8px', borderRadius:4, border:'1px solid var(--border)', color:'var(--ink)' }}>
                {chName(c)} · {n}
              </span>
            )) : <span style={{ fontSize:12, color:'var(--mid)' }}>None recorded</span>}
          </div>
        </div>
      </div>

      {finals.length > 0 && (() => {
        const won = finals.filter(f => f.won), lost = finals.filter(f => !f.won)
        const chip = (x, i) => (
          <span key={i} title={`${x.year} ${x.cls} state final vs ${x.opp}`} style={{
            fontFamily:'var(--mono)', fontSize:10, padding:'3px 8px', borderRadius:4, color:'var(--ink)',
            background: x.won ? 'rgba(253,208,35,0.25)' : 'rgba(15,13,11,0.05)',
            border: x.won ? '1px solid rgba(201,154,30,0.5)' : '1px solid var(--border)',
          }}>{x.year} <span style={{ color:'var(--mid)' }}>{x.cls} vs {x.opp}</span></span>
        )
        return (
          <div style={{ display:'flex', flexWrap:'wrap', gap:'10px 28px', marginTop:12 }}>
            <div style={{ flex:'1 1 260px' }}>
              <div style={label}>🏆 State championships · {won.length}</div>
              <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginTop:6 }}>
                {won.length ? won.map(chip) : <span style={{ fontSize:12, color:'var(--mid)' }}>None on record</span>}
              </div>
            </div>
            {lost.length > 0 && (
              <div style={{ flex:'1 1 260px' }}>
                <div style={label}>State final runner-up · {lost.length}</div>
                <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginTop:6 }}>{lost.map(chip)}</div>
              </div>
            )}
          </div>
        )
      })()}

      {past.length > 0 && (
        <div style={{ marginTop:12 }}>
          <button onClick={toggle} style={{ fontFamily:'var(--mono)', fontSize:10, letterSpacing:'0.08em', padding:'5px 10px', borderRadius:4,
                   border:'1px solid var(--border)', background: open ? 'var(--ink)' : 'transparent', color: open ? 'var(--cream)' : 'var(--ink)', cursor:'pointer' }}>
            {open ? 'Hide' : 'Show'} past playoff games ({past.length})
          </button>
          {open && (
            <div style={{ overflowX:'auto', marginTop:8 }}>
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
                <thead><tr>{['Year', 'Round', 'Class', 'Opponent', 'Result', 'Chapter'].map(h => <th key={h} style={{ ...label, textAlign:'left', padding:'6px 8px', fontWeight:500 }}>{h}</th>)}</tr></thead>
                <tbody>
                  {past.map(({ year: y, game: g, opp, mine, theirs }, i) => (
                    <tr key={i} style={{ borderTop:'1px solid rgba(15,13,11,0.06)' }}>
                      <td style={{ padding:'6px 8px', fontFamily:'var(--mono)', fontSize:11 }}>{y}</td>
                      <td style={{ padding:'6px 8px' }}>{ROUNDS[g.week] || g.round || `Week ${g.week}`}</td>
                      <td style={{ padding:'6px 8px', fontFamily:'var(--mono)', fontSize:10, color:'var(--steel)' }}>{g.classification}</td>
                      <td style={{ padding:'6px 8px' }}>{opp}</td>
                      <td style={{ padding:'6px 8px', fontFamily:'var(--mono)', fontSize:11 }}>{mine != null && theirs != null ? `${mine > theirs ? 'W' : mine < theirs ? 'L' : 'T'} ${mine}–${theirs}` : '—'}</td>
                      <td style={{ padding:'6px 8px', color: g.chapter ? 'var(--burnt)' : 'var(--mid)' }}>{g.chapter ? chName(g.chapter) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function Fact({ k, v, sub }) {
  return (
    <div style={{ flex:'1 1 150px' }}>
      <div style={label}>{k}</div>
      <div style={{ fontFamily:"'Bebas Neue', sans-serif", fontSize:26, color:'var(--ink)', lineHeight:1.1 }}>{v}</div>
      {sub && <div style={{ fontFamily:'var(--mono)', fontSize:10, color:'var(--mid)' }}>{sub}</div>}
    </div>
  )
}
