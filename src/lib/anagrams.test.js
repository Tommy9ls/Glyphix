import { describe, it, expect } from 'vitest'
import { PUZZLES } from '../data/anagram-words'
import {
  ALREADY_FOUND,
  MIN_WORD_LENGTH,
  NOT_IN_POOL,
  POINTS_BY_LENGTH,
  TOO_SHORT,
  UNKNOWN_WORD,
  arrangeLetters,
  byLength,
  canSpell,
  isComplete,
  isWon,
  maxScore,
  missedWords,
  pointsForWord,
  puzzleForDay,
  roundResult,
  shareText,
  splitFound,
  submitWord,
  totalScore,
} from './anagrams'

/**
 * A hand-built pool, so the assertions don't depend on generated data.
 *
 * `words` is everything accepted; `target` is the common subset. "gallern" is
 * deliberately accepted-but-not-target, which is what makes the bonus paths
 * testable.
 */
const puzzle = {
  letters: 'aegllnr',
  target: new Set(['all', 'ran', 'earl', 'gnarl', 'lager']),
  words: new Set(['all', 'ran', 'earl', 'gnarl', 'lager', 'gallern']),
}

describe('puzzleForDay', () => {
  it('is stable for the same day', () => {
    expect(puzzleForDay(7)).toBe(puzzleForDay(7))
  })

  it('does not hand out the same pool on consecutive days', () => {
    expect(puzzleForDay(7).letters).not.toBe(puzzleForDay(8).letters)
  })

  it('visits every puzzle before repeating one', () => {
    const seen = new Set()
    for (let day = 0; day < PUZZLES.length; day++) seen.add(puzzleForDay(day).letters)
    expect(seen.size).toBe(PUZZLES.length)
  })

  it('handles days before the epoch', () => {
    expect(puzzleForDay(-3)).toBeDefined()
    expect(puzzleForDay(-3).letters).toHaveLength(7)
  })
})

describe('canSpell', () => {
  it('accepts a word built from the pool', () => {
    expect(canSpell('gnarl', 'aegllnr')).toBe(true)
  })

  it('rejects a letter the pool does not have', () => {
    expect(canSpell('grab', 'aegllnr')).toBe(false)
  })

  // The whole point of counting rather than testing membership.
  it('rejects reusing a letter the pool only has once', () => {
    expect(canSpell('gaggle', 'aegllnr')).toBe(false)
  })

  it('allows a repeat the pool actually holds twice', () => {
    expect(canSpell('all', 'aegllnr')).toBe(true)
  })
})

describe('submitWord', () => {
  it('accepts a valid word and scores it', () => {
    expect(submitWord('gnarl', puzzle)).toEqual({ ok: true, word: 'gnarl', points: 6 })
  })

  it('normalises case and surrounding space', () => {
    expect(submitWord('  GNARL ', puzzle).ok).toBe(true)
  })

  it('rejects anything under the minimum length', () => {
    const short = 'a'.repeat(MIN_WORD_LENGTH - 1)
    expect(submitWord(short, puzzle).reason).toBe(TOO_SHORT)
  })

  it('reports an out-of-pool letter ahead of an unknown word', () => {
    expect(submitWord('zzz', puzzle).reason).toBe(NOT_IN_POOL)
  })

  it('reports a duplicate ahead of anything else', () => {
    expect(submitWord('gnarl', puzzle, ['gnarl']).reason).toBe(ALREADY_FOUND)
  })

  it('rejects a spellable word that is not in the solution list', () => {
    expect(submitWord('nag', puzzle).reason).toBe(UNKNOWN_WORD)
  })

  it('handles empty and missing input without throwing', () => {
    expect(submitWord('', puzzle).reason).toBe(TOO_SHORT)
    expect(submitWord(undefined, puzzle).reason).toBe(TOO_SHORT)
  })
})

describe('scoring', () => {
  it('scores by length from the table', () => {
    expect(pointsForWord('all')).toBe(POINTS_BY_LENGTH[3])
    expect(pointsForWord('gallern')).toBe(POINTS_BY_LENGTH[7])
  })

  it('scores an off-table length as zero', () => {
    expect(pointsForWord('ab')).toBe(0)
  })

  it('totals a found list', () => {
    expect(totalScore(['all', 'earl'])).toBe(POINTS_BY_LENGTH[3] + POINTS_BY_LENGTH[4])
  })

  it('totals an empty list as zero', () => {
    expect(totalScore([])).toBe(0)
  })

  it('maxScore covers the target, not every accepted word', () => {
    expect(maxScore(puzzle)).toBe(totalScore([...puzzle.target]))
    expect(maxScore(puzzle)).toBeLessThan(totalScore([...puzzle.words]))
  })
})

