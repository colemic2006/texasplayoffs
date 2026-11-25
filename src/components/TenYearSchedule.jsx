import React from 'react'
import { useSort, SortTh } from '../sortable'

// The 10-year Sports Officials Fee Schedule (2021-22 to 2031-32), football game fees only, from the
// site owner's analysis of the schedule PDF. Each pay cell in the PDF pairs the game fee with a
// travel-inclusive figure; everything here uses the game fee alone, the number on the officiating check.
const SEASONS = [['2021-22', 90], ['2022-23', 90], ['2023-24', 95], ['2024-25', 95], ['2025-26', 95], ['2026-27', 100],
  ['2027-28', 100], ['2028-29', 100], ['2029-30', 105], ['2030-31', 105], ['2031-32', 105]]
const CURRENT = '2026-27'
const TIERS = [
  ['Varsity $150 – $4,000 (minimum)', 90, 105, true], ['Varsity $4,001 – $5,000', 95, 110, true], ['Varsity $5,001 – $7,500', 100, 115, true],
  ['Varsity $7,501 – $10,000', 105, 120, true], ['Varsity $10,001 – $12,500', 110, 125, true], ['Varsity $12,501 – $15,000', 115, 130, true],
  ['Varsity $15,001 – $17,500', 130, 145, true], ['Varsity $17,501 – $20,500', 140, 155, true], ['Each additional $5,000 of gate', 35, 50, false],
  ['Sub-varsity: 12-min quarters', 60, 75, false], ['Sub-varsity: 10-min quarters / JH 10-min', 55, 70, false],
  ['Sub-varsity: 8-min quarters / JH 8-min', 50, 65, false], ['Junior high: 6-min quarters', 45, 60, false],
].map(([tier, base, last, core]) => ({ tier, base, last, core, pct: 100 * (last / base - 1), cagr: 100 * (Math.pow(last / base, 1 / 10) - 1), simple: 10 * (last / base - 1) }))
const CORE_AVG = TIERS.filter(t => t.core).reduce((s, t) => s + t.pct, 0) / TIERS.filter(t => t.core).length
const money = n => '$' + n.toLocaleString()

