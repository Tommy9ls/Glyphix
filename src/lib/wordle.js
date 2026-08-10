import { ANSWERS, VALID_GUESSES } from '../data/words'
import { dayIndex, strideIndex } from './day'

// The day clock moved to day.js once a second daily game needed it. Re-exported
// so existing importers of `dayIndex`/`msUntilNextPuzzle` keep working.
export { dayIndex, msUntilNextPuzzle } from './day'


export const WORD_LENGTH = 5
export const MAX_GUESSES = 6

// Tile / key states, ordered weakest to strongest. Used to decide which state
// wins when a letter appears more than once across guesses.
export const ABSENT = 'absent'
export const PRESENT = 'present'
export const CORRECT = 'correct'

const RANK = { [ABSENT]: 1, [PRESENT]: 2, [CORRECT]: 3 }

// Shared by the board and the keyboard so a letter reads the same in both.
export const STATE_COLORS = {
  [CORRECT]: '#538d4e',
  [PRESENT]: '#b59f3b',
  [ABSENT]: '#787c7e',
}

// Day 0 and the day-rollover maths now live in day.js, shared with the other
// daily games. The epoch value is unchanged, so no puzzle number shifted.

/** How many answers the pool holds — the length of a no-repeat run. */
export const ANSWER_COUNT = ANSWERS.length

/**
 * The answer at a pool position.
 *
 * Continuous play walks a shuffled permutation of the pool rather than stepping
 * by day, so rounds address answers by index. `answerForDay` is kept for the
 * daily-puzzle reading of the same pool.
 */
export function answerForIndex(index) {
  const n = ANSWERS.length
  return ANSWERS[((index % n) + n) % n]
}

/**
 * The answer for a given day.
 *
 * Walking ANSWERS in order would make the next word guessable from the last,
 * so we step through the list by a prime stride. Since the stride is coprime
 * with the list length, this visits every word once before repeating.
 */
export function answerForDay(day = dayIndex()) {
  return ANSWERS[strideIndex(day, ANSWERS.length, 7919, 1013)]
}

export function isValidGuess(word) {
  return VALID_GUESSES.has(word.toLowerCase())
}

/**
 * Score a guess against the answer, one state per letter position.
 *
 * Repeated letters are the subtle part: a letter only comes back PRESENT if
 * the answer still has an unmatched copy of it. Guessing "geese" against
 * "those" marks the first 'e' absent and the last one correct, because the
 * single 'e' in the answer is already claimed by the exact match.
 */
export function scoreGuess(guess, answer) {
  const g = guess.toLowerCase()
  const a = answer.toLowerCase()
  const result = new Array(WORD_LENGTH).fill(ABSENT)
  const unmatched = {}

  // Exact matches first; everything else goes into the pool of letters that
  // are still available to be marked present.
  for (let i = 0; i < WORD_LENGTH; i++) {
    if (g[i] === a[i]) result[i] = CORRECT
    else unmatched[a[i]] = (unmatched[a[i]] || 0) + 1
  }

  for (let i = 0; i < WORD_LENGTH; i++) {
    if (result[i] === CORRECT) continue
    if (unmatched[g[i]] > 0) {
      result[i] = PRESENT
      unmatched[g[i]] -= 1
    }
  }

  return result
}

/** Best-known state for each letter guessed so far, for colouring the keyboard. */
export function keyStates(guesses, answer) {
  const states = {}
  for (const guess of guesses) {
    const score = scoreGuess(guess, answer)
    for (let i = 0; i < WORD_LENGTH; i++) {
      const letter = guess[i]
      const next = score[i]
      if (!states[letter] || RANK[next] > RANK[states[letter]]) {
        states[letter] = next
      }
    }
  }
  return states
}

export function gameStatus(guesses, answer) {
  if (guesses.length && guesses[guesses.length - 1] === answer) return 'won'
  if (guesses.length >= MAX_GUESSES) return 'lost'
  return 'playing'
}

const EMOJI = { [CORRECT]: '\u{1F7E9}', [PRESENT]: '\u{1F7E8}', [ABSENT]: '\u{2B1C}' }

/** The shareable emoji grid. */
export function shareText(guesses, answer, day) {
  const won = guesses[guesses.length - 1] === answer
  const score = won ? guesses.length : 'X'
  const grid = guesses
    .map((g) => scoreGuess(g, answer).map((s) => EMOJI[s]).join(''))
    .join('\n')
  return `Glyphix Wordle #${day} ${score}/${MAX_GUESSES}\n\n${grid}`
}
