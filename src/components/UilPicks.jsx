import React, { useMemo } from 'react'
import { chapterColor } from '../chapterColors'
import { useHomeChapters } from '../homeChapters'
import { UilTag } from '../uilPick'
import { CHAPTER_CENTERS, roundTripMiles } from '../chapterCenters'
import { useCollapse, ShowMore } from '../ShowMore'

const CH_NAMES = {
  ABI:'Abilene', AMA:'Amarillo', AUS:'Austin', BEA:'Southeast Texas', COM:'Commerce', CSC:'College Station', CTX:'Central Texas',
  DAL:'Dallas', ELP:'El Paso', FTW:'Fort Worth', HOU:'Houston', NTX:'North Texas', PBC:'Permian Basin', PVC:'Pecan Valley',
  RGV:'Rio Grande Valley', SAN:'San Angelo', SAT:'San Antonio', SFA:'Stephen F. Austin', SPC:'South Plains', STX:'South Texas', TYL:'Tyler', WAC:'Waco',
}

// How many UIL-assigned games each chapter got, with the miles they drove for them
function ByChapter({ rounds }) {
  const more = useCollapse()
  const by = {}
  for (const r of rounds) for (const g of r.games) {
    if (!g.chapter) continue
    const c = by[g.chapter] || (by[g.chapter] = { c: g.chapter, n: 0, miles: 0 })
    c.n++; c.miles += roundTripMiles(g) || 0
  }
  const rows = Object.values(by).sort((a, b) => b.n - a.n || b.miles - a.miles)
  if (!rows.length) return null
  const max = rows[0].n, total = rows.reduce((s, r) => s + r.n, 0)
  return (
    <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:10, padding:'14px 16px', marginTop:14 }}>
      <div style={{ fontFamily:'var(--mono)', fontSize:9, letterSpacing:'0.12em', textTransform:'uppercase', color:'var(--mid)', marginBottom:10 }}>
        UIL-assigned games by chapter
      </div>
      {more.cut(rows).map(r => (
        <div key={r.c} style={{ display:'grid', gridTemplateColumns:'minmax(90px, 150px) minmax(40px, 1fr) minmax(0, max-content)', alignItems:'center', gap:10, padding:'4px 0' }}>
          <span style={{ fontSize:13 }}>{CH_NAMES[r.c] || r.c} <span style={{ fontFamily:'var(--mono)', fontSize:10, color:'var(--mid)' }}>{r.c}</span></span>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <div style={{ height:14, borderRadius:3, background:chapterColor(r.c), width:`${100 * r.n / max}%`, minWidth:6 }} />
            <span style={{ fontFamily:'var(--mono)', fontSize:12, fontWeight:700 }}>{r.n}</span>
          </div>
          <span style={{ fontFamily:'var(--mono)', fontSize:11, color:'var(--mid)', textAlign:'right', whiteSpace:'normal' }}>
            {Math.round(100 * r.n / total)}% · ~{Math.round(r.miles).toLocaleString()} mi driven
          </span>
        </div>
      ))}
      <ShowMore c={more} total={rows.length} noun="chapters" />
    </div>
  )
}

const ROUNDS ={ 1: 'Bi-District', 2: 'Area', 3: 'Regionals', 4: 'Quarterfinals', 5: 'Semifinals', 6: 'State Final' }

