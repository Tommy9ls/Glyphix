/**
 * The shared day clock.
 *
 * Every daily game reads its puzzle number from here, so a "day" means the same
 * thing across the platform and puzzle #412 is #412 in every game.
 *
 * This used to live in wordle.js, which still re-exports it for existing
 * callers.
 */

// Day 0. Changing this shifts every puzzle number in every game, so leave it
// alone — it is the same value the wordle epoch has always had.
const EPOCH = new Date(2026, 0, 1).getTime()
const DAY_MS = 86400000

/** Whole days since EPOCH, rolling over at the player's local midnight. */
export function dayIndex(now = new Date()) {
  const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  return Math.floor((midnight - EPOCH) / DAY_MS)
}

/** Milliseconds until the next puzzle unlocks at local midnight. */
export function msUntilNextPuzzle(now = new Date()) {
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime()
  return next - now.getTime()
}

/**
 * Pick an index for `day` by stepping through a list of `length` by a stride.
 *
 * Walking a list in order would make tomorrow's puzzle guessable from today's.
 * As long as the stride is coprime with the length, this visits every entry
 * once before repeating. Both numbers are load-bearing per caller: changing
 * either reshuffles every future puzzle for that game.
 */
export function strideIndex(day, length, stride, offset) {
  return (((day * stride + offset) % length) + length) % length
}
