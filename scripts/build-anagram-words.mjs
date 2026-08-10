/**
 * Generates src/data/anagram-words.js — the daily letter pools and their words.
 *
 * Run with `node scripts/build-anagram-words.mjs`. Needs network access once;
 * the generated file is committed, so nobody else has to run this.
 *
 * We precompute each puzzle's words instead of shipping a whole dictionary. A
 * 3-7 letter word list is ~600KB even minified, while 300 puzzles' worth of
 * words is a fraction of that, and validation collapses to a Set lookup against
 * the day's own list.
 *
 * Each puzzle carries two lists, the same split words.js already uses for
 * wordle's ANSWERS vs VALID_GUESSES:
 *
 *   accepted — every real word the pool can make. What a submission is checked
 *              against, so the game never rejects a word the player knows.
 *   target   — the common subset. The denominator for progress, the basis for
 *              the score bar, and what gets revealed as "missed" at the end.
 *
 * A single list cannot do both jobs: score against the wide list and the bar
 * barely moves, reveal the wide list and it is a wall of obscurities — but
 * validate against the narrow one and ordinary words get rejected.
 */
import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

// ENABLE is the standard word-game dictionary: no proper nouns, no
// abbreviations. A general word list leaks names like "andre" and "arline"
// into the puzzle, which read as nonsense when revealed as missed words.
const ACCEPTED_URL = 'https://raw.githubusercontent.com/dolph/dictionary/master/enable1.txt'

// Frequency-ordered, most common first — used to pick pools and to decide
// which of a pool's words are common enough to count toward the target.
const COMMON_URL =
  'https://raw.githubusercontent.com/first20hours/google-10000-english/master/google-10000-english-no-swears.txt'

const POOL_SIZE = 7
const MIN_WORD = 3
// A target needs enough to chase without being a slog. Puzzles outside this
// band are dropped rather than padded, so every shipped day is a playable one.
const MIN_TARGET = 20
const MAX_TARGET = 70
const MIN_VOWELS = 2
const PUZZLE_COUNT = 300

const VOWELS = new Set(['a', 'e', 'i', 'o', 'u'])
// One awkward letter in a pool is a fun spike; two is a dead end.
const RARE = new Set(['j', 'q', 'x', 'z', 'v', 'k'])

const outPath = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'data', 'anagram-words.js')

/** Letter -> count, the form every containment check works against. */
function counts(word) {
  const map = new Map()
  for (const ch of word) map.set(ch, (map.get(ch) || 0) + 1)
  return map
}

/** Whether `word` can be spelled from the pool's letters, each used at most once. */
function fitsWithin(wordCounts, poolCounts) {
  for (const [ch, n] of wordCounts) {
    if ((poolCounts.get(ch) || 0) < n) return false
  }
  return true
}

function vowelCount(word) {
  let n = 0
  for (const ch of word) if (VOWELS.has(ch)) n += 1
  return n
}

function rareCount(word) {
  return new Set([...word].filter((ch) => RARE.has(ch))).size
}

function usable(word) {
  return word.length >= MIN_WORD && word.length <= POOL_SIZE && /^[a-z]+$/.test(word)
}

async function fetchWords(url) {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`word list fetch failed: ${url} ${response.status}`)
  const raw = await response.text()
  return raw.split('\n').map((line) => line.trim().toLowerCase())
}

const [acceptedAll, commonAll] = await Promise.all([
  fetchWords(ACCEPTED_URL),
  fetchWords(COMMON_URL),
])

const accepted = acceptedAll.filter(usable)
const acceptedSet = new Set(accepted)
// Order is preserved, so seeds stay frequency-ranked and the pools we pick are
// built from words players actually know.
const common = commonAll.filter((w) => usable(w) && acceptedSet.has(w))
const commonSet = new Set(common)

const candidates = accepted.map((word) => ({ word, counts: counts(word) }))

const seeds = common.filter(
  (word) => word.length === POOL_SIZE && vowelCount(word) >= MIN_VOWELS && rareCount(word) <= 1,
)

const puzzles = []
const seenPools = new Set()

for (const seed of seeds) {
  if (puzzles.length >= PUZZLE_COUNT) break

  const pool = [...seed].sort().join('')
  if (seenPools.has(pool)) continue

  const poolCounts = counts(seed)
  const target = []
  const bonus = []
  for (const candidate of candidates) {
    if (!fitsWithin(candidate.counts, poolCounts)) continue
    if (commonSet.has(candidate.word)) target.push(candidate.word)
    else bonus.push(candidate.word)
  }

  if (target.length < MIN_TARGET || target.length > MAX_TARGET) continue

  seenPools.add(pool)
  // Alphabetical in the data file so diffs stay readable; the UI orders by
  // length when it reveals them.
  puzzles.push({ pool, target: target.sort(), bonus: bonus.sort() })
}

if (puzzles.length < PUZZLE_COUNT) {
  console.warn(`only ${puzzles.length} puzzles met the criteria (wanted ${PUZZLE_COUNT})`)
}

const body = puzzles.map((p) => `${p.pool} ${p.target.join(' ')}|${p.bonus.join(' ')}`).join('\n')

const file = `// Generated by scripts/build-anagram-words.mjs — do not edit by hand.
//
// One puzzle per line: the pool's letters in sorted order, then the common
// target words, then '|', then the rarer words that are accepted but do not
// count toward the target. Only ever *append* here; PUZZLES is indexed by a
// stride in anagrams.js, so reordering reshuffles every future puzzle.
const PUZZLES_RAW = \`
${body}
\`

/**
 * [{ letters, words, target }] — one entry per puzzle day.
 *
 * \`words\` is everything the pool accepts; \`target\` is the common subset the
 * progress bar and the missed-word reveal are measured against.
 */
export const PUZZLES = PUZZLES_RAW.trim()
  .split('\\n')
  .map((line) => {
    const space = line.indexOf(' ')
    const letters = line.slice(0, space)
    const [targetRaw, bonusRaw] = line.slice(space + 1).split('|')
    const target = targetRaw ? targetRaw.split(' ').filter(Boolean) : []
    const bonus = bonusRaw ? bonusRaw.split(' ').filter(Boolean) : []
    return { letters, target: new Set(target), words: new Set([...target, ...bonus]) }
  })
  .filter((p) => p.letters && p.target.size)
`

mkdirSync(dirname(outPath), { recursive: true })
writeFileSync(outPath, file, 'utf8')

const targetWords = puzzles.reduce((sum, p) => sum + p.target.length, 0)
const allWords = puzzles.reduce((sum, p) => sum + p.target.length + p.bonus.length, 0)
console.log(
  `wrote ${puzzles.length} puzzles · ${targetWords} target + ${allWords - targetWords} bonus ` +
    `= ${allWords} words · ${(Buffer.byteLength(file) / 1024).toFixed(1)}KB`,
)
