import React, { useEffect, useState } from 'react'

// Team pages on Dave Campbell's Texas Football (built by scripts/dctf_teams.py)
let cache = null
let pending = null
function load() {
  if (cache) return Promise.resolve(cache)
  if (!pending) {
    pending = fetch(`${import.meta.env.BASE_URL}data/dctf_teams.json?v=${__BUILD_TIME__}`)
      .then(r => r.ok ? r.json() : { teams: {} })
      .then(d => (cache = d.teams || {}))
      .catch(() => (cache = {}))
  }
  return pending
}

export function useDctfTeams() {
  const [teams, setTeams] = useState(cache || {})
  useEffect(() => { let live = true; load().then(t => live && setTeams(t)); return () => { live = false } }, [])
  return teams
}

const btn = {
  display:'inline-flex', alignItems:'center', gap:4, fontFamily:'var(--mono)', fontSize:9, letterSpacing:'0.06em',
  padding:'3px 8px', borderRadius:4, border:'1px solid var(--border)', background:'var(--ink)', color:'var(--cream)',
  textDecoration:'none', whiteSpace:'nowrap',
}

// One button per team with a Dave Campbell's page: "DCTF · Canadian ↗"
export function DctfLinks({ game, teams }) {
  const links = [game.team1, game.team2].filter(t => teams[t])
  if (!links.length) return null
  return (
    <span style={{ display:'inline-flex', gap:4, flexWrap:'wrap' }}>
      {links.map(t => (
        <a key={t} href={`https://www.davecampbells.com/team/${teams[t]}`} target="_blank" rel="noopener noreferrer"
           title={`${t} on Dave Campbell's Texas Football`} style={btn}>
          DCTF · {t} ↗
        </a>
      ))}
    </span>
  )
}
