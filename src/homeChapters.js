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
