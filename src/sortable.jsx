import React, { useState } from 'react'

// Sortable tables: click a column header to sort by it, click again to flip the order.
//
//   const s = useSort('games', -1)                    // default column and direction (-1 = high to low)
//   const rows = s.sort(data, { name: r => r.name, games: r => r.games })   // one getter per sortable column
//   <th style={th} {...s.head('games')}>Games{s.arrow('games')}</th>
//
// Text sorts A-Z first, numbers high-to-low first. null/undefined always sort last.
export function useSort(defaultKey = null, defaultDir = -1) {
  const [st, setSt] = useState({ key: defaultKey, dir: defaultDir })
  const sort = (arr, getters) => {
    const f = st.key && getters[st.key]
    if (!f) return arr
    return [...arr].sort((a, b) => {
      const va = f(a), vb = f(b)
      const na = va == null || (typeof va === 'number' && isNaN(va)), nb = vb == null || (typeof vb === 'number' && isNaN(vb))
      if (na || nb) return na === nb ? 0 : na ? 1 : -1
      return (typeof va === 'string' || typeof vb === 'string'
        ? String(va).localeCompare(String(vb), undefined, { numeric: true })
        : va - vb) * st.dir
    })
  }
  // props for a header cell: click to sort, pointer cursor, highlighted when active
  const head = (key, text = false) => ({
    onClick: () => setSt(s => ({ key, dir: s.key === key ? -s.dir : (text ? 1 : -1) })),
    title: 'Sort by this column',
    'aria-sort': st.key === key ? (st.dir > 0 ? 'ascending' : 'descending') : 'none',
    style: { cursor: 'pointer', userSelect: 'none', ...(st.key === key ? { color: 'var(--burnt)' } : {}) },
  })
  const arrow = key => st.key === key
    ? <span style={{ marginLeft: 3 }}>{st.dir > 0 ? '▲' : '▼'}</span>
    : <span style={{ marginLeft: 3, opacity: 0.35 }}>↕</span>
  // back to the default order (for tables that also have their own sort buttons)
  const reset = () => setSt({ key: defaultKey, dir: defaultDir })
  return { key: st.key, dir: st.dir, sort, head, arrow, reset }
}

// a header cell wired to a sorter: <SortTh s={s} k="games" style={th}>Games</SortTh>
export function SortTh({ s, k, text, style, children, ...rest }) {
  const h = s.head(k, text)
  return <th {...rest} {...h} style={{ ...style, ...h.style }}>{children}{s.arrow(k)}</th>
}
