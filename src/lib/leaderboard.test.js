import { beforeEach, describe, expect, it } from 'vitest'
import { MAX_GUESSES } from './wordle'
import { GAMES, MAX_POINTS, createLocalSource, pointsFor, summarise } from './leaderboard'

/** An in-memory stand-in for localStorage, so these tests need no DOM. */
function memoryStore() {
  const data = new Map()
  return {
    read: (key, fallback) => (data.has(key) ? data.get(key) : fallback),
    write: (key, value) => data.set(key, JSON.parse(JSON.stringify(value))),
    raw: data,
  }
}

const win = (day, guessCount, answer = 'clerk') => ({ day, won: true, guessCount, answer })
const loss = (day, answer = 'clerk') => ({ day, won: false, guessCount: MAX_GUESSES, answer })

describe('pointsFor', () => {
  it('pays more for fewer guesses', () => {
    const scores = Array.from({ length: MAX_GUESSES }, (_, i) => pointsFor(win(1, i + 1)))
    const descending = [...scores].sort((a, b) => b - a)
    expect(scores).toEqual(descending)
  })

  it('caps at MAX_POINTS for a first-guess win', () => {
    expect(pointsFor(win(1, 1))).toBe(MAX_POINTS)
  })

  it('pays nothing for a loss', () => {
    expect(pointsFor(loss(1))).toBe(0)
  })

  it('pays nothing for an out-of-range guess count', () => {
    expect(pointsFor({ won: true, guessCount: 99 })).toBe(0)
    expect(pointsFor({ won: true, guessCount: 0 })).toBe(0)
  })
})

describe('summarise', () => {
  it('returns a zeroed summary for no games', () => {
    const summary = summarise([])
    expect(summary.played).toBe(0)
    expect(summary.points).toBe(0)
    expect(summary.winRate).toBe(0)
    expect(summary.averageGuesses).toBeNull()
    expect(summary.distribution).toEqual(new Array(MAX_GUESSES).fill(0))
  })

  it('counts plays, wins, and points', () => {
    const summary = summarise([win(1, 3), win(2, 4), loss(3)])
    expect(summary.played).toBe(3)
    expect(summary.wins).toBe(2)
    expect(summary.points).toBe(pointsFor(win(1, 3)) + pointsFor(win(2, 4)))
  })

  it('rounds the win rate', () => {
    expect(summarise([win(1, 3), win(2, 3), loss(3)]).winRate).toBe(67)
  })

  it('averages guesses over wins only', () => {
    // Wins on 2 and 4 average 3; the loss must not drag it upward.
    expect(summarise([win(1, 2), win(2, 4), loss(3)]).averageGuesses).toBe(3)
  })

  it('builds the distribution by guess count', () => {
    const summary = summarise([win(1, 1), win(2, 3), win(3, 3)])
    expect(summary.distribution[0]).toBe(1)
    expect(summary.distribution[2]).toBe(2)
  })

  it('ignores a guess count outside the distribution', () => {
    const summary = summarise([{ day: 1, won: true, guessCount: 42 }])
    expect(summary.distribution).toEqual(new Array(MAX_GUESSES).fill(0))
  })

  describe('streaks', () => {
    it('counts consecutive winning days', () => {
      const summary = summarise([win(1, 3), win(2, 3), win(3, 3)])
      expect(summary.streak).toBe(3)
      expect(summary.maxStreak).toBe(3)
    })

    it('breaks the streak on a loss', () => {
      const summary = summarise([win(1, 3), win(2, 3), loss(3)])
      expect(summary.streak).toBe(0)
      expect(summary.maxStreak).toBe(2)
    })

    it('breaks the streak on a skipped day', () => {
      // Won day 1 and day 5, but day 5 starts a new streak.
      const summary = summarise([win(1, 3), win(5, 3)])
      expect(summary.streak).toBe(1)
      expect(summary.maxStreak).toBe(1)
    })

    it('remembers the best streak after a later break', () => {
      const summary = summarise([win(1, 3), win(2, 3), win(3, 3), loss(4), win(5, 3)])
      expect(summary.streak).toBe(1)
      expect(summary.maxStreak).toBe(3)
    })

    it('is order-independent', () => {
      const ordered = summarise([win(1, 3), win(2, 3), win(3, 3)])
      const shuffled = summarise([win(3, 3), win(1, 3), win(2, 3)])
      expect(shuffled.streak).toBe(ordered.streak)
      expect(shuffled.maxStreak).toBe(ordered.maxStreak)
    })
  })
})

