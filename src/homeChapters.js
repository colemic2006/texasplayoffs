import { useEffect, useMemo, useState } from 'react'

// Each school's home chapter, from the owner's lists (scripts/home_chapters.py).
// Pass a season to get the chapters as they were then: a school that moved chapters keeps its
// earlier chapter for earlier seasons (season/home_chapter_history.json).
let cached = null, pastCached = null
export function useHomeChapters(year) {
  const [map, setMap] = useState(cached || {})
  const [past, setPast] = useState(pastCached || {})
  useEffect(() => {
    if (!cached) fetch(`${import.meta.env.BASE_URL}data/home_chapters_confirmed.json?v=${__BUILD_TIME__}`)
      .then(r => r.ok ? r.json() : {}).then(d => { cached = d || {}; setMap(cached) }).catch(() => {})
    if (!pastCached) fetch(`${import.meta.env.BASE_URL}data/home_chapters_past.json?v=${__BUILD_TIME__}`)
      .then(r => r.ok ? r.json() : {}).then(d => { pastCached = d || {}; setPast(pastCached) }).catch(() => {})
  }, [])
  return useMemo(() => {
    if (!year) return map
    const out = { ...map }
    for (const [team, entries] of Object.entries(past)) {
      const then = entries.find(e => year <= e.through)
      if (then) out[team] = then.chapter
    }
    return out
  }, [map, past, year])
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

// Home chapters for any season: returns year => { team: chapter } (null until both lists load)
export function useHomeChaptersByYear() {
  const now = useHomeChapters()
  const [past, setPast] = useState(pastCached)
  useEffect(() => {
    if (pastCached) { setPast(pastCached); return }
    fetch(`${import.meta.env.BASE_URL}data/home_chapters_past.json?v=${__BUILD_TIME__}`)
      .then(r => r.ok ? r.json() : {}).then(d => { pastCached = d || {}; setPast(pastCached) }).catch(() => setPast({}))
  }, [])
  return useMemo(() => {
    if (!Object.keys(now).length || !past) return null
    const memo = {}
    return year => memo[year] || (memo[year] = (() => {
      const out = { ...now }
      for (const [team, entries] of Object.entries(past)) {
        const then = entries.find(e => year <= e.through)
        if (then) out[team] = then.chapter
      }
      return out
    })())
  }, [now, past])
}
