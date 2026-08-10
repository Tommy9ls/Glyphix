import { describe, it, expect } from 'vitest'
import {
  MAX_ROUNDS_PER_DAY,
  atDailyLimit,
  completeRound,
  currentRound,
  permutation,
  rollOver,
  roundsLeft,
  startRound,
} from './session'

const session = (over = {}) => ({
  day: 10,
  played: 0,
  round: 0,
  seed: 1,
  cursor: 0,
  index: null,
  ...over,
})

describe('permutation', () => {
  it('is a permutation of every index', () => {
    const p = permutation(50, 7)
    expect([...p].sort((a, b) => a - b)).toEqual(Array.from({ length: 50 }, (_, i) => i))
  })

  it('is stable for a seed', () => {
    expect(permutation(40, 3)).toEqual(permutation(40, 3))
  })

  it('differs between seeds', () => {
    expect(permutation(40, 3)).not.toEqual(permutation(40, 4))
  })

  it('does not leave the list in its original order', () => {
    const p = permutation(60, 11)
    expect(p).not.toEqual(Array.from({ length: 60 }, (_, i) => i))
  })

  it('handles a single-entry pool', () => {
    expect(permutation(1, 5)).toEqual([0])
  })
})

describe('startRound', () => {
  it('hands out a puzzle index and advances the cursor', () => {
    const next = startRound('wordle', 30, session())
    expect(next.index).toBeGreaterThanOrEqual(0)
    expect(next.index).toBeLessThan(30)
    expect(next.cursor).toBe(1)
  })

  // The whole point of the shuffled walk.
  it('never repeats a puzzle before the pool is exhausted', () => {
    const pool = 25
    let s = session()
    const seen = []
    for (let i = 0; i < pool; i++) {
      s = startRound('wordle', pool, { ...s, played: 0 })
      seen.push(s.index)
    }
    expect(new Set(seen).size).toBe(pool)
  })

  it('reshuffles into a different order once the pool is exhausted', () => {
    const pool = 25
    let s = session()
    const first = []
    for (let i = 0; i < pool; i++) {
      s = startRound('wordle', pool, { ...s, played: 0 })
      first.push(s.index)
    }
    const second = []
    for (let i = 0; i < pool; i++) {
      s = startRound('wordle', pool, { ...s, played: 0 })
      second.push(s.index)
    }
    expect(new Set(second).size).toBe(pool)
    expect(second).not.toEqual(first)
  })

  it('refuses to start past the daily limit', () => {
    expect(startRound('wordle', 30, session({ played: MAX_ROUNDS_PER_DAY }))).toBeNull()
  })
})

describe('the daily limit', () => {
  it('counts down as rounds complete', () => {
    expect(roundsLeft(session())).toBe(MAX_ROUNDS_PER_DAY)
    expect(roundsLeft(session({ played: 3 }))).toBe(MAX_ROUNDS_PER_DAY - 3)
  })

  it('never reports negative rounds left', () => {
    expect(roundsLeft(session({ played: MAX_ROUNDS_PER_DAY + 5 }))).toBe(0)
  })

  it('reports being at the limit', () => {
    expect(atDailyLimit(session({ played: MAX_ROUNDS_PER_DAY }))).toBe(true)
    expect(atDailyLimit(session({ played: MAX_ROUNDS_PER_DAY - 1 }))).toBe(false)
  })

  // Abandoning a round mid-way must not burn one of the fifty.
  it('only advances on completion, not on starting', () => {
    const started = startRound('wordle', 30, session())
    expect(started.played).toBe(0)
    expect(completeRound('wordle', started).played).toBe(1)
  })
})

describe('rollOver', () => {
  it('keeps a session from the same day untouched', () => {
    const s = session({ played: 4, cursor: 9 })
    expect(rollOver(s, 10)).toBe(s)
  })

  it('resets the daily count on a new day', () => {
    const rolled = rollOver(session({ played: 20, round: 20, cursor: 31 }), 11)
    expect(rolled.played).toBe(0)
    expect(rolled.round).toBe(0)
    expect(rolled.day).toBe(11)
  })

  // The no-repeat walk spans days; only the daily allowance resets.
  it('carries the pool position across the day boundary', () => {
    const rolled = rollOver(session({ seed: 42, cursor: 31 }), 11)
    expect(rolled.seed).toBe(42)
    expect(rolled.cursor).toBe(31)
  })

  it('rejects a malformed stored session', () => {
    expect(rollOver(null, 10)).toBeNull()
    expect(rollOver({ day: 'nope' }, 10)).toBeNull()
    expect(rollOver({ day: 1, played: 0 }, 10)).toBeNull()
  })
})

describe('currentRound', () => {
  it('resumes the puzzle already in progress', () => {
    const s = session({ index: 7, cursor: 1 })
    expect(currentRound('wordle', 30, s)).toBe(s)
  })

  it('starts one when there is none', () => {
    expect(currentRound('wordle', 30, session()).index).not.toBeNull()
  })

  it('returns null at the limit with no round in progress', () => {
    expect(currentRound('wordle', 30, session({ played: MAX_ROUNDS_PER_DAY }))).toBeNull()
  })
})
