import React, { useState } from 'react'
import { useForm, ValidationError } from '@formspree/react'
import { useCollapse, ShowMore } from '../ShowMore'

// School districts listed by the site owner for officials' pay issues, and a form to report one
const DISTRICTS = [
  'Abilene Wylie ISD', 'Alpine ISD', 'Amarillo ISD', 'Andrews ISD', 'Arlington ISD', 'Balmorhea ISD', 'Bells ISD', 'Belton ISD',
  'Big Spring ISD', 'Blue Ridge ISD', 'Borger ISD', 'Boyd ISD', 'Caprock ISD', 'Canyon ISD (Canyon, Randall, West Plains)',
  'Carrollton-Farmers Branch ISD', 'Cedar Hill ISD', 'Celina ISD', 'Chico ISD', 'College Station ISD', 'Colorado City ISD',
  'Commerce ISD', 'Cy-Fair ISD', 'Dallas ISD', 'Deer Park ISD', 'DeSoto ISD', 'Dumas ISD', 'Duncanville ISD', 'Edcouch Elsa ISD',
  'Edinburg ISD', 'Everman ISD', 'Ferris ISD', 'Fort Stockton ISD', 'Frisco ISD', 'Galena Park ISD', 'Garland ISD', 'Greenwood ISD',
  'Goose Creek ISD', 'Grand Prairie ISD', 'Grandview ISD', 'Grapevine-Colleyville ISD', 'Gunter ISD', 'Hereford ISD',
  'Hurst Euless Bedford ISD', 'Idalou ISD', 'Keller ISD', 'Kermit ISD', 'La Feria ISD', 'La Porte ISD', 'Lancaster ISD', 'Lamesa ISD',
  'Little Elm ISD', 'Lone Oak ISD', 'Mansfield ISD', 'Mercedes ISD', 'Mesquite ISD', 'Mexia ISD', 'Midland ISD', 'Mission ISD',
  'Odessa ISD', 'Palo Duro ISD', 'Pampa ISD', 'Pasadena ISD', 'Pecos ISD', 'Perryton ISD', 'Pilot Point ISD', 'Red Oak ISD',
  'Richardson ISD', 'San Antonio Northeast ISD', 'San Antonio Northside ISD', 'Stanton ISD', 'Southlake ISD', 'Terrell County ISD',
  'Tioga ISD', 'Tascosa ISD', 'Tolar ISD', 'Venus ISD', 'Wall ISD', 'Whitehouse ISD', 'Wink Loving ISD', 'Woodlands ISD',
].sort((a, b) => a.localeCompare(b))

// What the pay sheet says each official should earn at a given gate (bands above; past $20,500,
// +$45 for each full additional $5,000)
function feeFor(gate) {
  for (const [hi, f] of [[4000, 100], [5000, 105], [7500, 110], [10000, 115], [12500, 120], [15000, 125], [17500, 140], [20500, 150]]) if (gate <= hi) return f
  return 150 + 45 * Math.floor((gate - 20500) / 5000)
}
const TICKET = 10   // average ticket across everyone in the stands: adults $7-$10, students $3-$5, reserved seats more (see sources below)