// Games where UIL, not the two schools, picked the officiating chapter (workbook "UIL pick" column)
export default function UilPicks({ data }) {
  const home = useHomeChapters(data?.games?.[0]?.year)
  const more = useCollapse()
  const rounds = useMemo(() => {
    const by = {}
    for (const g of data?.games || []) if (g.uil_pick) (by[g.week] = by[g.week] || []).push(g)
    return Object.entries(by).map(([w, gs]) => ({ week: +w, games: gs.sort((a, b) => a.classification.localeCompare(b.classification)) }))
      .sort((a, b) => a.week - b.week)
  }, [data])
  const total = rounds.reduce((n, r) => n + r.games.length, 0)
  if (!total) return null

  // collapsed: the first 10 games across the rounds, in order
  let left = more.open ? Infinity : more.limit
  const shownRounds = rounds.map(r => { const games = r.games.slice(0, Math.max(0, left)); left -= games.length; return { ...r, shown: games } }).filter(r => r.shown.length)
  const chip = c => ({ fontFamily:'var(--mono)', fontSize:10, padding:'2px 6px', borderRadius:3, background:chapterColor(c), color:'#fff', whiteSpace:'nowrap' })
  return (
    <div style={{ marginBottom:48 }}>
      <div style={{ fontFamily:'var(--mono)', fontSize:10, letterSpacing:'0.18em', textTransform:'uppercase', color:'var(--mid)', marginBottom:6 }}>Playoff Selections</div>
      <div className="card-title" style={{ fontFamily:"'Bebas Neue', sans-serif", fontSize:30, color:'var(--ink)', marginBottom:6, paddingBottom:12, borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', gap:12 }}>
        <div style={{ width:4, height:28, borderRadius:2, background:'var(--burnt)' }} />
        UIL-Assigned Games
      </div>
      <div style={{ fontSize:13, color:'var(--ink)', lineHeight:1.6, margin:'12px 0 14px', maxWidth:860, background:'rgba(253,208,35,0.22)',
        borderLeft:'4px solid var(--gold)', borderRadius:6, padding:'10px 14px' }}>
        <strong>Even when UIL steps in, the coaches still choose.</strong> The very first preference on UIL's officials request form is
        "Chapter Agreed Upon by BOTH Coaches (if any)": the coaches can simply name the chapter they want. Failing that, they hand UIL a list of the
        chapters they'll accept ("Chapters You Want UIL to Choose From") and a <strong>blacklist</strong> of chapters they won't
        ("Chapters Schools Want to Scratch"). <strong>Blacklisted chapters aren't even considered.</strong> The "neutral" UIL pick only chooses from the
        coaches' own list.{' '}
        <a href="https://www.uiltexas.org/form/officials-request/football.php" target="_blank" rel="noopener noreferrer" style={{ color:'var(--burnt)' }}>See the form ↗</a>
      </div>
      <div style={{ fontSize:13, color:'var(--mid)', lineHeight:1.55, margin:'0 0 14px', maxWidth:800 }}>
        Normally the two schools' coaches choose the chapter for a playoff game. In these {total} games, UIL assigned the officials instead.
      </div>
      <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:10, padding:'6px 16px 10px' }}>
        {shownRounds.map(r => (
          <div key={r.week}>
            <div style={{ fontFamily:'var(--mono)', fontSize:9, letterSpacing:'0.12em', textTransform:'uppercase', color:'var(--mid)', padding:'10px 0 4px' }}>
              {ROUNDS[r.week] || `Week ${r.week}`} · {r.games.length} game{r.games.length === 1 ? '' : 's'}
            </div>
            {r.shown.map((g, i) => {
              const hs = [...new Set([home[g.team1], home[g.team2]].filter(Boolean))]
              const played = g.score1 != null && g.score2 != null
              const name = <>{g.team1}{played && <span style={{ color:'var(--mid)' }}> {g.score1}</span>} v {g.team2}{played && <span style={{ color:'var(--mid)' }}> {g.score2}</span>}</>
              return (
                <div key={i} style={{ display:'flex', gap:10, alignItems:'center', flexWrap:'wrap', fontSize:13, padding:'6px 0', borderBottom:'1px dashed var(--border)' }}>
                  <span style={{ flex:1, minWidth:200 }}>
                    {g.mp_url ? <a href={g.mp_url} target="_blank" rel="noreferrer" style={{ color:'var(--ink)', textDecoration:'none' }}>{name}</a> : name}
                    <span style={{ color:'var(--mid)', fontSize:11 }}> · {g.classification}</span>
                  </span>
                  {hs.length > 0 && <span style={{ fontFamily:'var(--mono)', fontSize:10, color:'var(--mid)' }} title="The schools' home chapters">home: {hs.join(' / ')}</span>}
                  {g.chapter && <span style={chip(g.chapter)}>worked by: {g.chapter}</span>}
                  {(m => <span style={{ fontFamily:'var(--mono)', fontSize:11, color:'var(--ink)', minWidth:112, textAlign:'right' }}
                    title={m == null ? 'Game site not mapped yet' : `About ${Math.round(m / 2)} miles each way from ${CHAPTER_CENTERS[g.chapter]?.[0] || g.chapter} to ${g.site || 'the game site'}`}>
                    {m == null ? '—' : `~${Math.round(m).toLocaleString()} mi round trip`}</span>)(roundTripMiles(g))}
                  <UilTag game={g} />
                </div>
              )
            })}
          </div>
        ))}
      </div>
      <ShowMore c={more} total={total} noun="games" />
      <ByChapter rounds={rounds} />
      <div style={{ fontFamily:'var(--mono)', fontSize:10, color:'var(--mid)', marginTop:8, lineHeight:1.6 }}>
        Only games known to be UIL assignments are listed; others may not have been reported yet.
        Miles are estimated driving miles, round trip, from the chapter's UIL center point to the game site (straight-line distance × 1.2).
      </div>
    </div>
  )
}
