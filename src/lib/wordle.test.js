import { describe, expect, it } from 'vitest'
import { ANSWERS, VALID_GUESSES } from '../data/words'
import {
  ABSENT,
  CORRECT,
  MAX_GUESSES,
  PRESENT,
  WORD_LENGTH,
  answerForDay,
  dayIndex,
  gameStatus,
  isValidGuess,
  keyStates,
  scoreGuess,
  shareText,
} from './wordle'

describe('word lists', () => {
  it('contains only five-letter lowercase words', () => {
    for (const word of ANSWERS) expect(word).toMatch(/^[a-z]{5}$/)
    for (const word of VALID_GUESSES) expect(word).toMatch(/^[a-z]{5}$/)
  })

  it('has no duplicate answers', () => {
    expect(new Set(ANSWERS).size).toBe(ANSWERS.length)
  })

  it('accepts every answer as a guess', () => {
    for (const word of ANSWERS) expect(isValidGuess(word)).toBe(true)
  })

  it('rejects non-words', () => {
    expect(isValidGuess('zzzzz')).toBe(false)
    expect(isValidGuess('abcde')).toBe(false)
  })

  it('is case-insensitive', () => {
    expect(isValidGuess('ABOUT')).toBe(true)
  })
})

describe('scoreGuess', () => {
  it('marks an exact match all correct', () => {
    expect(scoreGuess('crane', 'crane')).toEqual(Array(WORD_LENGTH).fill(CORRECT))
  })

  it('marks a fully wrong guess all absent', () => {
    expect(scoreGuess('sight', 'proud')).toEqual(Array(WORD_LENGTH).fill(ABSENT))
  })

  it('marks misplaced letters present', () => {
    // 'a' is in cabin but not at index 0; 'b' is in cabin but not at index 1.
    expect(scoreGuess('abide', 'cabin')).toEqual([PRESENT, PRESENT, PRESENT, ABSENT, ABSENT])
  })

  it('does not over-credit a letter the answer has only once', () => {
    // 'those' has a single 'e'. The exact match at the end claims it, so the
    // leading 'e' in 'geese' gets nothing.
    const result = scoreGuess('geese', 'those')
    expect(result[1]).toBe(ABSENT)
    expect(result[2]).toBe(ABSENT)
    expect(result[4]).toBe(CORRECT)
  })

  it('credits repeats only as many times as the answer has them', () => {
    // 'abbey' has two b's; 'babes' guesses two, so both should land.
    const result = scoreGuess('babes', 'abbey')
    expect(result.filter((s) => s !== ABSENT).length).toBe(4)
  })

  it('gives a repeated letter nothing once the exact match claims it', () => {
    // 'valid' has one 'l', at index 2. The guess has l at 2 and 3 — the exact
    // match takes it, so the second 'l' scores absent rather than present.
    const result = scoreGuess('hello', 'valid')
    expect(result[2]).toBe(CORRECT)
    expect(result[3]).toBe(ABSENT)
  })

  it('prefers a later exact match over an earlier misplaced one', () => {
    // 'abbey' has two b's, but 'blurb' guesses b at 0 and 4 with neither in
    // the right place, so both come back present, not absent.
    const result = scoreGuess('blurb', 'abbey')
    expect(result[0]).toBe(PRESENT)
    expect(result[4]).toBe(PRESENT)
  })

  it('is case-insensitive', () => {
    expect(scoreGuess('CRANE', 'crane')).toEqual(Array(WORD_LENGTH).fill(CORRECT))
  })
})

describe('keyStates', () => {
  it('keeps the strongest state a letter has earned', () => {
    // 'a' is present in the first guess and correct in the second.
    const states = keyStates(['abide', 'cabin'], 'cabin')
    expect(states.a).toBe(CORRECT)
  })

  it('does not downgrade a correct letter on a later guess', () => {
    const states = keyStates(['cabin', 'award'], 'cabin')
    expect(states.a).toBe(CORRECT)
  })
})

describe('gameStatus', () => {
  it('is playing before the last guess', () => {
    expect(gameStatus(['crane'], 'about')).toBe('playing')
  })

  it('is won when the last guess matches', () => {
    expect(gameStatus(['crane', 'about'], 'about')).toBe('won')
  })

  it('is lost after six wrong guesses', () => {
    const wrong = Array(MAX_GUESSES).fill('crane')
    expect(gameStatus(wrong, 'about')).toBe('lost')
  })

  it('is won even when the win lands on the final guess', () => {
    const guesses = [...Array(MAX_GUESSES - 1).fill('crane'), 'about']
    expect(gameStatus(guesses, 'about')).toBe('won')
  })
})

describe('answerForDay', () => {
  it('is stable for a given day', () => {
    expect(answerForDay(42)).toBe(answerForDay(42))
  })

  it('always returns a real answer', () => {
    for (let day = 0; day < 500; day++) {
      expect(ANSWERS).toContain(answerForDay(day))
    }
  })

  it('handles days before the epoch', () => {
    expect(ANSWERS).toContain(answerForDay(-5))
  })

  it('does not repeat within a full cycle', () => {
    const seen = new Set()
    for (let day = 0; day < ANSWERS.length; day++) seen.add(answerForDay(day))
    expect(seen.size).toBe(ANSWERS.length)
  })

  it('does not hand out consecutive words from the list', () => {
    const a = ANSWERS.indexOf(answerForDay(10))
    const b = ANSWERS.indexOf(answerForDay(11))
    expect(Math.abs(a - b)).not.toBe(1)
  })
})

describe('dayIndex', () => {
  it('advances by one per calendar day', () => {
    const a = dayIndex(new Date(2026, 5, 1, 23, 59))
    const b = dayIndex(new Date(2026, 5, 2, 0, 1))
    expect(b - a).toBe(1)
  })

  it('is the same all day regardless of the hour', () => {
    expect(dayIndex(new Date(2026, 5, 1, 0, 0))).toBe(dayIndex(new Date(2026, 5, 1, 23, 59)))
  })
})

describe('shareText', () => {
  it('reports the guess count and draws the grid', () => {
    const text = shareText(['crane', 'about'], 'about', 7)
    expect(text).toContain(`#7 2/${MAX_GUESSES}`)
    expect(text).toContain('\u{1F7E9}\u{1F7E9}\u{1F7E9}\u{1F7E9}\u{1F7E9}')
  })

  it('marks a loss with X', () => {
    const guesses = Array(MAX_GUESSES).fill('crane')
    expect(shareText(guesses, 'about', 7)).toContain(`X/${MAX_GUESSES}`)
  })

  it('never leaks the answer', () => {
    expect(shareText(['crane'], 'about', 7)).not.toContain('about')
  })
})
