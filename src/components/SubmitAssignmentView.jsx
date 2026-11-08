import React, { useState, useEffect, useMemo } from 'react'
import { useForm, ValidationError } from '@formspree/react'

const CHAPTERS = {
  ABI:'Abilene', AMA:'Amarillo', AUS:'Austin', BEA:'Beaumont', COM:'Commerce',
  CSC:'College Station', CTX:'Central Texas', DAL:'Dallas', ELP:'El Paso',
  ETX:'East Texas', FTW:'Fort Worth', HOU:'Houston', NTX:'North Texas',
  PBC:'Permian Basin', PVC:'Pecan Valley', RGV:'Rio Grande Valley', SAT:'San Antonio',
  SAN:'San Angelo', SFA:'Stephen F. Austin', SPC:'South Plains', STX:'South Texas',
  TYL:'Tyler', WAC:'Waco',
}
const ROUNDS = { 1:'Bi-District', 2:'Area', 3:'Regionals', 4:'Quarterfinals', 5:'Semifinals', 6:'Championship' }
const SEASON = 2026

// Visitors send in a game's chapter assignment; it arrives by email through Formspree
// (same form as Contact Us), marked "Game assignment submission".
export default function SubmitAssignmentView() {
  const [state, submitToFormspree] = useForm('xqevvaow')
  const [games, setGames] = useState([])
  const [home, setHome] = useState('')
  const [visitor, setVisitor] = useState('')
  const [chapter, setChapter] = useState('')
  const [problem, setProblem] = useState('')

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}data/${SEASON}.json?v=${__BUILD_TIME__}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => setGames((d?.games || []).filter(g => !g.team1.endsWith('(?)') && !g.team2.endsWith('(?)'))))
      .catch(() => {})
  }, [])

  useEffect(() => setProblem(''), [home, visitor, chapter])   // a fix clears the warning

  const teams = useMemo(() => [...new Set(games.flatMap(g => [g.team1, g.team2]))].sort(), [games])

  // the season's game these teams point to, latest round first
  const match = useMemo(() => {
    const h = home.trim().toLowerCase(), v = visitor.trim().toLowerCase()
    if (!h && !v) return null
    const hits = games.filter(g => {
      const t = [g.team1.toLowerCase(), g.team2.toLowerCase()]
      return (!h || t.includes(h)) && (!v || t.includes(v))
    }).sort((a, b) => b.week - a.week)
    return hits[0] || null
  }, [home, visitor, games])

  const describe = g => `${g.classification} · ${g.team1} vs ${g.team2} · ${ROUNDS[g.week] || 'Week ' + g.week}` +
    (g.date ? ` · ${g.date.slice(5, 7)}/${g.date.slice(8, 10)}/${g.date.slice(0, 4)}` : '')

  const onSubmit = e => {
    e.preventDefault()
    if (!home.trim() && !visitor.trim()) { setProblem('Enter the home team, the visiting team, or both.'); return }
    if (!chapter) { setProblem('Pick the chapter assigned to the game.'); return }
    setProblem('')
    submitToFormspree(e)
  }

  const inputStyle = {
    fontFamily: 'var(--sans)', fontSize: 13, padding: '10px 14px', borderRadius: 6,
    border: '1px solid var(--border)', background: 'rgba(255,255,255,0.03)', color: 'var(--ink)',
    outline: 'none', width: '100%', boxSizing: 'border-box',
  }
  const labelStyle = { fontFamily: 'var(--mono)', fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--mid)' }
  const errorStyle = { fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--burnt)', marginTop: 4 }

  return (
    <div style={{ maxWidth: 560 }}>
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontFamily: 'var(--display)', fontSize: 20, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: 8 }}>
          Submit a Game Assignment
        </div>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--mid)', lineHeight: 1.7 }}>
          Know which chapter has a {SEASON} playoff game? Enter the home team, the visiting team, or both, and the chapter.
          Submissions are reviewed before they appear on the site.
        </div>
      </div>

      {state.succeeded ? (
        <div style={{ background: 'rgba(80,160,80,0.08)', border: '1px solid rgba(80,160,80,0.25)', borderRadius: 10, padding: '24px 28px' }}>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(60,150,60,0.95)', marginBottom: 6 }}>
            Assignment sent
          </div>
          <div style={{ color: 'var(--mid)', fontSize: 13 }}>Thanks! It will be checked and added to the site.</div>
        </div>
      ) : (
        <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <input type="hidden" name="_subject" value="Game assignment submission" />
          <input type="hidden" name="season" value={SEASON} />
          <input type="hidden" name="matched_game" value={match ? describe(match) : 'no match found on the site'} />

          <datalist id="season-teams">{teams.map(t => <option key={t} value={t} />)}</datalist>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label htmlFor="home_team" style={labelStyle}>Home team</label>
            <input id="home_team" name="home_team" list="season-teams" value={home} onChange={e => setHome(e.target.value)}
                   placeholder="e.g. Arlington Martin" autoComplete="off" style={inputStyle} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label htmlFor="visitor_team" style={labelStyle}>Visiting team</label>
            <input id="visitor_team" name="visitor_team" list="season-teams" value={visitor} onChange={e => setVisitor(e.target.value)}
                   placeholder="e.g. Byron Nelson" autoComplete="off" style={inputStyle} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label htmlFor="chapter" style={labelStyle}>Chapter</label>
            <select id="chapter" name="chapter" value={chapter} onChange={e => setChapter(e.target.value)} style={inputStyle}>
              <option value="">Pick a chapter…</option>
              {Object.entries(CHAPTERS).map(([c, n]) => <option key={c} value={c}>{c} · {n}</option>)}
            </select>
            <ValidationError field="chapter" errors={state.errors} style={errorStyle} />
          </div>

          {match && (
            <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--steel)' }}>
              Game: {describe(match)}{match.chapter ? ` · currently listed as ${match.chapter}` : ''}
            </div>
          )}

          {problem && <div style={errorStyle}>{problem}</div>}
          <ValidationError errors={state.errors} style={errorStyle} />

          <button type="submit" disabled={state.submitting} style={{
            fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase',
            padding: '11px 20px', borderRadius: 6, border: 'none', color: '#fff', alignSelf: 'flex-start',
            background: state.submitting ? 'rgba(193,68,14,0.5)' : 'var(--burnt)', cursor: state.submitting ? 'default' : 'pointer',
          }}>
            {state.submitting ? 'Sending…' : 'Submit Assignment'}
          </button>
        </form>
      )}
    </div>
  )
}