describe('createLocalSource', () => {
  let store
  let source

  beforeEach(() => {
    store = memoryStore()
    source = createLocalSource(store)
  })

  it('starts empty', async () => {
    expect(await source.history('wordle')).toEqual([])
    expect((await source.summary('wordle')).played).toBe(0)
  })

  it('round-trips a submitted game', async () => {
    await source.submit('wordle', win(10, 3, 'proud'))
    const history = await source.history('wordle')
    expect(history).toHaveLength(1)
    expect(history[0]).toMatchObject({ day: 10, won: true, guessCount: 3, answer: 'proud' })
  })

  it('returns history newest first', async () => {
    await source.submit('wordle', win(1, 3))
    await source.submit('wordle', win(3, 3))
    await source.submit('wordle', win(2, 3))
    expect((await source.history('wordle')).map((e) => e.day)).toEqual([3, 2, 1])
  })

  it('replaces a day instead of double-counting it', async () => {
    await source.submit('wordle', win(10, 3))
    await source.submit('wordle', win(10, 5))
    const history = await source.history('wordle')
    expect(history).toHaveLength(1)
    expect(history[0].guessCount).toBe(5)
    expect((await source.summary('wordle')).played).toBe(1)
  })

  it('honours the history limit', async () => {
    expect((await source.history('wordle', 2)).length).toBe(0)
    for (let day = 1; day <= 5; day++) await source.submit('wordle', win(day, 3))
    expect(await source.history('wordle', 2)).toHaveLength(2)
  })

  it('ignores a malformed submission', async () => {
    await source.submit('wordle', null)
    await source.submit('wordle', { day: 'nope' })
    await source.submit('wordle', { day: 1, won: true })
    expect(await source.history('wordle')).toEqual([])
  })

  it('survives a corrupted store', async () => {
    store.write('glyphix.leaderboard.history', { not: 'an array' })
    expect(await source.history('wordle')).toEqual([])
    expect((await source.summary('wordle')).played).toBe(0)
  })

  it('drops malformed entries already in the store', async () => {
    store.write('glyphix.leaderboard.history', [win(1, 3), { garbage: true }])
    expect(await source.history('wordle')).toHaveLength(1)
  })

  it('summarises what was submitted', async () => {
    await source.submit('wordle', win(1, 2))
    await source.submit('wordle', loss(2))
    const summary = await source.summary('wordle')
    expect(summary.played).toBe(2)
    expect(summary.wins).toBe(1)
    expect(summary.points).toBe(pointsFor(win(1, 2)))
  })

  it('cannot rank, and says so rather than inventing rivals', async () => {
    expect(source.canRank).toBe(false)
    expect(await source.ranking('wordle', 1)).toBeNull()
  })

  it('persists across instances sharing a store', async () => {
    await source.submit('wordle', win(7, 4))
    const reopened = createLocalSource(store)
    expect(await reopened.history()).toHaveLength(1)
  })
})

// --- Multi-game -----------------------------------------------------------

const round = (day, found, total, score, maxScore, won = false) => ({
  day,
  won,
  found,
  total,
  score,
  maxScore,
})

describe('anagrams scoring', () => {
  const points = (entry) => pointsFor(entry, 'anagrams')

  it('pays proportionally to completion', () => {
    expect(points(round(1, 0, 40, 0, 100))).toBe(0)
    expect(points(round(1, 20, 40, 50, 100))).toBe(45)
  })

  it('adds a bonus for the full-pool word', () => {
    expect(points(round(1, 20, 40, 50, 100, true))).toBe(55)
  })

  it('caps a perfect round at MAX_POINTS', () => {
    expect(points(round(1, 40, 40, 100, 100, true))).toBe(MAX_POINTS)
  })

  // Normalising is the whole reason a small pool and a large one are comparable.
  it('scores equal completion equally across pool sizes', () => {
    expect(points(round(1, 10, 20, 30, 60))).toBe(points(round(1, 35, 70, 150, 300)))
  })

  it('pays nothing when the round has no maximum', () => {
    expect(points(round(1, 0, 0, 0, 0))).toBe(0)
  })

  it('does not use the wordle table', () => {
    expect(points(round(1, 20, 40, 50, 100))).not.toBe(pointsFor({ won: true, guessCount: 1 }))
  })
})

describe('summarise by game', () => {
  it('buckets anagram rounds by completion', () => {
    const summary = summarise([round(1, 40, 40, 100, 100), round(2, 4, 40, 8, 100)], 'anagrams')
    expect(summary.distribution).toHaveLength(5)
    expect(summary.distribution[4]).toBe(1)
    expect(summary.distribution[0]).toBe(1)
  })

  it('reports average words rather than average guesses', () => {
    const summary = summarise([round(1, 10, 40, 20, 100), round(2, 20, 40, 40, 100)], 'anagrams')
    expect(summary.average).toBe(15)
    expect(summary.averageCaption).toBe('Avg. Words')
  })

  it('shares the streak rules across games', () => {
    const summary = summarise(
      [round(1, 1, 1, 1, 1, true), round(2, 1, 1, 1, 1, true), round(4, 1, 1, 1, 1, true)],
      'anagrams',
    )
    expect(summary.maxStreak).toBe(2)
    expect(summary.streak).toBe(1)
  })

  it('falls back to wordle for an unknown game', () => {
    expect(summarise([], 'nope').distribution).toHaveLength(MAX_GUESSES)
  })
})

describe('per-game storage', () => {
  let store
  let source

  beforeEach(() => {
    store = memoryStore()
    source = createLocalSource(store)
  })

  it('keeps each game history separate', async () => {
    await source.submit('wordle', win(1, 3))
    await source.submit('anagrams', round(1, 10, 40, 20, 100))
    expect(await source.history('wordle')).toHaveLength(1)
    expect(await source.history('anagrams')).toHaveLength(1)
    expect((await source.history('wordle'))[0].guessCount).toBe(3)
    expect((await source.history('anagrams'))[0].found).toBe(10)
  })

  // Wordle predates the split; moving its key would orphan every saved record.
  it('leaves the original wordle key untouched', async () => {
    await source.submit('wordle', win(1, 3))
    expect(store.raw.has('glyphix.leaderboard.history')).toBe(true)
    expect(GAMES.wordle.storageKey).toBe('glyphix.leaderboard.history')
  })

  it('rejects an entry shaped for the other game', async () => {
    await source.submit('anagrams', win(1, 3))
    await source.submit('wordle', round(1, 10, 40, 20, 100))
    expect(await source.history('anagrams')).toEqual([])
    expect(await source.history('wordle')).toEqual([])
  })

  it('scopes a facade to one game', async () => {
    await source.submit('anagrams', round(5, 10, 40, 20, 100))
    expect((await source.summary('anagrams')).played).toBe(1)
    expect((await source.summary('wordle')).played).toBe(0)
  })
})
