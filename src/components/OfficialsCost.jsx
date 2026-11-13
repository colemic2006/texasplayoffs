import React, { useMemo } from 'react'
import { gameCost, PAY } from '../officialsCost'
import { chapterColor } from '../chapterColors'
import { placeName } from '../placeName'

const ROUNDS = { 1: 'Bi-District', 2: 'Area', 3: 'Regionals', 4: 'Quarterfinals', 5: 'Semifinals', 6: 'State Final' }
const usd = n => '$' + Math.round(n).toLocaleString()

export default function OfficialsCost({ data }) {
  const names = { ELP: 'El Paso', BEA: 'Beaumont', ...Object.fromEntries((data?.chapters || []).map(c => [c.code, c.name])) }
  const { top, all, total } = useMemo(() => {
    const all = (data?.games || []).map(g => ({ ...g, cost: gameCost(g) })).filter(g => g.cost)
    all.sort((a, b) => b.cost.total - a.cost.total)
    return { top: all.slice(0, 10), all, total: all.reduce((s, g) => s + g.cost.total, 0) }
  }, [data])
  if (!all.length) return null

  const th = { fontFamily:'var(--mono)', fontSize:9, letterSpacing:'0.12em', textTransform:'uppercase', color:'var(--mid)', padding:'8px 10px', textAlign:'right', borderBottom:'1px solid var(--border)', whiteSpace:'nowrap' }
  const td = { padding:'8px 10px', borderBottom:'1px solid var(--border)', fontSize:12, textAlign:'right', fontFamily:'var(--mono)', whiteSpace:'nowrap', verticalAlign:'top' }

  return (
    <div style={{ marginBottom:48 }}>
      <div style={{ fontFamily:'var(--mono)', fontSize:10, letterSpacing:'0.18em', textTransform:'uppercase', color:'var(--mid)', marginBottom:6 }}>Officiating Costs</div>
      <div style={{ fontFamily:"'Bebas Neue', sans-serif", fontSize:30, color:'var(--ink)', marginBottom:6, paddingBottom:12, borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', gap:12 }}>
        <div style={{ width:4, height:28, borderRadius:2, background:'var(--burnt)' }} />
        Most Expensive Games to Officiate
      </div>
      <div style={{ fontSize:13, color:'var(--mid)', lineHeight:1.55, margin:'10px 0 14px', maxWidth:800 }}>
        Estimated cost of the officiating crew for each game, from the TASO crew-of-7 pay sheet. The 10 costliest games are shown.
        Across all {all.length} games with a site: <strong style={{ color:'var(--ink)' }}>{usd(total)}</strong>, an average of {usd(total / all.length)} a game.
      </div>
      <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:10, overflowX:'auto' }}>
        <table style={{ width:'100%', borderCollapse:'collapse' }}>
          <thead><tr>
            <th style={{ ...th, textAlign:'left' }}>#</th>
            <th style={{ ...th, textAlign:'left' }}>Game</th>
            <th style={{ ...th, textAlign:'left' }}>Crew from</th>
            <th style={th}>One way</th>
            <th style={th}>Round trip</th>
            <th style={th}>Game fees</th>
            <th style={th}>Travel</th>
            <th style={th}>Riders</th>
            <th style={th}>Meals</th>
            <th style={{ ...th, color:'var(--burnt)' }}>Total</th>
            <th style={th}>Per school</th>
          </tr></thead>
          <tbody>
            {top.map((g, i) => {
              const c = g.cost
              return (
                <tr key={i}>
                  <td style={{ ...td, textAlign:'left', color:'var(--mid)' }}>{i + 1}</td>
                  <td style={{ ...td, textAlign:'left', fontFamily:'DM Sans', whiteSpace:'normal', minWidth:220 }}>
                    <div style={{ fontWeight:600 }}>{g.team1} v {g.team2}</div>
                    <div style={{ fontSize:11, color:'var(--mid)' }}>{ROUNDS[g.week]} · {g.classification} · {placeName(g)} · crew of {c.crew}</div>
                  </td>
                  <td style={{ ...td, textAlign:'left' }}>
                    <span style={{ fontSize:10, padding:'2px 7px', borderRadius:3, background:chapterColor(g.chapter), color:'#fff' }}>{names[g.chapter] || g.chapter}</span>
                  </td>
                  <td style={td}>{Math.round(c.oneWay)} mi</td>
                  <td style={td}>{Math.round(c.roundTrip)} mi</td>
                  <td style={td}>{usd(c.fees)}</td>
                  <td style={td} title={c.band ? `${c.crew} officials × $${c.band} travel band` : `${Math.round(c.roundTrip)} round-trip miles × ${PAY.cars} cars × $${PAY.perMile} a mile`}>{usd(c.travel)}</td>
                  <td style={td}>{c.riders ? usd(c.riders) : '—'}</td>
                  <td style={td}>{c.meals ? usd(c.meals) : '—'}</td>
                  <td style={{ ...td, color:'var(--burnt)', fontWeight:700 }}>{usd(c.total)}</td>
                  <td style={td}>{usd(c.total / 2)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <div style={{ fontFamily:'var(--mono)', fontSize:10, color:'var(--mid)', marginTop:8, lineHeight:1.7 }}>
        How it's figured: crews of 7 for 2A-6A and 5 for six-man (1A). Game fee {usd(PAY.gameFee)} per official, the lowest gate band, since gate receipts aren't known.
        Up to 90 miles one way, each official gets the travel band ($20 up to 30 miles, $35 up to 60, $50 up to 90).
        Past 90 miles: {PAY.cars} cars paid ${PAY.perMile} a mile for the round trip (there and back), ${PAY.riderFee} for each rider, and the ${PAY.meal} playoff meal for every official.
        Miles are estimated: straight-line from the chapter's center city × 1.2 for roads. "Per school" assumes the two schools split the cost evenly.
      </div>
    </div>
  )
}
