import { PUZZLES } from '../data/anagram-words'
import { dayIndex, strideIndex } from './day'

export const POOL_SIZE = 7
export const MIN_WORD_LENGTH = 3

/** How long a round lasts. The clock is the whole game; tune it here. */
export const ROUND_SECONDS = 60

/**
 * Points per word by length.
 *
 * A table rather than a formula, matching the leaderboard's own POINTS_BY_GUESS:
 * the curve can be tuned in one place and a backend can mirror the numbers.
 * Longer words are worth disproportionately more, so the pool's full-length
 * word is always the thing worth hunting.
 */
export const POINTS_BY_LENGTH = { 3: 1, 4: 3, 5: 6, 6: 10, 7: 15 }

// Stride and offset for picking the day's pool. The stride is coprime with
// PUZZLES.length, so every puzzle is used once before any repeats. Both are
// load-bearing: changing either reshuffles every future day.
const STRIDE = 2003
const OFFSET = 577

// Why a submission was turned down. Exported so the UI can pick its own wording
// without matching on strings it invented.
export const TOO_SHORT = 'too-short'
export const NOT_IN_POOL = 'not-in-pool'
export const ALREADY_FOUND = 'already-found'
export const UNKNOWN_WORD = 'unknown-word'

export const PUZZLE_COUNT = PUZZLES.length

/** The pool for a given day: `{ letters, words, target }`. */
export function puzzleForDay(day = dayIndex()) {
  return PUZZLES[strideIndex(day, PUZZLES.length, STRIDE, OFFSET)]
}

/**
 * The pool at a position in the list.
 *
 * Continuous play walks a shuffled permutation of the pool rather than stepping
 * by day, so rounds address puzzles by index. `puzzleForDay` keeps the
 * daily-puzzle reading of the same list.
 */
export function puzzleAt(index) {
  const n = PUZZLES.length
  return PUZZLES[((index % n) + n) % n]
}

export function normalise(word) {
  return String(word ?? '').trim().toLowerCase()
}

export function pointsForWord(word) {
  return POINTS_BY_LENGTH[word.length] ?? 0
}

/**
 * Whether `word` can be spelled from `letters`, consuming each letter once.
 *
 * The multiplicity is the subtle part: a pool holding a single 'e' must reject
 * "geese", so matched letters are removed from the working copy rather than
 * merely tested for membership.
 */
export function canSpell(word, letters) {
  const pool = [...letters]
  for (const ch of word) {
    const i = pool.indexOf(ch)
    if (i === -1) return false
    pool.splice(i, 1)
  }
  return true
}

/**
 * Judge a submission. Pure — the caller owns the found list and applies this.
 *
 * The checks are ordered by how useful the answer is: telling someone a letter
 * isn't in the pool beats telling them the word is unknown, and telling them
 * they already have it beats both.
 */
export function submitWord(raw, puzzle, found = []) {
  const word = normalise(raw)
  if (word.length < MIN_WORD_LENGTH) return { ok: false, reason: TOO_SHORT, word }
  if (!canSpell(word, puzzle.letters)) return { ok: false, reason: NOT_IN_POOL, word }
  if (found.includes(word)) return { ok: false, reason: ALREADY_FOUND, word }
  if (!puzzle.words.has(word)) return { ok: false, reason: UNKNOWN_WORD, word }
  return { ok: true, word, points: pointsForWord(word) }
}

export function totalScore(found) {
  return found.reduce((sum, word) => sum + pointsForWord(word), 0)
}

/** The found words that count toward the target, and the rarer bonus finds. */
export function splitFound(found, puzzle) {
  return {
    target: found.filter((word) => puzzle.target.has(word)),
    bonus: found.filter((word) => !puzzle.target.has(word)),
  }
}

/**
 * Every point the *target* has to give, for scaling the score bar.
 *
 * Measured against the common words rather than everything the pool accepts:
 * scoring against the full accepted list would leave the bar barely moving on
 * a good round. Bonus words still score, so a strong player can pass this —
 * the leaderboard clamps, and overshooting is meant to feel like a reward.
 */
export function maxScore(puzzle) {
  let total = 0
  for (const word of puzzle.target) total += pointsForWord(word)
  return total
}

/**
 * A round is won by finding a word that uses every letter in the pool.
 *
 * Every generated puzzle has at least one, so the goal is always reachable —
 * and it is a far better target than "find them all", which almost nobody does.
 */
export function isWon(found, puzzle) {
  return found.some((word) => word.length === puzzle.letters.length)
}

/** Complete means every common word found. The rarities are a bonus, not a bar. */
export function isComplete(found, puzzle) {
  return [...puzzle.target].every((word) => found.includes(word))
}

/** Common words the player never found — what the end-of-round reveal shows. */
export function missedWords(found, puzzle) {
  return [...puzzle.target].filter((word) => !found.includes(word))
}

/**
 * The day's letters in a stable, non-alphabetical arrangement.
 *
 * Stored pools are sorted, which both reads as a hint and looks inert. Seeding
 * by day means every player opens the same board, while the in-game shuffle
 * button reseeds freely.
 */
export function arrangeLetters(letters, seed = 0) {
  const out = [...letters]
  let t = (seed >>> 0) + 0x6d2b79f5
  const next = () => {
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

/** Found words grouped by length, longest first — how the list renders. */
export function byLength(found) {
  const groups = new Map()
  for (const word of [...found].sort()) {
    if (!groups.has(word.length)) groups.set(word.length, [])
    groups.get(word.length).push(word)
  }
  return [...groups.entries()].sort((a, b) => b[0] - a[0]).map(([length, words]) => ({ length, words }))
}

/**
 * The leaderboard entry for a finished round.
 *
 * `found`/`total` count the common target only, so the fraction can't read
 * "72/69" when bonus words are in play. Bonus finds are reported separately and
 * still fold into `score`, which is what the leaderboard normalises.
 */
export function roundResult(found, puzzle, day) {
  const { target, bonus } = splitFound(found, puzzle)
  return {
    day,
    won: isWon(found, puzzle),
    found: target.length,
    total: puzzle.target.size,
    bonus: bonus.length,
    score: totalScore(found),
    maxScore: maxScore(puzzle),
  }
}

const BAR_SEGMENTS = 10

/** The shareable progress bar. */
export function shareText(found, puzzle, day) {
  const { target, bonus } = splitFound(found, puzzle)
  const total = puzzle.target.size
  const ratio = total ? Math.min(1, target.length / total) : 0
  const filled = Math.round(ratio * BAR_SEGMENTS)
  const bar = '\u{1F7E8}'.repeat(filled) + '\u{2B1C}'.repeat(BAR_SEGMENTS - filled)
  const crown = isWon(found, puzzle) ? ' \u{1F451}' : ''
  const extra = bonus.length ? ` (+${bonus.length} bonus)` : ''
  return (
    `Glyphix Anagrams #${day}${crown}\n` +
    `${target.length}/${total} words${extra} · ${totalScore(found)} pts\n\n${bar}`
  )
}