describe('target vs bonus', () => {
  it('splits found words into target and bonus', () => {
    const { target, bonus } = splitFound(['all', 'gallern'], puzzle)
    expect(target).toEqual(['all'])
    expect(bonus).toEqual(['gallern'])
  })

  // The bug this whole split exists to fix: a real word outside the common
  // list used to be rejected outright.
  it('accepts a word that is not in the target', () => {
    expect(submitWord('gallern', puzzle).ok).toBe(true)
  })

  it('scores bonus words like any other', () => {
    expect(submitWord('gallern', puzzle).points).toBe(POINTS_BY_LENGTH[7])
  })

  it('reveals only the target words as missed', () => {
    const missed = missedWords(['all'], puzzle)
    expect(missed).toEqual(expect.arrayContaining(['ran', 'earl', 'gnarl', 'lager']))
    expect(missed).not.toContain('gallern')
  })

  it('is complete once the target is found, bonus or not', () => {
    expect(isComplete([...puzzle.target], puzzle)).toBe(true)
  })
})

describe('outcomes', () => {
  it('is won by a word using every letter', () => {
    expect(isWon(['gallern'], puzzle)).toBe(true)
  })

  it('is not won by shorter words alone', () => {
    expect(isWon(['gnarl', 'earl', 'all'], puzzle)).toBe(false)
  })

  it('is complete only once every word is found', () => {
    expect(isComplete([...puzzle.words], puzzle)).toBe(true)
    expect(isComplete(['all'], puzzle)).toBe(false)
  })

  it('every generated puzzle has a reachable target', () => {
    for (const p of PUZZLES) {
      expect(p.target.size).toBeGreaterThan(0)
      // The target must be a subset of what the game will accept, or a listed
      // "missed" word would be one the player was never allowed to enter.
      for (const word of p.target) expect(p.words.has(word)).toBe(true)
    }
  })

  it('every generated puzzle is winnable', () => {
    for (const p of PUZZLES) {
      expect([...p.words].some((w) => w.length === p.letters.length)).toBe(true)
    }
  })
})

describe('arrangeLetters', () => {
  it('is stable for a seed', () => {
    expect(arrangeLetters('aegllnr', 12)).toEqual(arrangeLetters('aegllnr', 12))
  })

  it('keeps exactly the pool letters', () => {
    expect(arrangeLetters('aegllnr', 3).sort().join('')).toBe('aegllnr')
  })

  it('gives different seeds different arrangements', () => {
    const orders = new Set([1, 2, 3, 4, 5].map((s) => arrangeLetters('aegllnr', s).join('')))
    expect(orders.size).toBeGreaterThan(1)
  })
})

describe('byLength', () => {
  it('groups longest first, alphabetical within a group', () => {
    expect(byLength(['ran', 'gallern', 'all', 'earl'])).toEqual([
      { length: 7, words: ['gallern'] },
      { length: 4, words: ['earl'] },
      { length: 3, words: ['all', 'ran'] },
    ])
  })

  it('handles an empty list', () => {
    expect(byLength([])).toEqual([])
  })
})

describe('roundResult', () => {
  it('reports counts and scores for the day', () => {
    expect(roundResult(['all', 'earl'], puzzle, 42)).toEqual({
      day: 42,
      won: false,
      found: 2,
      total: puzzle.target.size,
      bonus: 0,
      score: POINTS_BY_LENGTH[3] + POINTS_BY_LENGTH[4],
      maxScore: maxScore(puzzle),
    })
  })

  it('counts bonus finds apart from the target', () => {
    const result = roundResult(['all', 'gallern'], puzzle, 42)
    expect(result.found).toBe(1)
    expect(result.bonus).toBe(1)
    expect(result.total).toBe(puzzle.target.size)
    // The bonus word still pays, which is what lets a strong round pass maxScore.
    expect(result.score).toBe(POINTS_BY_LENGTH[3] + POINTS_BY_LENGTH[7])
  })

  it('marks a full-length find as won', () => {
    expect(roundResult(['gallern'], puzzle, 42).won).toBe(true)
  })
})

describe('shareText', () => {
  it('names the puzzle and the tally', () => {
    const text = shareText(['all', 'earl'], puzzle, 42)
    expect(text).toContain('Glyphix Anagrams #42')
    expect(text).toContain(`2/${puzzle.target.size} words`)
  })

  it('calls out bonus finds', () => {
    expect(shareText(['all', 'gallern'], puzzle, 42)).toContain('(+1 bonus)')
    expect(shareText(['all'], puzzle, 42)).not.toContain('bonus')
  })

  it('crowns a won round only', () => {
    expect(shareText(['gallern'], puzzle, 42)).toContain('\u{1F451}')
    expect(shareText(['all'], puzzle, 42)).not.toContain('\u{1F451}')
  })
})