const kick = { fontFamily:'var(--mono)', fontSize:10, letterSpacing:'0.18em', textTransform:'uppercase', color:'var(--mid)', marginBottom:6 }
const titleS = { fontFamily:"'Bebas Neue', sans-serif", fontSize:30, color:'var(--ink)', marginBottom:6, paddingBottom:12, borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', gap:12 }
const introS = { fontSize:13, color:'var(--mid)', lineHeight:1.55, margin:'10px 0 14px', maxWidth:860 }
const th = { fontFamily:'var(--mono)', fontSize:9, letterSpacing:'0.1em', textTransform:'uppercase', color:'var(--mid)', padding:'8px 10px', textAlign:'right', borderBottom:'1px solid var(--border)', whiteSpace:'nowrap' }
const td = { padding:'7px 10px', borderBottom:'1px solid var(--border)', fontSize:12, textAlign:'right', fontFamily:'var(--mono)' }
const box = { background:'var(--surface)', border:'1px solid var(--border)', borderRadius:10, overflowX:'auto' }
const note = { fontFamily:'var(--mono)', fontSize:10, color:'var(--mid)', marginTop:8, lineHeight:1.6, maxWidth:900 }
const gold = { background:'rgba(253,208,35,0.22)', borderLeft:'4px solid var(--gold)', borderRadius:6, padding:'12px 16px', fontSize:14, color:'var(--ink)', lineHeight:1.65, maxWidth:860 }

function Card({ kicker, title, intro, children }) {
  return (
    <div style={{ marginTop:48 }}>
      <div style={kick}>{kicker}</div>
      <div className="card-title" style={titleS}><div style={{ width:4, height:28, borderRadius:2, background:'var(--burnt)' }} />{title}</div>
      {intro && <div style={introS}>{intro}</div>}
      {children}
    </div>
  )
}
const Tile = ({ big, small, hot }) => (
  <div style={{ background: hot ? 'rgba(253,208,35,0.22)' : 'var(--surface)', border:`1px solid ${hot ? 'var(--gold)' : 'var(--border)'}`, borderRadius:10, padding:'12px 14px' }}>
    <div style={{ fontFamily:"'Bebas Neue', sans-serif", fontSize:32, color:'var(--burnt)', lineHeight:1.05 }}>{big}</div>
    <div style={{ fontSize:12, color:'var(--ink)', lineHeight:1.45, marginTop:4 }}>{small}</div>
  </div>
)

// 1: the minimum tier, season by season
function Plateaus() {
  const s = useSort()
  const rows = SEASONS.map(([season, fee], i) => ({ season, fee, i, change: i ? fee - SEASONS[i - 1][1] : null }))
  const sorted = s.sort(rows, { season: r => r.i, fee: r => r.fee, change: r => r.change })
  const raises = rows.filter(r => r.change > 0).length
  const max = Math.max(...rows.map(r => r.fee))
  return (
    <Card kicker="The 10-year fee schedule" title="Ten Years, Three Raises"
      intro={<>The 10-year Sports Officials Fee Schedule sets football game fees from 2021-22 through 2031-32. In the minimum varsity gate tier ($150 – $4,000 gross gate), the game fee moves in flat $5 steps about once every three years and is frozen in between.</>}>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(190px, 1fr))', gap:10, marginBottom:14 }}>
        <Tile hot big={`${raises} of 10`} small={<>seasons with any raise at all (2023-24, 2026-27, 2029-30); the other 7 are flat</>} />
        <Tile hot big="$90 → $105" small={<>minimum-tier game fee over the whole schedule: <strong>16.7%</strong> in 10 years</>} />
        <Tile big="~1.7% a year" small={<>compounded (about 1.85% a year straight-line), below the Fed's long-run 2% inflation target</>} />
        <Tile big="21% vs 16.7%" small={<>the schedule's printed 10-year increase for this tier, which folds in travel pay, vs. the game fee alone</>} />
      </div>
      <div style={{ ...box, maxWidth:860 }}>
        <table style={{ width:'100%', borderCollapse:'collapse', minWidth:520 }}>
          <thead><tr>
            <SortTh s={s} k="season" style={{ ...th, textAlign:'left' }}>Season</SortTh>
            <SortTh s={s} k="fee" style={{ ...th, color:'var(--burnt)' }}>Game fee</SortTh>
            <SortTh s={s} k="change" style={th}>Change</SortTh>
            <th style={{ ...th, width:'40%' }} />
          </tr></thead>
          <tbody>{sorted.map(r => (
            <tr key={r.season} style={{ background: r.season === CURRENT ? 'rgba(253,208,35,0.14)' : 'transparent' }}>
              <td style={{ ...td, textAlign:'left', fontFamily:'DM Sans' }}>{r.season}{r.i === 0 ? ' (base)' : ''}{r.season === CURRENT ? <strong style={{ color:'var(--burnt)' }}> · this season</strong> : ''}</td>
              <td style={{ ...td, fontWeight:700 }}>{money(r.fee)}</td>
              <td style={{ ...td, color: r.change > 0 ? 'var(--sage)' : 'var(--mid)' }}>{r.change == null ? '—' : r.change > 0 ? `+$${r.change}` : 'no raise'}</td>
              <td style={{ ...td, paddingLeft:4 }}><div style={{ height:8, borderRadius:4, background: r.change > 0 ? 'var(--burnt)' : '#9B79D2', width:`${100 * (r.fee - 80) / (max - 80)}%` }} /></td>
            </tr>
          ))}</tbody>
        </table>
      </div>
      <div style={note}>Game fee only, minimum varsity gate tier. The schedule also flags an "Additional Fee Increase in *29-30": a larger step late in the term, after most of it has run flat.</div>
    </Card>
  )
}

// 2: every football tier, base to final
function Tiers() {
  const s = useSort()
  const sorted = s.sort(TIERS.map((t, i) => ({ ...t, i })), { tier: t => t.i, base: t => t.base, last: t => t.last, pct: t => t.pct, cagr: t => t.cagr, simple: t => t.simple })
  return (
    <Card kicker="The 10-year fee schedule" title="The Bigger the Game, the Smaller the Raise"
      intro={<>The true 10-year increase in the game fee for every football tier, from the 2021-22 base to 2031-32. In the varsity gate tiers the percentage raise shrinks as the gate grows:
        16.7% at the bottom, 10.7% at the top. The bigger games, with more scrutiny, longer game management and more liability, get the smallest raises.</>}>
      <div style={box}>
        <table style={{ width:'100%', borderCollapse:'collapse', minWidth:700 }}>
          <thead><tr>
            <SortTh s={s} k="tier" style={{ ...th, textAlign:'left' }}>Tier</SortTh>
            <SortTh s={s} k="base" style={th}>2021-22 fee</SortTh>
            <SortTh s={s} k="last" style={th}>2031-32 fee</SortTh>
            <SortTh s={s} k="pct" style={{ ...th, color:'var(--burnt)' }}>True 10-yr increase</SortTh>
            <SortTh s={s} k="cagr" style={th}>Per year (compounded)</SortTh>
            <SortTh s={s} k="simple" style={th}>Per year (simple)</SortTh>
          </tr></thead>
          <tbody>{sorted.map(t => (
            <tr key={t.tier} style={{ background: t.core ? 'transparent' : 'rgba(15,13,11,0.025)' }}>
              <td style={{ ...td, textAlign:'left', fontFamily:'DM Sans' }}>{t.tier}</td>
              <td style={td}>{money(t.base)}</td><td style={td}>{money(t.last)}</td>
              <td style={{ ...td, fontWeight:700 }}>{t.pct.toFixed(1)}%</td>
              <td style={td}>{t.cagr.toFixed(2)}%</td><td style={td}>{t.simple.toFixed(2)}%</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
      <div style={{ ...gold, marginTop:12 }}>
        Across the 8 core varsity gate tiers the true 10-year increase averages <strong>{CORE_AVG.toFixed(1)}%</strong>. The schedule prints an "Average % Increase" of
        <strong> 26%</strong> for football and <strong>28.56%</strong> for all sports, figures that blend in travel pay and come from per-cell percentages rather than a clean start-to-finish calculation.
      </div>
      <div style={note}>Game fee only (each pay cell in the schedule pairs the game fee with a travel-inclusive figure). Shaded rows are outside the varsity gate tiers. Every raise is a flat $5 step, so each one is worth a little less than the last: $5 on $90 is 5.6%, $5 on $100 is 5.0%.</div>
    </Card>
  )
}

// 3: how the printed labels read vs. what they mean
function Labels() {
  return (
    <Card kicker="The 10-year fee schedule" title="Why the Schedule Reads Better Than It Pays">
      <div style={{ fontSize:14, color:'var(--ink)', lineHeight:1.65, maxWidth:860 }}>
        <p style={{ margin:'0 0 10px' }}>The schedule's columns are headed <strong>"% Change"</strong> and <strong>"3 Year % Change."</strong> That percentage is the total movement across a whole three-year plateau, printed once at the step. It is not an annual raise.</p>
        <ul style={{ margin:0, paddingLeft:20 }}>
          <li><strong>It reads as a yearly raise.</strong> A "5%" next to a step looks like this year's increase, but it took three years to accrue; the real annual rate is closer to 1.6–1.9%.</li>
          <li><strong>The flat years are invisible.</strong> The two frozen seasons in each plateau get no "0%" marker, so the stagnation never shows.</li>
          <li><strong>It inflates the story.</strong> If the schedule was presented as "5–6% increases," that's only true per three-year block, not as raises officials actually see each season.</li>
          <li><strong>It hides the travel-pay blend.</strong> The headline 10-year percentages (21%, 20%, 19%…) combine the game fee with the travel column, which grows faster than the fee in most tiers. The game fee alone grew less.</li>
        </ul>
      </div>
    </Card>
  )
}

// 4: structural flaws
const FLAWS = [
  ['Flat plateaus, not raises', 'The fee is frozen for two to three seasons at a time; 7 of 10 seasons in the minimum tier bring no raise at all.'],
  ['Regressive tiers', 'The percentage raise shrinks as gate receipts rise, so the highest-stakes assignments get the smallest raise.'],
  ['A late catch-up', 'The "Additional Fee Increase in *29-30" lands late in the term, making the 10 years look stronger on paper than they feel year to year.'],
  ['No inflation protection', 'Fixed dollars locked for a decade, with nothing tying future years to inflation, fuel costs or regional wages.'],
  ['Travel pay doing the wrong job', 'Travel is blended into the headline percentages and grows faster than the game fee, instead of simply tracking real fuel and mileage costs.'],
  ['Gate-tier overhead', 'Every varsity game needs a verified gross gate to know which tier applies, adding audit risk and room for disputes that a flat fee would avoid.'],
  ['Ten years, no reopener', 'No renegotiation trigger if there is an officiating shortage or a neighboring area starts paying more and pulling crews away.'],
  ['Shrinking $5 steps', 'Each flat $5 step is worth less as the base rises (5.6% on $90, 5.0% on $100), then is locked in for three years.'],
  ['Hardest on newer officials', 'Minimum-tier and sub-varsity games go mostly to newer officials, the group a chapter most needs to keep, and they get the weakest signal to stay.'],
  ['Retention risk', 'If officials are scarce, the minimum-tier game is the one most likely to go unfilled, since it is the least attractive assignment to begin with.'],
]
function Flaws() {
  return (
    <Card kicker="The 10-year fee schedule" title="Ten Problems With a Ten-Year Schedule">
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(260px, 1fr))', gap:10, maxWidth:1000 }}>
        {FLAWS.map(([h, t], i) => (
          <div key={h} style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:10, padding:'10px 14px' }}>
            <div style={{ fontSize:13, fontWeight:700, color:'var(--ink)', marginBottom:4 }}><span style={{ color:'var(--burnt)', fontFamily:'var(--mono)', marginRight:6 }}>{i + 1}.</span>{h}</div>
            <div style={{ fontSize:12.5, color:'var(--ink)', lineHeight:1.55 }}>{t}</div>
          </div>
        ))}
      </div>
    </Card>
  )
}

// 5: remedies
const FIXES = [
  ['Show a true annual rate', 'Replace the "3 Year % Change" column with an annualized rate, or a per-season figure that includes the $0 years.'],
  ['Separate travel from the game fee', 'Report game-fee growth and travel-pay growth as two lines, and tie travel to a real cost index such as the IRS mileage rate or regional fuel costs.'],
  ['Add a cost-of-living clause', 'Even a capped annual adjustment (say, the lesser of CPI or 3%) would stop the erosion during the flat years.'],
  ['Fix the tier curve', 'Apply the same percentage to every gate tier, or weight increases toward lower-attendance games to support the officials most likely to leave.'],
  ['Adjust every year', 'Small annual steps instead of three-year plateaus compound more fairly and avoid multi-year freezes.'],
  ['Spread the catch-up', 'Distribute the late 2029-30 increase across the whole term so the real annual rate is steady instead of bunched at the end.'],
  ['Add a midpoint reopener', 'A year-5 checkpoint tied to retention and fill-rate data would let fees respond to the actual supply of officials.'],
  ['Simplify sub-varsity pay', 'Replace gate tiering for lower-complexity games with a flat rate scaled only by game length, as the schedule already partly does.'],
]
function Remedies() {
  return (
    <Card kicker="The 10-year fee schedule" title="How to Fix It">
      <ol style={{ margin:0, paddingLeft:22, maxWidth:860, fontSize:14, color:'var(--ink)', lineHeight:1.65 }}>
        {FIXES.map(([h, t]) => <li key={h} style={{ marginBottom:6 }}><strong>{h}.</strong> {t}</li>)}
      </ol>
      <div style={{ ...gold, marginTop:14 }}>
        <strong>Bottom line:</strong> the schedule's headline numbers (21% over 10 years for the minimum tier, 26% average for football, 28.56% across all sports) mix the game fee with travel pay
        and count three-year steps rather than annual rates. On the game fee alone, the number on an official's check, the minimum tier rises <strong>16.7%</strong> in ten years,
        about <strong>1.7–1.9% a year</strong>, with <strong>7 of 10 seasons</strong> bringing no raise at all. The tiers are regressive, there's no inflation protection, and the 3-year labels make the deal look far more generous than it is.
      </div>
      <div style={note}>From an analysis of the Sports Officials 10-Year Fee Schedule (2021-22 to 2031-32), football only: varsity gate tiers, sub-varsity and junior high.</div>
    </Card>
  )
}

export default function TenYearSchedule() {
  return <><Plateaus /><Tiers /><Labels /><Flaws /><Remedies /></>
}
