import React from 'react'
import { PAY } from '../officialsCost'
import { useSort, SortTh } from '../sortable'

// The fallacies and inequities of flat travel bands, compared with paying actual mileage at the
// IRS standard rate. Each band is compared at its midpoint (one way), round trip.
// 2026 IRS standard business mileage rate for the fall (football season): 76 cents a mile, confirmed by the site owner.
const IRS = 0.76
const IRS_2025 = 0.70
const BANDS = PAY.bands.map(([max, fee], i) => {
  const lo = i ? PAY.bands[i - 1][0] : 0, mid = (lo + max) / 2, rt = 2 * mid
  return { n: i + 1, lo: lo + 1, max, fee, mid, rt, irs: rt * IRS, perMile: fee / rt }
}).map(b => ({ ...b, gap: 100 * (b.irs / b.fee - 1), short: b.irs - b.fee }))
const CREW = 7
const m2 = n => '$' + n.toFixed(2)
const m0 = n => '$' + Math.round(n).toLocaleString()

const th = { fontFamily:'var(--mono)', fontSize:9, letterSpacing:'0.1em', textTransform:'uppercase', color:'var(--mid)', padding:'8px 10px', textAlign:'right', borderBottom:'1px solid var(--border)', whiteSpace:'nowrap' }
const td = { padding:'8px 10px', borderBottom:'1px solid var(--border)', fontSize:13, textAlign:'right', fontFamily:'var(--mono)' }
const box = { background:'var(--surface)', border:'1px solid var(--border)', borderRadius:10, overflowX:'auto' }
const point = { background:'var(--surface)', border:'1px solid var(--border)', borderRadius:10, padding:'12px 16px', fontSize:13.5, color:'var(--ink)', lineHeight:1.6 }
const head = { fontFamily:'var(--mono)', fontSize:10, letterSpacing:'0.14em', textTransform:'uppercase', color:'var(--burnt)', fontWeight:700, marginBottom:6 }

