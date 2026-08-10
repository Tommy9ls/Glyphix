import { MAX_GUESSES } from './wordle'
import { readJSON, writeJSON } from './storage'

/**
 * Keep the stored history bounded.
 *
 * Sized for continuous play: at MAX_ROUNDS_PER_DAY this is roughly three weeks
 * of a heavy player's rounds. The old 200 held only four days once games
 * stopped being one-per-day.
 */
const HISTORY_LIMIT = 2000

/**
 * Every game normalises to the same 0-100 scale per day.
 *
 * Without that, a game handing out 400-point rounds would drown one handing out
 * 100, and a combined ranking would just be a list of which games people play.
 */
export const MAX_POINTS = 100

/**
 * Points for a finished wordle. Faster wins score higher; a loss scores nothing.
 *
 * Indexed by guesses used, so POINTS_BY_GUESS[0] is a first-guess win. Kept as
 * a table rather than a formula so the curve can be tuned without re-deriving
 * anything, and so a backend can mirror the same numbers.
 */
const POINTS_BY_GUESS = [100, 80, 65, 50, 40, 30]

// Anagrams splits its 100 between breadth and the full-pool word, so a player
// who sweeps the short words and one who lands the seven-letter word both have
// something left to chase.
const ANAGRAM_COMPLETION_POINTS = 90
const ANAGRAM_WIN_BONUS = 10

const COMPLETION_BUCKETS = 5

function isNumber(value) {
  return typeof value === 'number' && Number.isFinite(value)
}

function isDayEntry(value) {
  return !!value && isNumber(value.day) && typeof value.won === 'boolean'
}

/**
 * A round's identity, now that a day holds many of them.
 *
 * Entries written before continuous play have no `round`; treating a missing
 * one as round 0 keeps those rows addressable instead of orphaning them.
 */
export function roundKey(entry) {
  return `${entry.day}.${entry.round ?? 0}`
}

/** Newest round first: by day, then by round within the day. */
function byNewest(a, b) {
  return b.day - a.day || (b.round ?? 0) - (a.round ?? 0)
}

/** Total points scored on one day, which is what "stacking" adds up. */
export function pointsForDay(entries, day, game = DEFAULT_GAME) {
  const config = gameConfig(game)
  let total = 0
  for (const entry of entries) {
    if (entry.day === day) total += config.pointsFor(entry)
  }
  return total
}

/**
 * What the leaderboard needs to know about a game.
 *
 * Adding a game means adding an entry here and nothing else: storage, scoring,
 * validation, and the shape of the stats panel all come from this one object.
 */
export const GAMES = {
  wordle: {
    id: 'wordle',
    name: 'Wordle',
    path: '/games/wordle',
    // Deliberately the original un-suffixed key. Wordle predates the split, so
    // leaving it where it is means no existing player record has to be moved.
    storageKey: 'glyphix.leaderboard.history',

    isEntry: (v) => isDayEntry(v) && isNumber(v.guessCount),

    pointsFor: ({ won, guessCount }) => (won ? (POINTS_BY_GUESS[guessCount - 1] ?? 0) : 0),

    /** Score badge for a history row, e.g. "3/6". */
    scoreLabel: (e) => `${e.won ? e.guessCount : 'X'}/${MAX_GUESSES}`,

    extras(entries) {
      const distribution = new Array(MAX_GUESSES).fill(0)
      let wins = 0
      let guesses = 0

      for (const entry of entries) {
        if (!entry.won) continue
        wins += 1
        guesses += entry.guessCount
        const slot = entry.guessCount - 1
        if (slot >= 0 && slot < MAX_GUESSES) distribution[slot] += 1
      }

      const averageGuesses = wins ? Number((guesses / wins).toFixed(2)) : null
      return {
        distribution,
        distributionLabels: distribution.map((_, i) => String(i + 1)),
        distributionTitle: 'Guess Distribution',
        distributionEmpty: 'No wins recorded yet.',
        average: averageGuesses,
        averageCaption: 'Avg. Guesses',
        // Kept under its old name too, since callers and tests already read it.
        averageGuesses,
      }
    },
  },

  anagrams: {
    id: 'anagrams',
    name: 'Anagrams',
    path: '/games/anagrams',
    storageKey: 'glyphix.leaderboard.history.anagrams',

    isEntry: (v) =>
      isDayEntry(v) && isNumber(v.found) && isNumber(v.total) && isNumber(v.score) && isNumber(v.maxScore),

    /**
     * Completion carries most of the score, with a bonus for the full-pool word.
     *
     * Normalising against the round's own maxScore is what keeps a 20-word pool
     * and a 70-word pool worth the same on the board.
     */
    pointsFor: ({ won, score, maxScore }) => {
      if (!maxScore || maxScore <= 0) return 0
      const ratio = Math.max(0, Math.min(1, score / maxScore))
      return Math.round(ratio * ANAGRAM_COMPLETION_POINTS) + (won ? ANAGRAM_WIN_BONUS : 0)
    },

    scoreLabel: (e) => `${e.found}/${e.total}`,

    extras(entries) {
      const distribution = new Array(COMPLETION_BUCKETS).fill(0)
      let words = 0

      for (const entry of entries) {
        words += entry.found
        if (!entry.total) continue
        const ratio = Math.max(0, Math.min(1, entry.found / entry.total))
        // A full sweep would land one past the last bucket, so clamp it back in.
        const slot = Math.min(COMPLETION_BUCKETS - 1, Math.floor(ratio * COMPLETION_BUCKETS))
        distribution[slot] += 1
      }

      return {
        distribution,
        distributionLabels: distribution.map((_, i) =>
          `${Math.round(((i + 1) / COMPLETION_BUCKETS) * 100)}`,
        ),
        distributionTitle: 'Completion %',
        distributionEmpty: 'No rounds recorded yet.',
        average: entries.length ? Number((words / entries.length).toFixed(1)) : null,
        averageCaption: 'Avg. Words',
      }
    },
  },
}

