import { MAX_GUESSES } from './wordle'

const PROGRESS_KEY = 'glyphix.wordle.progress'
const STATS_KEY = 'glyphix.wordle.stats'

const EMPTY_STATS = {
  played: 0,
  wins: 0,
  streak: 0,
  maxStreak: 0,
  // distribution[i] = games won on guess i + 1
  distribution: new Array(MAX_GUESSES).fill(0),
  lastWonDay: null,
}

// Private browsing and disabled-storage settings make localStorage throw on
// access, so every read and write is guarded. The game stays playable without
// persistence; you just lose progress on refresh.
//
// Exported because the leaderboard's local source needs the same guarantees.
// In a non-browser context (tests, SSR) `window` is undefined, which throws a
// ReferenceError inside the try and lands in the catch just like a blocked
// localStorage would — reads fall back, writes no-op.
export function readJSON(key, fallback) {
  try {
    const raw = window.localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

export function writeJSON(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Storage unavailable or full — carry on without saving.
  }
}

const read = readJSON
const write = writeJSON

/**
 * Guesses saved for one round, or [] if the save belongs to a different one.
 *
 * Keyed by day *and* round: a day now holds many games, and without the round
 * in the key the second game of a day would restore the first game's board.
 */
export function loadProgress(day, round = 0) {
  const saved = read(PROGRESS_KEY, null)
  if (!saved || saved.day !== day || !Array.isArray(saved.guesses)) return []
  if ((saved.round ?? 0) !== round) return []
  return saved.guesses
}

export function saveProgress(day, round, guesses) {
  write(PROGRESS_KEY, { day, round, guesses })
}

export function loadStats() {
  const saved = read(STATS_KEY, null)
  if (!saved) return { ...EMPTY_STATS }
  return {
    ...EMPTY_STATS,
    ...saved,
    distribution: Array.isArray(saved.distribution)
      ? saved.distribution.slice(0, MAX_GUESSES)
      : [...EMPTY_STATS.distribution],
  }
}

/**
 * Fold a finished game into the running stats.
 *
 * The caller is responsible for calling this exactly once per game — the page
 * does that by only recording on the transition into a finished state, not on
 * every render of one.
 */
export function recordGame(stats, { day, won, guessCount }) {
  const next = {
    ...stats,
    played: stats.played + 1,
    distribution: [...stats.distribution],
  }

  if (won) {
    next.wins += 1
    next.distribution[guessCount - 1] += 1
    // A streak survives only if the previous win was yesterday's puzzle.
    next.streak = stats.lastWonDay === day - 1 ? stats.streak + 1 : 1
    next.maxStreak = Math.max(stats.maxStreak, next.streak)
    next.lastWonDay = day
  } else {
    next.streak = 0
  }

  write(STATS_KEY, next)
  return next
}

// --- Anagrams -------------------------------------------------------------

const ANAGRAMS_PROGRESS_KEY = 'glyphix.anagrams.progress'

const EMPTY_ANAGRAM_PROGRESS = { found: [], endsAt: null, finished: false }

/**
 * Anagrams progress for `day`, or a fresh round if the save is from another day.
 *
 * Note there is no matching stats store. Anagrams came along after the
 * leaderboard could summarise a game on its own, so its stats are derived from
 * the leaderboard history instead of kept in a second place that could drift.
 */
export function loadAnagramProgress(day, round = 0) {
  const saved = read(ANAGRAMS_PROGRESS_KEY, null)
  if (!saved || saved.day !== day || !Array.isArray(saved.found)) {
    return { ...EMPTY_ANAGRAM_PROGRESS }
  }
  if ((saved.round ?? 0) !== round) return { ...EMPTY_ANAGRAM_PROGRESS }
  return {
    found: saved.found.filter((word) => typeof word === 'string'),
    // The deadline is absolute rather than a remaining duration, so reloading
    // the page cannot hand back time that has already run out.
    endsAt: typeof saved.endsAt === 'number' ? saved.endsAt : null,
    finished: saved.finished === true,
  }
}

export function saveAnagramProgress(day, round, progress) {
  write(ANAGRAMS_PROGRESS_KEY, { day, round, ...progress })
}
