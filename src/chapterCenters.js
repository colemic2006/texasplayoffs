// Estimated center of each TASO chapter (its main city), used to estimate crew travel.
export const CHAPTER_CENTERS = {
  ABI: ['Abilene', 32.45, -99.73], AMA: ['Amarillo', 35.22, -101.83], AUS: ['Austin', 30.27, -97.74],
  BEA: ['Beaumont', 30.08, -94.13], COM: ['Commerce', 33.25, -95.90], CSC: ['College Station', 30.63, -96.33],
  CTX: ['Temple', 31.10, -97.34], DAL: ['Dallas', 32.78, -96.80], ELP: ['El Paso', 31.76, -106.49],
  FTW: ['Fort Worth', 32.75, -97.33], HOU: ['Houston', 29.76, -95.37], NTX: ['Wichita Falls', 33.91, -98.49],
  PBC: ['Midland-Odessa', 31.95, -102.20], PVC: ['Brownwood', 31.71, -98.99], RGV: ['McAllen', 26.20, -97.90],
  SAN: ['San Angelo', 31.46, -100.44], SAT: ['San Antonio', 29.42, -98.49], SFA: ['Nacogdoches', 31.60, -94.66],
  SPC: ['Lubbock', 33.58, -101.86], STX: ['Corpus Christi', 27.80, -97.40], TYL: ['Tyler', 32.35, -95.30],
  WAC: ['Waco', 31.55, -97.15],
}
// Roads wind: straight-line miles x 1.2 is a common estimate of driving miles
export const ROAD_FACTOR = 1.2

export function straightMiles(lat1, lng1, lat2, lng2) {
  const r = Math.PI / 180
  const h = Math.sin((lat2 - lat1) * r / 2) ** 2 + Math.cos(lat1 * r) * Math.cos(lat2 * r) * Math.sin((lng2 - lng1) * r / 2) ** 2
  return 3958.8 * 2 * Math.asin(Math.sqrt(h))
}

// estimated round-trip driving miles from the chapter's center to the game site and back
export function roundTripMiles(game) {
  const c = CHAPTER_CENTERS[game.chapter]
  if (!c || game.lat == null || game.lng == null) return null
  return 2 * ROAD_FACTOR * straightMiles(c[1], c[2], game.lat, game.lng)
}
