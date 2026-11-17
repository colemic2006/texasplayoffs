import React, { useState } from 'react'
import { useForm, ValidationError } from '@formspree/react'

// School districts listed by the site owner for officials' pay issues, and a form to report one
const DISTRICTS = [
  'Abilene Wylie ISD', 'Alpine ISD', 'Amarillo ISD', 'Andrews ISD', 'Arlington ISD', 'Balmorhea ISD', 'Bells ISD', 'Belton ISD',
  'Big Spring ISD', 'Blue Ridge ISD', 'Borger ISD', 'Boyd ISD', 'Caprock ISD', 'Canyon ISD (Canyon, Randall, West Plains)',
  'Carrollton-Farmers Branch ISD', 'Cedar Hill ISD', 'Celina ISD', 'Chico ISD', 'College Station ISD', 'Colorado City ISD',
  'Commerce ISD', 'Cy-Fair ISD', 'Dallas ISD', 'Deer Park ISD', 'DeSoto ISD', 'Dumas ISD', 'Duncanville ISD', 'Edcouch Elsa ISD',
  'Edinburg ISD', 'Everman ISD', 'Ferris ISD', 'Fort Stockton ISD', 'Frisco ISD', 'Galena Park ISD', 'Garland ISD', 'Greenwood ISD',
  'Goose Creek ISD', 'Grand Prairie ISD', 'Grandview ISD', 'Grapevine-Colleyville ISD', 'Gunter ISD', 'Herford ISD',
  'Hurst Euless Bedford ISD', 'Idalou ISD', 'Keller ISD', 'Kermit ISD', 'La Feria ISD', 'La Porte ISD', 'Lancaster ISD', 'Lamesa ISD',
  'Little Elm ISD', 'Lone Oak ISD', 'Mansfield ISD', 'Mercedes ISD', 'Mesquite ISD', 'Mexia ISD', 'Midland ISD', 'Mission ISD',
  'Odessa ISD', 'Palo Duro ISD', 'Pampa ISD', 'Pasadena ISD', 'Pecos ISD', 'Perryton ISD', 'Pilot Point ISD', 'Red Oak ISD',
  'Richardson ISD', 'San Antonio Northeast ISD', 'San Antonio Northside ISD', 'Stanton ISD', 'Southlake ISD', 'Terrell County ISD',
  'Tioga ISD', 'Tascosa ISD', 'Tolar ISD', 'Venus ISD', 'Wall ISD', 'Whitehouse ISD', 'Wink Loving ISD', 'Woodlands ISD',
].sort((a, b) => a.localeCompare(b))

export default function PayIssuesView() {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
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
      <div style={{ fontFamily:"'Bebas Neue', sans-serif", fontSize:30, color:'var(--ink)', marginBottom:6, paddingBottom:12, borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', gap:12 }}>
        <div style={{ width:4, height:28, borderRadius:2, background:'var(--burnt)' }} />
        Officials Pay Issues
      </div>

      <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderLeft:'4px solid var(--burnt)', borderRadius:10, padding:'16px 20px', margin:'16px 0 0', maxWidth:860 }}>
        <div style={{ fontFamily:'var(--mono)', fontSize:10, letterSpacing:'0.16em', textTransform:'uppercase', color:'var(--burnt)', marginBottom:8, fontWeight:700 }}>The most common issue</div>
        <div style={{ fontSize:14, color:'var(--ink)', lineHeight:1.65 }}>
          <p style={{ margin:'0 0 10px' }}>
            Playoff officials are paid on a scale tied to the game's gate receipts: the bigger the gate, the higher the pay band.
            The most common problem is a game played in front of <strong>packed stands</strong> that still pays the crew at the <strong>lowest band</strong>.
          </p>
          <p style={{ margin:0 }}>
            The usual reason is that the school reports only the tickets sold at the gate. Many schools refuse to count
            <strong> season tickets and online sales</strong> as part of the gate receipts, even though <strong>UIL and the official pay sheet require them to be included</strong>.
            Leaving them out can drop a large crowd into the lowest pay band.
          </p>
        </div>
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
          {list.map(d => <div key={d} style={{ breakInside:'avoid' }}>{d}</div>)}
          {!list.length && <div style={{ color:'var(--mid)' }}>No district matches “{q}”.</div>}
        </div>
      </div>
    </div>
  )
}