// Worked examples: what a crowd at a typical ticket price brings in, and the fee that gate should pay
function GateExamples() {
  const fmt = n => `$${Math.round(n).toLocaleString()}`
  const th = { fontFamily:'var(--mono)', fontSize:9, letterSpacing:'0.12em', textTransform:'uppercase', color:'var(--mid)', padding:'6px 10px', textAlign:'right', borderBottom:'1px solid var(--border)' }
  const td = { padding:'7px 10px', fontSize:13, textAlign:'right', fontFamily:'var(--mono)', borderBottom:'1px solid var(--border)' }
  return (
    <div style={{ marginTop:18 }}>
      <div style={{ fontFamily:'var(--mono)', fontSize:10, letterSpacing:'0.14em', textTransform:'uppercase', color:'var(--mid)', marginBottom:6 }}>What a crowd should pay: worked examples</div>
      <div style={{ fontSize:13, color:'var(--ink)', lineHeight:1.6, marginBottom:8, maxWidth:820 }}>
        Texas varsity tickets typically run <strong>$7–$10 for adults</strong> and <strong>$3–$5 for students</strong>, and reserved seats cost more: this season,
        Coppell's home-side reserved seats were <strong>$23 each</strong> ($22 plus a $1 platform fee), with general admission at $9. These examples use a round
        average of <strong>${TICKET} a ticket</strong> across everyone in the stands, which is likely still on the low side for many games. For example, the lowest band tops out at a <strong>$4,000</strong> gate: at ${TICKET} a ticket,
        that is only <strong style={{ fontWeight:800, color:'var(--burnt)', fontSize:15 }}>{(4000 / TICKET).toLocaleString()} fans</strong>. Any crowd bigger than that should move the crew above the lowest band.
        Each cell below shows the gross gate, then the fee each official should be paid from the scale above.
      </div>
      <div style={{ overflowX:'auto' }}>
        <table style={{ borderCollapse:'collapse', minWidth:520 }}>
          <thead><tr>
            <th style={{ ...th, textAlign:'left' }}>Stadium seats</th>
            {[50, 75, 100].map(p => <th key={p} style={th}>{p}% full</th>)}
          </tr></thead>
          <tbody>
            {[3000, 6000, 10000].map(cap => (
              <tr key={cap}>
                <td style={{ ...td, textAlign:'left', fontFamily:'DM Sans', fontWeight:600 }}>{cap.toLocaleString()}</td>
                {[50, 75, 100].map(p => {
                  const fans = cap * p / 100, gate = fans * TICKET
                  return <td key={p} style={td}>
                    <div style={{ color:'var(--mid)', fontSize:11 }}>{fans.toLocaleString()} fans · {fmt(gate)}</div>
                    <div style={{ color:'var(--burnt)', fontWeight:700 }}>{fmt(feeFor(gate))} each</div>
                  </td>
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ fontSize:13, color:'var(--ink)', lineHeight:1.6, marginTop:10, maxWidth:820 }}>
        Compare that with the <strong>$100</strong> a crew gets when only walk-up sales are reported: a sold-out 6,000-seat stadium should pay each official about
        <strong> {fmt(feeFor(6000 * TICKET))}</strong>, but if the school reports only $4,000 in game-day sales, the crew is paid <strong>$100 each</strong>.
      </div>
      <div style={{ fontFamily:'var(--mono)', fontSize:10, color:'var(--mid)', marginTop:8, lineHeight:1.6, maxWidth:820 }}>
        Estimates only: actual prices vary by district, and passes and free admissions lower the gate. Past $20,500 the scale adds $45 for each full additional $5,000.
        Ticket prices from district athletics pages, e.g.{' '}
        <a href="https://www.austinisd.org/athletics/tix" target="_blank" rel="noreferrer">Austin ISD</a> (6A adults $9, students $5),{' '}
        <a href="https://www.pisd.edu/cms/lib/TX02215173/Centricity/Domain/61/PLANO%20ISD%20ATHLETIC%20TICKET%20INFORMATION%2024-25.pdf" target="_blank" rel="noreferrer">Plano ISD</a> (adults $8, students $4, reserved $10),{' '}
        <a href="https://www.nisdtx.org/news-events/newsroom/details/~board/homepage-news/post/athletic-ticketing-sales-options-set-for-2026-2027" target="_blank" rel="noreferrer">Northwest ISD</a> (adults $7–$9, reserved $11),{' '}
        <a href="https://lchs.lcisd.net/page/ticketing-policy" target="_blank" rel="noreferrer">Lubbock-Cooper ISD</a> (adults $8, students $3).
      </div>
    </div>
  )
}

// State championship pay, from a UIL open records request the site owner made (2021-present data)
const FINALS = { gate: 1748455, fees2025: 93000, fees2020: 69990, games: 12, avgPay: 1276.96,
  high: { game: 'Richmond Randle vs South Oak Cliff', cls: '5A D2', gate: 289618.33 },
  low: { game: 'Richland Springs vs Jayton', cls: '1A D2', gate: 40170 },
  victory: 2100000, bally: 250000 }
const usd = (n, c = 0) => '$' + n.toLocaleString('en-US', { minimumFractionDigits: c, maximumFractionDigits: c })
function StateFinalsPay() {
  const f = FINALS
  const tile = (big, small, hot) => (
    <div style={{ background: hot ? 'rgba(253,208,35,0.22)' : 'var(--surface)', border:`1px solid ${hot ? 'var(--gold)' : 'var(--border)'}`, borderRadius:10, padding:'12px 14px' }}>
      <div style={{ fontFamily:"'Bebas Neue', sans-serif", fontSize:30, color:'var(--burnt)', lineHeight:1.05 }}>{big}</div>
      <div style={{ fontSize:12, color:'var(--ink)', lineHeight:1.45, marginTop:4 }}>{small}</div>
    </div>
  )
  const share = 100 * f.fees2025 / f.gate
  return (
    <div style={{ marginTop:48 }}>
      <div style={{ fontFamily:'var(--mono)', fontSize:10, letterSpacing:'0.18em', textTransform:'uppercase', color:'var(--mid)', marginBottom:6 }}>UIL open records request</div>
      <div className="card-title" style={{ fontFamily:"'Bebas Neue', sans-serif", fontSize:30, color:'var(--ink)', marginBottom:6, paddingBottom:12, borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', gap:12 }}>
        <div style={{ width:4, height:28, borderRadius:2, background:'var(--burnt)' }} />
        What UIL Paid State Championship Officials
      </div>
      <div style={{ fontSize:13, color:'var(--mid)', lineHeight:1.55, margin:'10px 0 14px', maxWidth:860 }}>
        From a UIL open records request I submitted for state championship football officials' payments. I asked for, and got, data from 2021 to the present;
        the figures below are for the <strong style={{ color:'var(--ink)' }}>2025 state finals</strong> unless another year is named.
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(200px, 1fr))', gap:10, marginBottom:14 }}>
        {tile(usd(f.gate), <>total gate revenue for the 2025 finals (home team sales + visitor team sales + onsite sales)</>, true)}
        {tile(usd(f.fees2025), <>total honorariums (game fees only) for on-field officials, about <strong>{share.toFixed(1)}%</strong> of the gate</>, true)}
        {tile(usd(f.avgPay, 2), <>average total pay per official</>)}
        {tile(`${usd(310)} – ${usd(2285)}`, <>lowest and highest pay for an on-field official, meal and travel included (the highest ever in the data: <strong>{usd(2751.64, 2)}</strong>, in 2023)</>)}
        {tile(usd(50), <>flat fee for alternate officials: no mileage, no meal money, no per diem</>)}
        {tile(`${usd(f.fees2020)} → ${usd(f.fees2025)}`, <>on-field honorariums, 2020 to 2025 (up {Math.round(100 * (f.fees2025 / f.fees2020 - 1))}%)</>)}
      </div>

      <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:10, overflow:'hidden', marginBottom:14, maxWidth:860 }}>
        {[['Highest-grossing game', f.high], ['Lowest-grossing game', f.low]].map(([l, g], i) => (
          <div key={l} style={{ display:'flex', flexWrap:'wrap', gap:10, alignItems:'baseline', padding:'10px 16px', borderTop: i ? '1px solid var(--border)' : 'none' }}>
            <span style={{ fontFamily:'var(--mono)', fontSize:9, letterSpacing:'0.12em', textTransform:'uppercase', color:'var(--mid)', width:170 }}>{l}</span>
            <span style={{ flex:1, minWidth:220, fontSize:14 }}><strong>{g.cls}</strong>, {g.game}</span>
            <span style={{ fontFamily:'var(--mono)', fontSize:14, fontWeight:700 }}>{usd(g.gate, g.gate % 1 ? 2 : 0)}</span>
          </div>
        ))}
        <div style={{ padding:'8px 16px', borderTop:'1px solid var(--border)', fontSize:12, color:'var(--mid)', lineHeight:1.55 }}>
          The biggest gate was about {(f.high.gate / f.low.gate).toFixed(1)}× the smallest. Gate receipts here are team sales plus onsite receipts.
        </div>
      </div>

      <div style={{ fontSize:13, color:'var(--ink)', lineHeight:1.65, maxWidth:860, marginBottom:14 }}>
        <strong>How UIL figures each game's gate:</strong> the home and visitor ticket sales are added together, and for each day of finals (three games a day),
        the day's total onsite gate is divided by 3 and one-third is credited to each game.
      </div>

      <div style={{ background:'rgba(253,208,35,0.22)', borderLeft:'4px solid var(--gold)', borderRadius:6, padding:'12px 16px', fontSize:14, color:'var(--ink)', lineHeight:1.65, maxWidth:860 }}>
        <p style={{ margin:'0 0 10px' }}>
          <strong>None of these numbers include streaming revenue</strong> from Fox Sports Southwest, Bally or Victory+. I have no idea what UIL earned from streaming,
          but I do know how many people watched the finals on Victory+: <strong>2.1 million</strong>{' '}
          (<a href="https://www.dallasnews.com/high-school-sports/football/2025/12/23/texas-high-school-football-state-championships-eclipse-2-million-viewers-on-victory/" target="_blank" rel="noopener noreferrer" style={{ color:'var(--burnt)' }}>Dallas Morning News</a>).
          In 2023, Bally had 250,000. That's about <strong>{Math.round(f.victory / f.bally)}×</strong> the online audience in three years.
        </p>
        <p style={{ margin:0 }}>
          To me that's a compelling argument that <strong>streaming revenue should count toward officials' game fees</strong>, both for NFHS Network games and for
          local school districts' own streams. Schools charge for that access, and so does the NFHS streaming service.
        </p>
      </div>
      <div style={{ background:'var(--surface)', border:'2px solid var(--burnt)', borderRadius:10, padding:'12px 16px', fontSize:14, color:'var(--ink)', lineHeight:1.65, maxWidth:860, marginTop:12 }}>
        <div style={{ fontFamily:'var(--mono)', fontSize:10, letterSpacing:'0.16em', textTransform:'uppercase', color:'var(--burnt)', fontWeight:700, marginBottom:6 }}>This year, UIL moved the other way</div>
        <p style={{ margin:'0 0 10px' }}>
          Instead of counting media revenue, UIL took it out. In October 2026 the Legislative Council <strong>passed</strong> an amendment to the officials' pay rules
          (<a href="https://www.uiltexas.org/files/policy/Legislative-Council-General-Session-Packet-Oct-2026-DRAFT.pdf" target="_blank" rel="noopener noreferrer" style={{ color:'var(--burnt)' }}>meeting packet</a>)
          that <strong>strikes</strong> these two lines from the Constitution and Contest Rules:
        </p>
        <ul style={{ margin:'0 0 10px', paddingLeft:20 }}>
          <li>Section 1250(g)(3), Football Plan: <em style={{ textDecoration:'line-through' }}>"Radio, Television Proceeds. Proceeds from radio and television are considered a part of the receipts of the game."</em></li>
          <li>Section 1208(j), post-district receipts: <em style={{ textDecoration:'line-through' }}>"The radio broadcast receipts and the telecast receipts are considered a part of the game receipts in all post-district games."</em></li>
        </ul>
        <p style={{ margin:'0 0 10px' }}>
          Season tickets still count as part of a game's receipts. Radio and TV money will no longer be listed as part of them, just as streaming audiences are growing.
          The change came from the UIL Sports Officials Committee and takes effect <strong>August 1, 2027</strong>, pending approval by the Commissioner of Education.
        </p>
        <p style={{ margin:0 }}>
          Meanwhile, the <strong>2026 state finals</strong> (December 16–19 at AT&amp;T Stadium) are on Nexstar Media and Mission Broadcasting stations across Texas, and streamed
          on the stations' apps, free to watch anywhere{' '}
          (<a href="https://www.uiltexas.org/football/state/football-state-championships-broadcast-information" target="_blank" rel="noopener noreferrer" style={{ color:'var(--burnt)' }}>UIL: where to watch</a>).
          Television and streaming carry the biggest games in the state, and once the new rule takes effect, none of that money will be counted in the receipts that set officials' fees.
        </p>
      </div>
      <div style={{ fontFamily:'var(--mono)', fontSize:10, color:'var(--mid)', marginTop:8, lineHeight:1.6, maxWidth:860 }}>
        Source: UIL open records request (state championship football officials' payments, 2021–present).
        Percentages and multiples are worked out from these figures.
      </div>
    </div>
  )
}

export default function PayIssuesView() {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const more = useCollapse()
  const [state, handleSubmit] = useForm('xqevvaow')
  const list = DISTRICTS.filter(d => d.toLowerCase().includes(q.trim().toLowerCase()))

  const label = { fontFamily:'var(--mono)', fontSize:9, letterSpacing:'0.14em', textTransform:'uppercase', color:'var(--mid)' }
  const input = { fontFamily:'var(--sans)', fontSize:13, padding:'10px 14px', borderRadius:6, border:'1px solid var(--border)',
    background:'#fff', color:'var(--ink)', outline:'none', width:'100%', boxSizing:'border-box' }
  const btn = { fontFamily:'var(--mono)', fontSize:10, letterSpacing:'0.14em', textTransform:'uppercase', padding:'11px 20px', borderRadius:6,
    background:'var(--burnt)', border:'none', color:'#fff', cursor:'pointer' }
  const field = (id, text, props = {}) => (
    <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
      <label htmlFor={id} style={label}>{text}</label>
      {props.rows ? <textarea id={id} name={id} style={{ ...input, resize:'vertical', lineHeight:1.6 }} {...props} />
        : <input id={id} name={id} type="text" style={input} {...props} />}
      <ValidationError field={id} errors={state.errors} style={{ fontFamily:'var(--mono)', fontSize:10, color:'var(--burnt)' }} />
    </div>
  )

  return (
    <div>
      <div style={{ fontFamily:'var(--mono)', fontSize:10, letterSpacing:'0.18em', textTransform:'uppercase', color:'var(--mid)', marginBottom:6 }}>Officials</div>
      <div className="card-title" style={{ fontFamily:"'Bebas Neue', sans-serif", fontSize:30, color:'var(--ink)', marginBottom:6, paddingBottom:12, borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', gap:12 }}>
        <div style={{ width:4, height:28, borderRadius:2, background:'var(--burnt)' }} />
        Officials Pay Issues
      </div>

      <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderLeft:'4px solid var(--burnt)', borderRadius:10, padding:'16px 20px', margin:'16px 0 0', maxWidth:860 }}>
        <div style={{ fontFamily:'var(--mono)', fontSize:10, letterSpacing:'0.16em', textTransform:'uppercase', color:'var(--burnt)', marginBottom:8, fontWeight:700 }}>The most common issue</div>
        <div style={{ fontSize:14, color:'var(--ink)', lineHeight:1.65 }}>
          <p style={{ margin:'0 0 10px' }}>
            Each official's varsity game fee is set by the game's <strong>gross gate receipts</strong>: the bigger the gate, the higher the pay band (see the scale below).
            The most common problem is a game played in front of <strong>packed stands</strong> that still pays the crew at the <strong>lowest band</strong>.
          </p>
          <p style={{ margin:0 }}>
            The usual reason is that the school reports only the tickets sold at the gate. Many schools refuse to count
            <strong> season tickets and online sales</strong> as part of the gate receipts, even though <strong>UIL and the official pay sheet require them to be included</strong>.
            Leaving them out can drop a large crowd into the lowest pay band.
          </p>
        </div>
        <div style={{ marginTop:16 }}>
          <div style={{ fontFamily:'var(--mono)', fontSize:10, letterSpacing:'0.14em', textTransform:'uppercase', color:'var(--mid)', marginBottom:6 }}>Varsity game fee, by gross gate receipts (from the pay sheet)</div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(190px, 1fr))', gap:'4px 18px', fontSize:13, fontFamily:'var(--mono)', maxWidth:820 }}>
            {[['$150 – $4,000', '$100'], ['$4,001 – $5,000', '$105'], ['$5,001 – $7,500', '$110'], ['$7,501 – $10,000', '$115'], ['$10,001 – $12,500', '$120'],
              ['$12,501 – $15,000', '$125'], ['$15,001 – $17,500', '$140'], ['$17,501 – $20,500', '$150'], ['Each add\u2019l $5,000', '+ $45']].map(([g, f]) => (
              <div key={g} style={{ display:'flex', justifyContent:'space-between', borderBottom:'1px dashed var(--border)', padding:'3px 0' }}>
                <span style={{ color:'var(--mid)' }}>{g}</span><strong style={{ color:'var(--ink)', whiteSpace:'nowrap', marginLeft:8 }}>{f}</strong>
              </div>
            ))}
          </div>
          <GateExamples />
          <div style={{ fontSize:12, color:'var(--ink)', background:'rgba(70,29,124,0.05)', borderRadius:6, padding:'10px 12px', marginTop:12, lineHeight:1.6 }}>
            <strong>How UIL defines gross gate receipts:</strong> <em>“all ticket sales which would include walk-up ticket sales at the game site, ticket sales at the home school,
            season ticket sales (pro-rated), tickets sales at visiting school and ticket sales at a third-party site, before any expenses are deducted.”</em>
          </div>
        </div>
      </div>

      <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderLeft:'4px solid var(--sage)', borderRadius:10, padding:'16px 20px', margin:'16px 0 0', maxWidth:860 }}>
        <div style={{ fontFamily:'var(--mono)', fontSize:10, letterSpacing:'0.16em', textTransform:'uppercase', color:'var(--sage)', marginBottom:8, fontWeight:700 }}>A step in the right direction: an itemized pay sheet</div>
        <div style={{ fontSize:14, color:'var(--ink)', lineHeight:1.65 }}>
          <p style={{ margin:'0 0 10px' }}>
            Today the pay sheet asks for a single gate number, so there is no way to see what was left out. The proposed sheet has the school
            <strong> list each kind of ticket sale on its own line</strong>, the same five sources in UIL's definition, and add them up to the gross gate:
          </p>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(300px, 1fr))', gap:'6px 24px', fontSize:13, margin:'4px 0 12px' }}>
            {['Walk-up ticket sales', 'Home school ticket sales', 'Third-party site ticket sales (online)', 'Total season ticket sales (pro-rated)', 'Visiting school ticket sales'].map(t => (
              <div key={t} style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end', gap:8, borderBottom:'1px solid var(--border)', padding:'4px 0' }}>
                <span>{t}</span><span style={{ fontFamily:'var(--mono)', color:'var(--mid)', whiteSpace:'nowrap' }}>$ ______</span>
              </div>
            ))}
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end', gap:8, borderBottom:'2px solid var(--ink)', padding:'4px 0', fontWeight:700 }}>
              <span>Gross gate receipts</span><span style={{ fontFamily:'var(--mono)', whiteSpace:'nowrap' }}>$ ______</span>
            </div>
          </div>
          <p style={{ margin:0 }}>
            The school then <strong>returns or mails a copy of the pay sheet to each official</strong> as documentation that the pay was computed correctly.
            It doesn't stop a school from leaving a line blank, but a blank "season ticket" or "third-party" line on a game with full stands is easy to spot and question,
            and it puts the numbers in writing.
          </p>
        </div>
      </div>

      <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:10, padding:'16px 20px', margin:'16px 0 0', maxWidth:860 }}>
        <div style={{ fontFamily:'var(--mono)', fontSize:10, letterSpacing:'0.16em', textTransform:'uppercase', color:'var(--burnt)', marginBottom:10, fontWeight:700 }}>Other ways to fix it</div>
        <ol style={{ margin:0, paddingLeft:20, fontSize:14, color:'var(--ink)', lineHeight:1.65, display:'flex', flexDirection:'column', gap:10 }}>
          <li>
            <strong>Attach the ticketing platform's sales report.</strong> Online ticketing services (GoFan, HomeTown and others) produce an exact sales report for every game.
            Requiring that report with the pay sheet removes the guesswork about online and presale tickets.
          </li>
          <li>
            <strong>The visiting school reports its presales to the host, in writing, and the number goes on the pay sheet.</strong> Visiting-school sales are the
            line most likely to go missing because the host may not know the number. It should be shown to the officials on the pay sheet, not just passed between schools.
          </li>
          <li>
            <strong>A standard formula for pro-rating season tickets,</strong> for example season ticket revenue divided by the number of home games.
            "Pro-rated" with no formula invites a zero.
          </li>
          <li>
            <strong>A floor based on stadium size.</strong> Every game would be paid as if at least <strong>25% of the stadium's established capacity</strong> attended,
            at an average of ${TICKET} a ticket, whatever gate is reported. For a 6,000-seat stadium that is 1,500 fans and a
            ${(6000 * 0.25 * TICKET).toLocaleString()} gate, so the fee could not drop below <strong>${feeFor(6000 * 0.25 * TICKET)}</strong> per official
            ({[3000, 10000].map(c => `${c.toLocaleString()} seats: $${feeFor(c * 0.25 * TICKET)}`).join('; ')}).
          </li>
          <li>
            <strong>Pay bands based on attendance, not gate dollars.</strong> Set the fee by how many people are in the stands (the headcount) instead of how much
            money the school reports. A crowd is hard to hide: it can be counted at the gate or by scanned tickets, and anyone in the stadium can see a full house.
            Pay would no longer depend on which ticket sales a school chooses to count, and it would stay fair when ticket prices differ from school to school.
            <div style={{ fontSize:13, margin:'8px 0 4px' }}>
              Suggested bands, counting <strong>everyone through the gates</strong> (paid tickets, students, passes and comps), set to match the dollar bands
              at an average of <strong>$10 a ticket</strong>:
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(200px, 1fr))', gap:'4px 18px', fontSize:13, fontFamily:'var(--mono)', maxWidth:760 }}>
              {[['Up to 400 fans', '$100'], ['401 – 500', '$105'], ['501 – 750', '$110'], ['751 – 1,000', '$115'], ['1,001 – 1,250', '$120'],
                ['1,251 – 1,500', '$125'], ['1,501 – 1,750', '$140'], ['1,751 – 2,050', '$150'], ['Each add’l 500 fans', '+ $45']].map(([h, f]) => (
                <div key={h} style={{ display:'flex', justifyContent:'space-between', borderBottom:'1px dashed var(--border)', padding:'3px 0' }}>
                  <span style={{ color:'var(--mid)' }}>{h}</span><strong style={{ color:'var(--ink)', whiteSpace:'nowrap', marginLeft:8 }}>{f}</strong>
                </div>
              ))}
            </div>
            <div style={{ fontSize:12, color:'var(--mid)', marginTop:6 }}>
              For example, a full 6,000-seat stadium would pay each official $150 + 7 × $45 = <strong style={{ color:'var(--ink)' }}>$465</strong> (the same as its $60,000 gate),
              and a half-full 3,000-seat stadium (1,500 fans) would pay <strong style={{ color:'var(--ink)' }}>$125</strong>.
            </div>
          </li>
          <li>
            <strong>A flat playoff fee by round,</strong> set by UIL and not tied to the gate. This removes any incentive to under-report playoff gates.
          </li>
          <li>
            <strong>A real consequence for misreporting.</strong> A school found under-reporting its gate could <strong>lose coverage from its local officiating chapter</strong>.
          </li>
        </ol>
      </div>

      <div style={{ background:'rgba(253,208,35,0.22)', border:'2px solid var(--gold)', borderRadius:10, padding:'16px 18px', margin:'16px 0 24px',
        display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:12 }}>
        <div style={{ fontSize:15, color:'var(--ink)', lineHeight:1.5, maxWidth:640 }}>
          <strong>Didn't get the right pay for a game?</strong> If you believe you have not received the correct pay for a game, send the details here.
        </div>
        <button onClick={() => setOpen(o => !o)} style={btn}>{open ? 'Close' : 'Report a pay issue'}</button>
      </div>

      {open && (
        <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:10, padding:'20px 22px', marginBottom:28, maxWidth:620 }}>
          {state.succeeded ? (
            <div style={{ fontSize:14, color:'var(--ink)' }}><strong>Thanks, your report was sent.</strong> We'll follow up if we need more details.</div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:14 }}>
              <input type="hidden" name="subject" value="Officials pay issue" />
              {field('district', 'School district', { required: true, placeholder: 'e.g. Midland ISD' })}
              {field('game', 'Game (teams and date)', { required: true, placeholder: 'e.g. Midland Legacy v Pebble Hills, 11/12/2026' })}
              {field('position', 'Your position / chapter', { placeholder: 'e.g. Referee, PBC' })}
              {field('amount', 'Pay expected vs. received', { placeholder: 'e.g. Expected $160, received $120' })}
              {field('details', 'Details', { required: true, rows: 5, placeholder: 'What happened, who you contacted, and when' })}
              {field('email', 'Your email (optional, if you want a reply)', { type: 'email', placeholder: 'you@example.com' })}
              <ValidationError errors={state.errors} style={{ fontFamily:'var(--mono)', fontSize:10, color:'var(--burnt)' }} />
              <button type="submit" disabled={state.submitting} style={{ ...btn, alignSelf:'flex-start', opacity: state.submitting ? 0.6 : 1 }}>
                {state.submitting ? 'Sending…' : 'Send report'}
              </button>
            </form>
          )}
        </div>
      )}

      <div style={{ display:'flex', alignItems:'baseline', justifyContent:'space-between', flexWrap:'wrap', gap:10, marginBottom:10 }}>
        <div style={{ fontSize:13, color:'var(--mid)' }}>School districts with officials' pay issues on file: <strong style={{ color:'var(--ink)' }}>{DISTRICTS.length}</strong></div>
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Find a district…" aria-label="Find a district"
          style={{ ...input, width:220, padding:'7px 12px', fontSize:12 }} />
      </div>
      <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:10, padding:'14px 18px' }}>
        <div style={{ columns:'220px', columnGap:24, fontSize:13, lineHeight:1.9 }}>
          {more.cut(list).map(d => <div key={d} style={{ breakInside:'avoid' }}>{d}</div>)}
          {!list.length && <div style={{ color:'var(--mid)' }}>No district matches “{q}”.</div>}
        </div>
      </div>
      <ShowMore c={more} total={list.length} noun="districts" />
      <StateFinalsPay />
    </div>
  )
}
