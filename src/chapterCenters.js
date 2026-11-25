// Each TASO football chapter's center point, as UIL lists it in its officials' mileage calculator
// (uiltexas.org/athletics/calculate-mileage, resources/js/officials-chapters.js). UIL measures a game's
// travel band from this point to the school. Coordinates are the address located on OpenStreetMap
// (Amarillo, El Paso and Brownwood only to the street, so within a mile or so).
export const CHAPTER_CENTERS = {
  ABI: ['Abilene', 32.4495, -99.7331], AMA: ['Amarillo', 35.2220, -101.8269], AUS: ['Austin', 30.2672, -97.7430],
  BEA: ['Beaumont', 30.0810, -94.1253], COM: ['Commerce', 33.2469, -95.8993], CSC: ['College Station', 30.6280, -96.3342],
  CTX: ['Temple', 31.0984, -97.3433], DAL: ['Dallas', 32.7804, -96.8006], ELP: ['El Paso', 31.7591, -106.4867],
  FTW: ['Fort Worth', 32.7257, -97.3212], HOU: ['Houston', 29.7612, -95.3830], NTX: ['Wichita Falls', 33.9137, -98.4937],
  PBC: ['Midland', 31.9460, -102.2106], PVC: ['Brownwood', 31.6868, -98.9999], RGV: ['McAllen', 26.2026, -98.2303],
  SAN: ['San Angelo', 31.4638, -100.4369], SAT: ['San Antonio', 29.4241, -98.4939], SFA: ['Lufkin', 31.3384, -94.7294],
  SPC: ['Lubbock', 33.5782, -101.8535], STX: ['Corpus Christi', 27.7985, -97.3964], TYL: ['Tyler', 32.3519, -95.3008],
  WAC: ['Waco', 31.5498, -97.1463],
}
// the center point's address as UIL gives it (varsity football)
export const CENTER_ADDRESS = {
  ABI: '100 Pine St, Abilene', AMA: '314 E Amarillo Blvd, Amarillo', AUS: '100 E 5th St, Austin', BEA: '88 Jaguar Dr, Beaumont',
  COM: '1600 Pecan St, Commerce', CSC: '501 Texas Ave, College Station', CTX: '212 W Adams Ave, Temple', DAL: '1350 Main St, Dallas',
  ELP: '228 Texas Ave, El Paso', FTW: '1700 S Freeway, Fort Worth', HOU: '1801 Allen Pkwy, Houston', NTX: '600 Scott Ave, Wichita Falls',
  PBC: 'Midland International Airport (MAF), Midland', PVC: '2000 Highway 377 S, Brownwood', RGV: '100 S 10th St, McAllen',
  SAN: '11 E Harris Ave, San Angelo', SAT: '160 Dolorosa St, San Antonio', SPC: '1628 19th St, Lubbock', STX: '819 Upper Broadway St, Corpus Christi',
  SFA: '122 S First St, Lufkin', TYL: '200 N Broadway Ave, Tyler', WAC: '1724 W Waco Dr, Waco',
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
