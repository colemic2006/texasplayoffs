import React, { useState } from 'react'

// Links page: things worth sharing with officials. Each entry is a card.
const COIN_URL = 'https://artofofficiating.com/high-school-football-coin-toss-coin/'
// product photos, shown from Art of Officiating's own site
const COIN_IMG = side => `https://artofofficiating.com/wp-content/uploads/2025/01/Coin-Toss-Coin-${side}-300x300.png`

function CoinSide({ side, label }) {
  const [failed, setFailed] = useState(false)
  return (
    <figure style={{ margin:0, textAlign:'center' }}>
      {failed
        ? <div aria-hidden="true" style={{ width:130, height:130, borderRadius:'50%', background:'radial-gradient(circle at 35% 30%, #4a4a4a, #111 70%)',
            boxShadow:'inset 0 0 0 4px #2b2b2b, inset 0 0 0 6px #555', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <span style={{ fontFamily:"'Bebas Neue', sans-serif", fontSize:20, color:'#cfcfcf' }}>{label}</span></div>
        : <img src={COIN_IMG(side)} alt={`Coin toss coin, ${label.toLowerCase()} side`} width={130} height={130} loading="lazy"
               onError={() => setFailed(true)} style={{ display:'block', width:130, height:130, objectFit:'contain' }} />}
      <figcaption style={{ fontFamily:'var(--mono)', fontSize:9, letterSpacing:'0.12em', textTransform:'uppercase', color:'var(--mid)', marginTop:4 }}>{label}</figcaption>
    </figure>
  )
}

export default function LinksView() {
  return (
    <div style={{ marginBottom:48 }}>
      <div style={{ fontFamily:'var(--mono)', fontSize:10, letterSpacing:'0.18em', textTransform:'uppercase', color:'var(--mid)', marginBottom:6 }}>For officials</div>
      <div style={{ fontFamily:"'Bebas Neue', sans-serif", fontSize:30, color:'var(--ink)', marginBottom:20, paddingBottom:12, borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', gap:12 }}>
        <div style={{ width:4, height:28, borderRadius:2, background:'var(--burnt)' }} />
        Links
      </div>

      <div style={{ display:'flex', gap:20, flexWrap:'wrap', alignItems:'flex-start', background:'var(--surface)', border:'1px solid var(--border)', borderRadius:10, padding:'20px 22px', maxWidth:760 }}>
        <div style={{ display:'flex', gap:10, flexShrink:0 }}>
          <CoinSide side="front" label="Faces" />
          <CoinSide side="back" label="Butts" />
        </div>
        <div style={{ flex:'1 1 320px', minWidth:0 }}>
          <div style={{ display:'flex', alignItems:'baseline', gap:10, flexWrap:'wrap' }}>
            <div style={{ fontFamily:"'Bebas Neue', sans-serif", fontSize:24, color:'var(--ink)', lineHeight:1.1 }}>Coin Toss Coin</div>
            <div style={{ fontFamily:'var(--mono)', fontSize:12, color:'var(--burnt)', fontWeight:700 }}>$20 · shipping included</div>
          </div>
          <p style={{ fontSize:14, lineHeight:1.6, color:'var(--ink)', margin:'8px 0 10px' }}>
            A solid black-metal toss coin from Art of Officiating, 1.75 inches across. One side has a grinning zebra and
            "High School Football Officials · Excellence · Integrity · Community"; the other shows the zebra from behind with
            "Guardians of the Gridiron · In Stripes We Trust." It flips cleanly and looks sharp at the pregame toss, and every
            sale helps keep Art of Officiating's free training articles and rules videos online. Ships within a business day (US only).
          </p>
          <p style={{ fontSize:14, lineHeight:1.6, color:'var(--mid)', margin:'0 0 14px', fontStyle:'italic' }}>
            I use mine for youth and sub-varsity games. At those coin tosses, it isn't heads or tails: it's faces or butts.
            {' '}I'm not affiliated with Art of Officiating and get nothing if you buy one. I just think it's a fun coin.
          </p>
          <a href={COIN_URL} target="_blank" rel="noopener noreferrer"
             style={{ display:'inline-block', fontFamily:'var(--mono)', fontSize:11, letterSpacing:'0.08em', textTransform:'uppercase',
                      padding:'8px 14px', borderRadius:4, background:'var(--burnt)', color:'#fff', textDecoration:'none' }}>
            Order from Art of Officiating ↗
          </a>
        </div>
      </div>
    </div>
  )
}
