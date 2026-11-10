import React, { useMemo, useState } from 'react'
import { placeName, gameWhen } from '../placeName'
import { useDctfTeams, DctfLinks } from '../dctf'

const ROUNDS = { 1:'Bi-District', 2:'Area', 3:'Regionals', 4:'Quarterfinals', 5:'Semifinals', 6:'Championship' }
const CHAPTERS = {
  ABI:'Abilene', AMA:'Amarillo', AUS:'Austin', BEA:'Beaumont', COM:'Commerce', CSC:'College Station',
  CTX:'Central Texas', DAL:'Dallas', ELP:'El Paso', ETX:'East Texas', FTW:'Fort Worth', HOU:'Houston',
  NTX:'North Texas', PBC:'Permian Basin', PVC:'Pecan Valley', RGV:'Rio Grande Valley', SAT:'San Antonio',
  SAN:'San Angelo', SFA:'Stephen F. Austin', SPC:'South Plains', STX:'South Texas', TYL:'Tyler', WAC:'Waco',
}
const words = s => (s || '').toLowerCase().replace(/\(\?\)/g, '').replace(/[^a-z0-9 ]+/g, ' ').split(/\s+/).filter(Boolean)

// Find a team's games this season: matchup, round, chapter, site, kickoff
export default function TeamSearch({ data, year }) {
  const [q, setQ] = useState('')
  const dctf = useDctfTeams()
  const games = data?.games || []
  const inProgress = data?.season?.status === 'in_progress'
  const teams = useMemo(() => [...new Set(games.flatMap(g => [g.team1, g.team2]))].sort(), [games])

  const hits = useMemo(() => {
    const qw = words(q)
    if (!qw.length || q.trim().length < 2) return []
    // every word typed must start a word of the team's name ("lake trav" finds Austin Lake Travis)
    const fits = name => { const nw = words(name); return qw.every(w => nw.some(n => n.startsWith(w))) }
    return games.filter(g => fits(g.team1) || fits(g.team2)).sort((a, b) => b.week - a.week || a.classification.localeCompare(b.classification))
  }, [q, games])

  if (!games.length) return null
  const label = { fontFamily:'var(--mono)', fontSize:9, letterSpacing:'0.12em', textTransform:'uppercase', color:'var(--mid)' }
  const winner = g => g.score1 != null && g.score2 != null ? (g.score1 > g.score2 ? g.team1 : g.score2 > g.score1 ? g.team2 : null) : null

  return (
    <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:10, padding:'16px 18px', marginBottom:32 }}>
      <label htmlFor="team-search" style={{ ...label, color:'var(--burnt)', fontSize:10, letterSpacing:'0.16em', display:'block', marginBottom:8 }}>
        Find a team's {year} playoff games
      </label>
      <div style={{ position:'relative' }}>
        <input id="team-search" list="team-search-names" value={q} onChange={e => setQ(e.target.value)} autoComplete="off"
               placeholder="Type a school, e.g. Canyon, Katy, Lake Travis…"
               style={{ width:'100%', boxSizing:'border-box', fontFamily:'var(--sans)', fontSize:15, padding:'11px 40px 11px 14px',
                        border:'1px solid var(--border)', borderRadius:8, background:'var(--cream)', color:'var(--ink)', outline:'none' }} />
        {q && <button onClick={() => setQ('')} aria-label="Clear" style={{ position:'absolute', right:8, top:'50%', transform:'translateY(-50%)',
                 border:'none', background:'transparent', fontSize:18, color:'var(--mid)', cursor:'pointer' }}>×</button>}
        <datalist id="team-search-names">{teams.map(t => <option key={t} value={t} />)}</datalist>
      </div>

      {q.trim().length >= 2 && (
        <div style={{ marginTop:14 }}>
          {!hits.length && <div style={{ fontSize:13, color:'var(--mid)' }}>No {year} playoff games for “{q}”. Try fewer letters or another part of the name.</div>}
          {hits.slice(0, 12).map((g, i) => (
            <div key={i} style={{ display:'flex', flexWrap:'wrap', gap:'8px 18px', alignItems:'center', padding:'12px 0', borderTop: i ? '1px solid rgba(15,13,11,0.07)' : 'none' }}>
              <div style={{ minWidth:230, flex:'2 1 260px' }}>
                <div style={label}>{ROUNDS[g.week] || `Week ${g.week}`} · {g.classification}</div>
                <div style={{ fontSize:16, color:'var(--ink)', marginTop:3 }}>
                  <span style={{ fontWeight: winner(g) === g.team1 ? 700 : 500 }}>{g.team1}{g.score1 != null ? ` ${g.score1}` : ''}</span>
                  <span style={{ color:'var(--mid)' }}> vs </span>
                  <span style={{ fontWeight: winner(g) === g.team2 ? 700 : 500 }}>{g.team2}{g.score2 != null ? ` ${g.score2}` : ''}</span>
                </div>
              </div>
              <div style={{ flex:'1 1 150px' }}>
                <div style={label}>Chapter</div>
                <div style={{ fontSize:14, marginTop:3, color: g.chapter ? 'var(--burnt)' : 'var(--mid)', fontWeight: g.chapter ? 600 : 400 }}>
                  {g.chapter ? `${CHAPTERS[g.chapter] || g.chapter} (${g.chapter})` : (inProgress ? 'Not assigned yet' : '—')}
                </div>
              </div>
              <div style={{ flex:'2 1 240px' }}>
                <div style={label}>Site · Kickoff</div>
                <div style={{ fontSize:13, marginTop:3, color:'var(--ink)' }}>
                  {g.site
                    ? (g.map_link || g.lat != null)
                      ? <a href={g.map_link || `https://www.google.com/maps?q=${g.lat},${g.lng}`} target="_blank" rel="noopener noreferrer" style={{ color:'var(--ink)' }}>{placeName(g)}</a>
                      : placeName(g)
                    : (inProgress ? 'Site TBD' : '—')}
                  <span style={{ fontFamily:'var(--mono)', fontSize:11, color:'var(--mid)', marginLeft:8 }}>{g.date ? gameWhen(g) : (inProgress ? 'Date TBD' : '')}</span>
                </div>
              </div>
              <div style={{ flex:'1 1 180px' }}><DctfLinks game={g} teams={dctf} /></div>
            </div>
          ))}
          {hits.length > 12 && <div style={{ fontSize:12, color:'var(--mid)', marginTop:6 }}>{hits.length - 12} more; type more of the name to narrow it down.</div>}
        </div>
      )}
    </div>
  )
}
