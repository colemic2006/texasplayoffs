// Rounds not played yet in a season still in progress: cards that go week by week show every
// round, with the later ones as placeholders that fill in on their own as games come in.
export const ALL_WEEKS = [1, 2, 3, 4, 5, 6]
export const UPCOMING_TIP = 'Not played yet; fills in automatically as games come in'

// the rounds a card should list: every round while the season is being played (later ones as
// placeholders), otherwise just the rounds that have games
export function roundsToShow(present, inProgress) {
  return inProgress ? ALL_WEEKS : [...present].sort((a, b) => a - b)
}
export const isInProgress = data => data?.season?.status === 'in_progress'

// a round button that can't be picked yet
export const upcomingBtn = base => ({ ...base, borderStyle: 'dashed', background: 'transparent', color: 'var(--mid)', opacity: 0.55, cursor: 'default' })
// a table cell (or header) for a round not played yet
export const upcomingCell = { color: 'var(--mid)', opacity: 0.6, fontStyle: 'italic', fontFamily: 'var(--mono)', fontSize: 10,
  background: 'repeating-linear-gradient(135deg, transparent 0 6px, rgba(15,13,11,0.035) 6px 12px)' }
export const UPCOMING = 'upcoming'
