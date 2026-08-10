import { readJSON, writeJSON } from './storage'
import { dayIndex } from './day'

/**
 * Continuous rounds: the sequencer behind "play again".
 *
 * Games used to be one-per-day, keyed on `dayIndex()` alone. They are now
 * played in a stream, so a round needs its own identity and the pool needs an
 * order that does not hand the same puzzle back immediately.
 *
 * Two rules shape this:
 *
 *   1. A player gets a *shuffled permutation* of the pool, walked one entry at
 *      a time. No puzzle repeats until every other one has been used. When the
 *      permutation runs out it reshuffles under a new seed, so the second pass
 *      is in a different order than the first.
 *   2. At most MAX_ROUNDS_PER_DAY rounds count in a day. The counter resets at
 *      local midnight, on the same clock the puzzle day uses.
 *
 * The order is per player rather than global — the cost of no-repeat play is
 * that two people are no longer on the same puzzle at the same time.
 */

export const MAX_ROUNDS_PER_DAY = 50

const SESSION_KEY = (game) => `glyphix.${game}.session`

/**
 * Deterministic shuffle of [0, length).
 *
 * Seeded so a session survives a reload: the permutation is never stored, only
 * the seed and how far through it the player is, and it has to rebuild
 * identically each time or a refresh would jump to a different puzzle.
 */
export function permutation(length, seed) {
  const out = Array.from({ length }, (_, i) => i)
  let t = (seed >>> 0) + 0x9e3779b9
  const next = () => {
    t = Math.imul(t ^ (t >>> 16), 2246822507)
    t = Math.imul(t ^ (t >>> 13), 3266489909)
    return ((t ^= t >>> 16) >>> 0) / 4294967296
  }
  for (let i = length - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

function freshSession(day, seed) {
  return { day, played: 0, round: 0, seed, cursor: 0, index: null }
}

function isSession(value) {
  return (
    !!value &&
    typeof value.day === 'number' &&
    typeof value.played === 'number' &&
    typeof value.round === 'number' &&
    typeof value.seed === 'number' &&
    typeof value.cursor === 'number'
  )
}

/**
 * Roll a stored session onto `day`, resetting the daily count if it is stale.
 *
 * Pure and exported so the rollover rule is testable without a DOM. The seed
 * and cursor deliberately survive: the no-repeat guarantee spans the whole
 * pool, not a single day, so tomorrow continues the same walk.
 */
export function rollOver(saved, day) {
  if (!isSession(saved)) return null
  if (saved.day === day) return saved
  return { ...saved, day, played: 0, round: 0, index: null }
}

/** The stored session for `game`, rolled over if it belongs to an earlier day. */
export function loadSession(game, day = dayIndex(), seedSource = () => Date.now()) {
  return (
    rollOver(readJSON(SESSION_KEY(game), null), day) ??
    freshSession(day, Math.floor(seedSource()) >>> 0)
  )
}

export function saveSession(game, session) {
  writeJSON(SESSION_KEY(game), session)
}

export function roundsLeft(session) {
  return Math.max(0, MAX_ROUNDS_PER_DAY - session.played)
}

export function atDailyLimit(session) {
  return roundsLeft(session) === 0
}

/**
 * Advance to the next puzzle, returning the session that owns it.
 *
 * Returns null at the daily limit rather than silently serving round 51, so the
 * caller has to decide what to show instead.
 */
export function startRound(game, poolSize, session) {
  if (atDailyLimit(session)) return null

  let { seed, cursor } = session
  // Exhausted the permutation — reshuffle so the next pass differs from the last.
  if (cursor >= poolSize) {
    seed = (seed + 1) >>> 0
    cursor = 0
  }

  const index = permutation(poolSize, seed)[cursor]
  const next = { ...session, seed, cursor: cursor + 1, index }
  saveSession(game, next)
  return next
}

/**
 * Mark the current round finished. Separate from `startRound` because the daily
 * count must only move on completion — abandoning a round mid-way should not
 * burn one of the fifty.
 */
export function completeRound(game, session) {
  const next = { ...session, played: session.played + 1, round: session.round + 1 }
  saveSession(game, next)
  return next
}

/**
 * Ensure the session owns a current puzzle, starting one if it doesn't.
 *
 * A page mounting mid-round must resume the same puzzle rather than drawing a
 * new one, which is why `index` is persisted rather than derived from `round`.
 */
export function currentRound(game, poolSize, session) {
  if (session.index !== null && session.index !== undefined) return session
  return startRound(game, poolSize, session)
}
