import React, { useState } from 'react'

// Long lists start collapsed to their first 10 rows, with a button to show the rest.
export const LIMIT = 10

export function useCollapse(limit = LIMIT) {
  const [open, setOpen] = useState(false)
  return {
    open,
    toggle: () => setOpen(o => !o),
    cut: arr => (open || arr.length <= limit ? arr : arr.slice(0, limit)),
    limit,
  }
}

// the button under a collapsed list (nothing when the list is short)
export function ShowMore({ c, total, noun = 'rows', style }) {
  if (total <= c.limit) return null
  return (
    <button onClick={c.toggle} style={{ fontFamily:'var(--mono)', fontSize:10, letterSpacing:'0.06em', padding:'5px 12px', borderRadius:3, cursor:'pointer',
      border:'1px solid var(--burnt)', background:'transparent', color:'var(--burnt)', marginTop:8, ...style }}>
      {c.open ? `▴ Show top ${c.limit} only` : `▾ Show all ${total} ${noun}`}
    </button>
  )
}
