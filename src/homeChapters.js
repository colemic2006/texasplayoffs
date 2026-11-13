import { useEffect, useState } from 'react'

// Each school's home chapter, from the owner's lists (scripts/home_chapters.py)
let cached = null
export function useHomeChapters() {
  const [map, setMap] = useState(cached || {})
  useEffect(() => {
    if (cached) return
    fetch(`${import.meta.env.BASE_URL}data/home_chapters_confirmed.json?v=${__BUILD_TIME__}`)
      .then(r => r.ok ? r.json() : {}).then(d => { cached = d || {}; setMap(cached) }).catch(() => {})
  }, [])
  return map
}

// which chapters have sent their full school list (scripts/home_chapters.py)
const CURRENT = ['ABI','AMA','AUS','BEA','COM','CSC','CTX','DAL','ELP','FTW','HOU','NTX','PBC','PVC','RGV','SAN','SAT','SFA','SPC','STX','TYL','WAC']
let statusCache = null
export function useHomeChapterStatus() {
  const [st, setSt] = useState(statusCache || { complete: [], partial: [] })
  useEffect(() => {
    if (statusCache) return
    fetch(`${import.meta.env.BASE_URL}data/home_chapters_status.json?v=${__BUILD_TIME__}`)
      .then(r => r.ok ? r.json() : null).then(d => { if (d) { statusCache = d; setSt(d) } }).catch(() => {})
  }, [])
  return { ...st, missing: CURRENT.filter(c => !st.complete.includes(c) && !st.partial.includes(c)) }
}
