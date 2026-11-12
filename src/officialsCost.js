import { CHAPTER_CENTERS, ROAD_FACTOR, straightMiles } from './chapterCenters'

// 2026 TASO football pay sheet (crew of 7), as the site owner supplied it
export const PAY = {
  gameFee: 100,          // lowest gross-gate band ($150-$4,000); gates aren't known ahead of time
  bands: [[30, 20], [60, 35], [90, 50]],   // one-way miles up to N: travel fee per official
  perMile: 0.725,        // 1 or 2 cars, past 90 miles one way
  cars: 2,
  riderFee: 15,
  meal: 30,              // playoffs, past 90 miles one way
}

export const crewSize = g => (g.classification || '').startsWith('1A') || /six/i.test(g.classification || '') ? 5 : 7

// estimated cost of officials for one game, or null without a site or chapter
export function gameCost(g) {
  const c = CHAPTER_CENTERS[g.chapter]
  if (!c || g.lat == null || g.lng == null) return null
  const crew = crewSize(g)
  const oneWay = ROAD_FACTOR * straightMiles(c[1], c[2], g.lat, g.lng)
  const fees = crew * PAY.gameFee
  let travel, meals = 0, riders = 0, band = null
  if (oneWay > 90) {
    travel = PAY.cars * 2 * oneWay * PAY.perMile
    riders = (crew - PAY.cars) * PAY.riderFee
    meals = crew * PAY.meal
  } else {
    band = PAY.bands.find(([max]) => oneWay <= max)
    travel = crew * band[1]
  }
  return { crew, oneWay, fees, travel, riders, meals, band: band && band[1], total: fees + travel + riders + meals }
}
