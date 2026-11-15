import React, { useEffect, useState } from 'react'
import { chapterColor } from '../chapterColors'

const NAMES = {
  ABI:'Abilene', AMA:'Amarillo', AUS:'Austin', BEA:'Southeast Texas (Beaumont)', COM:'Commerce', CSC:'College Station',
  CTX:'Central Texas', DAL:'Dallas', ELP:'El Paso', FTW:'Fort Worth', HOU:'Houston', NTX:'North Texas', PBC:'Permian Basin',
  PVC:'Pecan Valley', RGV:'Rio Grande Valley', SAN:'San Angelo', SAT:'San Antonio', SFA:'Stephen F. Austin', SPC:'South Plains',
  STX:'South Texas', TYL:'Tyler', WAC:'Waco',
}

// TASO football membership by chapter (public/data/membership.json)
export default function MembershipView() {
  const [d, setD] = useState(null)
  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}data/membership.json?v=${__BUILD_TIME__}`).then(r => r.ok ? r.json() : null).then(setD).catch(() => {})
  }, [])
  if (!d) return null
  const rows = Object.entries(d.members).sort((a, b) => b[1] - a[1])
  const total = rows.reduce((s, [, n]) => s + n, 0)
  const max = rows[0][1]
  const th = { fontFamily:'var(--mono)', fontSize:9, letterSpacing:'0.12em', textTransform:'uppercase', color:'var(--mid)', padding:'8px 12px', textAlign:'right', borderBottom:'1px solid var(--border)' }
  const td = { padding:'8px 12px', borderBottom:'1px solid var(--border)', fontSize:13, textAlign:'right', fontFamily:'var(--mono)' }
  return (
    <div>
      <div style={{ fontFamily:'var(--mono)', fontSize:10, letterSpacing:'0.18em', textTransform:'uppercase', color:'var(--mid)', marginBottom:6 }}>TASO Football</div>
      <div style={{ fontFamily:"'Bebas Neue', sans-serif", fontSize:30, color:'var(--ink)', marginBottom:20, paddingBottom:12, borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', gap:12 }}>
        <div style={{ width:4, height:28, borderRadius:2, background:'var(--burnt)' }} />
        Chapter Membership · {d.season}
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))', gap:12, marginBottom:24 }}>
        {[
          ['Registered officials', total.toLocaleString()],
          ['Chapters', rows.length],
          ['Largest', `${rows[0][0]} · ${rows[0][1].toLocaleString()}`],
          ['Median chapter', rows[Math.floor(rows.length / 2)][1]],
        ].map(([k, v]) => (
          <div key={k} style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:10, padding:'14px 16px' }}>
            <div style={{ fontFamily:'var(--mono)', fontSize:9, letterSpacing:'0.14em', textTransform:'uppercase', color:'var(--mid)', marginBottom:6 }}>{k}</div>
            <div style={{ fontFamily:"'Bebas Neue', sans-serif", fontSize:28, color:'var(--ink)' }}>{v}</div>
          </div>
        ))}
      </div>

      <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:10, overflowX:'auto' }}>
        <table style={{ width:'100%', borderCollapse:'collapse' }}>
          <thead><tr>
            <th style={{ ...th, textAlign:'left' }}>Chapter</th>
            <th style={th}>Members</th>
            <th style={th}>Share</th>
            <th style={{ ...th, width:'40%' }}></th>
          </tr></thead>
          <tbody>
            {rows.map(([c, n]) => (
              <tr key={c}>
                <td style={{ ...td, textAlign:'left', fontFamily:'DM Sans' }}>
                  <span style={{ display:'inline-block', width:9, height:9, borderRadius:2, background:chapterColor(c), marginRight:8 }} />
                  {NAMES[c] || c} <span style={{ fontFamily:'var(--mono)', fontSize:10, color:'var(--mid)', marginLeft:4 }}>{c}</span>
                </td>
                <td style={{ ...td, fontWeight:600 }}>{n.toLocaleString()}</td>
                <td style={{ ...td, color:'var(--mid)' }}>{(100 * n / total).toFixed(1)}%</td>
                <td style={{ ...td, paddingLeft:4 }}>
                  <div style={{ height:10, borderRadius:5, background:chapterColor(c), width:`${Math.max(1.5, 100 * n / max)}%` }} />
                </td>
              </tr>
            ))}
            <tr>
              <td style={{ ...td, textAlign:'left', fontFamily:'var(--mono)', fontSize:10, letterSpacing:'0.1em', textTransform:'uppercase', color:'var(--mid)' }}>Total</td>
              <td style={{ ...td, fontWeight:700 }}>{total.toLocaleString()}</td>
              <td style={td}>100%</td>
              <td style={td}></td>
            </tr>
          </tbody>
        </table>
      </div>
      <div style={{ fontFamily:'var(--mono)', fontSize:10, color:'var(--mid)', marginTop:8 }}>{d.source}.</div>
    </div>
  )
}