function Card({ kicker = 'Travel bands', title, intro, children }) {
  return (
    <div style={{ marginTop:48 }}>
      <div style={{ fontFamily:'var(--mono)', fontSize:10, letterSpacing:'0.18em', textTransform:'uppercase', color:'var(--mid)', marginBottom:6 }}>{kicker}</div>
      <div className="card-title" style={{ fontFamily:"'Bebas Neue', sans-serif", fontSize:30, color:'var(--ink)', marginBottom:6, paddingBottom:12, borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', gap:12 }}>
        <div style={{ width:4, height:28, borderRadius:2, background:'var(--burnt)' }} />
        {title}
      </div>
      {intro && <div style={{ fontSize:13, color:'var(--mid)', lineHeight:1.55, margin:'10px 0 14px', maxWidth:860 }}>{intro}</div>}
      {children}
    </div>
  )
}
const body = { fontSize:14, color:'var(--ink)', lineHeight:1.65, maxWidth:860 }
const [b1, b2, b3] = BANDS

// 1: flat fee vs actual mileage, band by band
function Gap() {
  const s = useSort()
  const rows = s.sort(BANDS, { band: b => b.n, fee: b => b.fee, rt: b => b.rt, irs: b => b.irs, gap: b => b.gap, perMile: b => b.perMile })
  return (
    <Card title="The Farther You Drive, the Less You're Paid per Mile"
      intro={<>Officials are paid a flat travel fee by distance band instead of actual mileage: ${b1.fee} up to {b1.max} miles one way, ${b2.fee} up to {b2.max}, ${b3.fee} up to {b3.max}.
        The bands are meant to pay about what the drive costs, with shorter and longer trips in each band balancing out. Measured at each band's midpoint against the 2026 IRS mileage rate
        of <strong style={{ color:'var(--ink)' }}>{Math.round(IRS * 100)}¢ a mile</strong>, that holds for band 1 and falls apart after it.</>}>
      <div style={{ ...box, maxWidth:900 }}>
        <table style={{ width:'100%', borderCollapse:'collapse', minWidth:640 }}>
          <thead><tr>
            <SortTh s={s} k="band" style={{ ...th, textAlign:'left' }}>Band (one way)</SortTh>
            <SortTh s={s} k="fee" style={th}>Flat fee</SortTh>
            <SortTh s={s} k="rt" style={th}>Midpoint, round trip</SortTh>
            <SortTh s={s} k="irs" style={th}>At the IRS rate</SortTh>
            <SortTh s={s} k="gap" style={{ ...th, color:'var(--burnt)' }}>Underpaid by</SortTh>
            <SortTh s={s} k="perMile" style={th}>Flat fee per mile</SortTh>
          </tr></thead>
          <tbody>{rows.map(b => (
            <tr key={b.n}>
              <td style={{ ...td, textAlign:'left', fontFamily:'DM Sans' }}><strong>Band {b.n}</strong> <span style={{ color:'var(--mid)', fontSize:11 }}>{b.lo}–{b.max} mi</span></td>
              <td style={td}>${b.fee}</td>
              <td style={td}>{b.rt} mi</td>
              <td style={td}>{m2(b.irs)}</td>
              <td style={{ ...td, fontWeight:700, color: b.gap > 50 ? 'var(--burnt)' : 'var(--ink)' }}>{Math.round(b.gap)}% <span style={{ color:'var(--mid)', fontSize:11, fontWeight:400 }}>({m2(b.short)})</span></td>
              <td style={{ ...td, fontWeight:700 }}>{m2(b.perMile)}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
      <div style={{ fontFamily:'var(--mono)', fontSize:10, color:'var(--mid)', marginTop:8, lineHeight:1.6, maxWidth:900 }}>
        Midpoints are {BANDS.map(b => `${b.mid} miles`).join(', ')} one way (UIL's bands run 1–30.9, 31–60.9 and 61–90.9 miles), doubled for the round trip. IRS standard mileage rate: {Math.round(IRS * 100)}¢ a mile from July 1 to December 31, 2026, the half of the year when football is played
        ({Math.round(IRS_2025 * 100)}¢ in 2025, the rate the current bands were built around). Travel fees are paid per official.
      </div>
    </Card>
  )
}

// 2: "it averages out"
function Averages() {
  const season = 10   // games in a season, for the example
  return (
    <Card title={`The Fallacy: "It Averages Out"`}>
      <div style={body}>
        <p style={{ margin:'0 0 10px' }}>The usual defense of flat bands is that some trips in a band are shorter and some are longer, so over a season it evens out.
          That's true <em>inside</em> a band: a 10-mile trip one week and a 25-mile trip the next, both paid ${b1.fee}, balance each other.</p>
        <p style={{ margin:'0 0 10px' }}>It isn't true <em>across</em> bands. Where an official lives decides which band most of the schedule falls in, and that doesn't change week to week.
          An official whose games are mostly band 3 drives band 3 trips all season and never gets the short trips that would balance them.</p>
        <p style={{ margin:0 }}>So the shortfall doesn't shrink over a season; it adds up. At the band midpoints, {season} band 3 games come to about <strong>{m0(season * b3.short)}</strong> less than
          the IRS rate would pay, {season} band 2 games about <strong>{m0(season * b2.short)}</strong>, and {season} band 1 games about {m0(season * b1.short)}.</p>
      </div>
    </Card>
  )
}

// 3: two officials, same band
function SameBand() {
  const near = 2, far = b1.max
  return (
    <Card title="Same Band, Same Pay, Very Different Drives">
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(240px, 1fr))', gap:12, maxWidth:900, marginBottom:12 }}>
        {[['Official A', near], ['Official B', far]].map(([who, mi]) => (
          <div key={who} style={point}>
            <div style={head}>{who}: lives {mi} miles away</div>
            <div style={{ fontFamily:"'Bebas Neue', sans-serif", fontSize:30, color:'var(--burnt)', lineHeight:1.1 }}>{m2(2 * mi * IRS)}</div>
            <div>{2 * mi} miles round trip at the IRS rate. Paid <strong>${b1.fee}</strong> (band 1), {m2(b1.fee / (2 * mi))} a mile.</div>
          </div>
        ))}
      </div>
      <div style={body}>
        Both work the same band 1 game and are paid the same ${b1.fee}. One is paid about {Math.round(b1.fee / (2 * near * IRS))} times what the drive costs; the other comes up {m2(2 * far * IRS - b1.fee)} short.
        A flat fee moves money from the officials who drive the farthest to the ones who drive the least, and the same thing happens at the edges of every band.
      </div>
    </Card>
  )
}

// 4: why the bands don't scale
function Scale() {
  const ditch = [['Worker A', 10, b1.fee], ['Worker B', 30, b2.fee], ['Worker C', 50, b3.fee]]
  return (
    <Card title="Why the Bands Don't Keep Up">
      <div style={{ ...body, marginBottom:12 }}>
        Every band covers the same distance, 30 miles one way or 60 miles round trip: about <strong>{m2(60 * IRS)}</strong> of driving at the IRS rate.
        But each band adds only <strong>${b2.fee - b1.fee}</strong> to the fee. The drive grows three times faster than the pay.
      </div>
      <div style={{ ...box, maxWidth:620 }}>
        <table style={{ width:'100%', borderCollapse:'collapse' }}>
          <thead><tr><th style={{ ...th, textAlign:'left' }}>Same ditch, same shovel</th><th style={th}>Digs</th><th style={th}>Paid</th><th style={{ ...th, color:'var(--burnt)' }}>Per foot</th></tr></thead>
          <tbody>{ditch.map(([w, ft, pay]) => (
            <tr key={w}><td style={{ ...td, textAlign:'left', fontFamily:'DM Sans' }}>{w}</td><td style={td}>{ft} ft</td><td style={td}>${pay}</td><td style={{ ...td, fontWeight:700 }}>{m2(pay / ft)}</td></tr>
          ))}</tbody>
        </table>
      </div>
      <div style={{ ...body, marginTop:12 }}>
        <p style={{ margin:'0 0 10px' }}>
          Three workers are hired to dig the same kind of ditch, in the same dirt, with the same shovel. The only difference is how long each ditch is.
          Worker A digs 10 feet and gets $20. Worker C digs five times as far, 50 feet, but gets only $50, two and a half times the pay.
          Every extra foot Worker C digs is paid less than the feet Worker A dug. Per foot, Worker A earns {m2(2)} and Worker C earns {m2(1)}: half as much for the same work.
        </p>
        <p style={{ margin:'0 0 10px' }}>
          If every worker were paid Worker A's rate of $2.00 a foot, Worker B would get <strong>$60</strong> instead of $35, and Worker C would get <strong>$100</strong> instead of $50.
          Nobody would accept being paid less per foot just because their ditch is longer, yet that's exactly how the travel bands work.
        </p>
        <p style={{ margin:'0 0 10px' }}>
          <strong>In travel-band terms:</strong> the feet are miles, and the ditch is the round trip to the game. At each band's midpoint, band 1 pays {m2(b1.perMile)} a mile
          ({b1.rt} miles for ${b1.fee}), band 2 pays {m2(b2.perMile)} ({b2.rt} miles for ${b2.fee}), and band 3 pays {m2(b3.perMile)} ({b3.rt} miles for ${b3.fee}).
          The official who drives the farthest is paid about half as much per mile as the one who drives the least, for the same game, on the same night.
        </p>
        <p style={{ margin:0 }}>
          Pay every official band 1's own rate of {m2(b1.perMile)} a mile, and band 2 would pay {m0(b2.rt * b1.fee / b1.rt)} and band 3 {m0(b3.rt * b1.fee / b1.rt)}.
          At the IRS rate of {Math.round(IRS * 100)}¢ a mile, it's {m2(b2.irs)} and {m2(b3.irs)}. The bands pay ${b2.fee} and ${b3.fee}.
        </p>
      </div>
    </Card>
  )
}

// 5: the fix, and what it costs
function Fix() {
  return (
    <Card title="The Fix, and What It Would Cost">
      <div style={{ ...body, marginBottom:12 }}>
        <p style={{ margin:'0 0 8px' }}><strong>Pay actual mileage at the IRS rate.</strong> It's the federal standard for reimbursing business driving, and the hardest option to argue against.</p>
        <p style={{ margin:0 }}><strong>Or keep the bands and reset them</strong> to what each band's midpoint actually costs: {BANDS.map(b => `${m2(b.irs)} for band ${b.n}`).join(', ')}.</p>
      </div>
      <div style={{ ...box, maxWidth:700 }}>
        <table style={{ width:'100%', borderCollapse:'collapse' }}>
          <thead><tr><th style={{ ...th, textAlign:'left' }}>Game in…</th><th style={th}>More per official</th><th style={{ ...th, color:'var(--burnt)' }}>Crew of {CREW}</th><th style={th}>Crew of 5 (six-man)</th></tr></thead>
          <tbody>{BANDS.map(b => (
            <tr key={b.n}><td style={{ ...td, textAlign:'left', fontFamily:'DM Sans' }}>Band {b.n}</td><td style={td}>{m2(b.short)}</td><td style={{ ...td, fontWeight:700 }}>{m2(CREW * b.short)}</td><td style={td}>{m2(5 * b.short)}</td></tr>
          ))}</tbody>
        </table>
      </div>
      <div style={{ fontFamily:'var(--mono)', fontSize:10, color:'var(--mid)', marginTop:8, lineHeight:1.6, maxWidth:900 }}>
        Extra cost per game if each band paid its midpoint at the IRS rate ({Math.round(IRS * 100)}¢ a mile) instead of the flat fee. Under straight mileage, the cost of any one game depends on where each official actually lives.
      </div>
    </Card>
  )
}

export default function TravelBandInequity({ data }) {
  return <><Gap /><Averages /><SameBand /><Scale /><Fix /></>
}