export const GAME_IDS = Object.keys(GAMES)
export const DEFAULT_GAME = 'wordle'

/** Resolve a game id, falling back rather than throwing on an unknown one. */
export function gameConfig(game = DEFAULT_GAME) {
  return GAMES[game] ?? GAMES[DEFAULT_GAME]
}

export function pointsFor(entry, game = DEFAULT_GAME) {
  if (!entry) return 0
  return gameConfig(game).pointsFor(entry)
}

/**
 * Fold a list of history entries into the numbers the leaderboard displays.
 *
 * Derived rather than stored, so a corrupted or partial history can't leave the
 * totals disagreeing with the rows they summarise. The counting that every game
 * shares lives here; the per-game panels come from the config's `extras`.
 */
export function summarise(entries, game = DEFAULT_GAME) {
  const config = gameConfig(game)
  let wins = 0
  let points = 0

  for (const entry of entries) {
    points += config.pointsFor(entry)
    if (entry.won) wins += 1
  }

  const played = entries.length
  return {
    game: config.id,
    played,
    wins,
    points,
    winRate: played ? Math.round((wins / played) * 100) : 0,
    ...config.extras(entries),
    ...streaks(entries),
  }
}

/**
 * Current and best streak, counting only consecutive puzzle days.
 *
 * A day holds many rounds now, so days are collapsed first: a day counts as won
 * if *any* round that day was won. Without that collapse a single lost round
 * would wipe a streak the player had already earned earlier the same day.
 *
 * A gap in days still breaks the streak even if every round played was won —
 * skipping a day is a miss, matching how the in-game stats treat it.
 */
function streaks(entries) {
  const wonByDay = new Map()
  for (const entry of entries) {
    wonByDay.set(entry.day, (wonByDay.get(entry.day) ?? false) || entry.won)
  }

  const days = [...wonByDay.keys()].sort((a, b) => a - b)
  let streak = 0
  let maxStreak = 0
  let previousDay = null

  for (const day of days) {
    if (!wonByDay.get(day)) {
      streak = 0
    } else if (previousDay !== null && day === previousDay + 1) {
      streak += 1
    } else {
      streak = 1
    }
    maxStreak = Math.max(maxStreak, streak)
    previousDay = day
  }

  return { streak, maxStreak, daysPlayed: days.length }
}

/**
 * The local source: one player, backed by localStorage.
 *
 * `store` is injectable so tests can supply an in-memory map instead of
 * reaching for a DOM. Every method is async even though nothing here awaits,
 * because the point of this shape is that a networked source drops into the
 * same call sites without touching them.
 *
 * Every method takes the game as its first argument. A networked source needs
 * to know which board it is talking about, and threading it through the
 * contract beats keeping a separate source per game.
 */
export function createLocalSource(store = { read: readJSON, write: writeJSON }) {
  function entries(game) {
    const config = gameConfig(game)
    const saved = store.read(config.storageKey, [])
    return Array.isArray(saved) ? saved.filter(config.isEntry) : []
  }

  return {
    id: 'local',

    /** Whether this source can rank the player against anyone else. */
    canRank: false,

    async submit(game, result) {
      const config = gameConfig(game)
      if (!config.isEntry(result)) return
      // Rounds *stack* — a day holds up to MAX_ROUNDS_PER_DAY of them, so the
      // identity is (day, round) rather than the day alone. Re-submitting the
      // same round still replaces rather than double-counts, which is the
      // protection the original day-level replace was there for.
      const kept = entries(game).filter((e) => roundKey(e) !== roundKey(result))
      const next = [...kept, result].sort(byNewest).slice(0, HISTORY_LIMIT)
      store.write(config.storageKey, next)
    },

    async history(game, limit = HISTORY_LIMIT) {
      return entries(game).sort(byNewest).slice(0, limit)
    },

    async summary(game) {
      return summarise(entries(game), game)
    },

    /**
     * Global ranking is not something this source can answer. It returns null
     * rather than a fabricated board, and the page renders an explanatory
     * state instead of fake rivals.
     */
    async ranking() {
      return null
    },
  }
}

let active = createLocalSource()

/**
 * Swap the backing source. This is the whole seam: point it at a networked
 * implementation of the same five members and every caller keeps working.
 */
export function setLeaderboardSource(source) {
  active = source
}

export function leaderboardSource() {
  return active
}

export const leaderboard = {
  submit: (game, result) => active.submit(game, result),
  history: (game, limit) => active.history(game, limit),
  summary: (game) => active.summary(game),
  ranking: (game, day) => active.ranking(game, day),

  get canRank() {
    return active.canRank
  },

  /**
   * A view of the board scoped to one game, so pages can hold on to
   * `leaderboard.for('anagrams')` instead of passing the id to every call.
   */
  for(game) {
    return {
      game,
      submit: (result) => active.submit(game, result),
      history: (limit) => active.history(game, limit),
      summary: () => active.summary(game),
      ranking: (day) => active.ranking(game, day),
      get canRank() {
        return active.canRank
      },
    }
  },
}
