import React from 'react'

// Games where UIL picked the officiating chapter instead of the two schools' coaches (rare,
// so only these are tagged). From the season workbook's "UIL pick" column.
export const UIL_TIP = 'UIL picked the officials for this game (normally the two schools’ coaches choose the chapter)'

export function UilTag({ game, style }) {
  if (!game?.uil_pick) return null
  return (
    <span title={UIL_TIP} style={{
      display:'inline-flex', alignItems:'center', fontFamily:'var(--mono)', fontSize:9, letterSpacing:'0.08em',
      textTransform:'uppercase', fontWeight:700, padding:'1px 5px', borderRadius:3, whiteSpace:'nowrap',
      border:'1px solid var(--ink)', color:'var(--ink)', background:'var(--gold)', verticalAlign:'middle', ...style,
    }}>UIL pick</span>
  )
}
