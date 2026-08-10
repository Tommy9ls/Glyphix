# Glyphix

Web3-flavored word-game platform. Word challenges, a leaderboard, and token
rewards. Two games are playable — Wordle and Anagram Rush. Both run as
**continuous rounds**, up to 50 a day per game, with scores stacking across the
day; see "Continuous rounds" below. Connecting a Solana wallet is what makes a
round count. Two more games are stubbed as "coming soon" cards.

## Commands

```bash
npm run dev        # Vite dev server with HMR
npm run build      # production build to dist/
npm run preview    # serve the built output
npm run lint       # oxlint
npm test           # vitest, single run
npm run test:watch # vitest in watch mode

# Regenerates src/data/anagram-words.js. Needs network once; the output is
# committed, so this is only for changing the puzzle pool.
node scripts/build-anagram-words.mjs
```

Tests cover the game logic in `src/lib/`, not the components — there is no
DOM testing setup (no jsdom, no testing-library).

## Stack

React 19, Vite 8, Tailwind 3, framer-motion 12, react-router-dom 7, oxlint,
Solana wallet-adapter. Plain JavaScript with JSX — no TypeScript.

## Structure

```
index.html            font <link>s, #root mount
src/main.jsx          createRoot + BrowserRouter + StrictMode
src/App.jsx           route table
src/index.css         Tailwind directives + .btn-gold keyframes
src/components/
  Navbar.jsx          fixed pill nav, scroll-reactive translucency
  Hero.jsx            landing page: castle bg, animated canvas, plaque card
  wordle/
    Board.jsx         6x5 grid, staggered flip reveal
    Keyboard.jsx      on-screen keys, coloured by best-known letter state
    ResultModal.jsx   outcome, stats, distribution, share, countdown
  anagrams/
    LetterPool.jsx    the seven tiles, dimmed as the current word consumes them
    FoundList.jsx     found words by length; reveals the misses once time is up
    ResultModal.jsx   outcome, stats, missed words, share, next round
  wallet/
    WalletProviders.jsx  Solana adapter context; wraps the whole app
    WalletButton.jsx     the gold connect/disconnect pill
    PlayerProfile.jsx    address, total points, per-game breakdown
src/pages/
  GameHub.jsx         /games — swipeable carousel of game cards
  Wordle.jsx          /games/wordle — the daily puzzle
  Anagrams.jsx        /games/anagrams — the daily letter pool
  Leaderboard.jsx     /leaderboard — game switcher, own record + global tab
src/lib/
  day.js              shared day clock (epoch, rollover, stride picker)
  wordle.js           scoring, daily word, key states, share text (pure)
  wordle.test.js      vitest suite for the above
  anagrams.js         pool, validation, scoring, share text (pure)
  anagrams.test.js    vitest suite for the above
  session.js          daily round allowance + the shuffled no-repeat walk
  session.test.js     vitest suite for the above
  player.js           wallet address helpers (shortening, display name)
  storage.js          localStorage progress + stats, keyed by (day, round)
  leaderboard.js      per-game points, summaries, swappable async score source
  leaderboard.test.js vitest suite for the above
src/data/
  words.js            wordle answer pool and accepted-guess list
  anagram-words.js    generated: daily pools and their solutions
scripts/
  build-anagram-words.mjs  regenerates the above
public/               background images and social icons (referenced as /name.png)
```

Routes live in `App.jsx`. There is no catch-all, so an unmatched path renders
a blank page.

## The Wordle game

Logic in `src/lib/wordle.js` is pure and tested; the components hold no rules.
Change scoring or word selection there, and run `npm test`.

**The daily word** comes from `answerForDay(dayIndex())`. `dayIndex` now lives
in `src/lib/day.js`, shared with Anagrams so puzzle #412 means the same date in
both games; `wordle.js` re-exports it, so existing imports still work. It counts
days since a fixed epoch, rolling over at the player's local midnight.
`answerForDay` steps through `ANSWERS` by a prime stride so consecutive days
aren't adjacent in the list. Both the epoch and the stride are load-bearing:
changing either reshuffles every future puzzle. Likewise, only ever *append*
to `ANSWERS` — inserting or reordering shifts every word after it.

**Repeated letters** are the tricky part of scoring. A letter only comes back
`present` if the answer still has an unclaimed copy after exact matches are
assigned. `scoreGuess` does exact matches in a first pass, then fills in
present from what's left. The tests cover the cases that usually break this.

**Progress and stats** persist to localStorage under `glyphix.wordle.*`.
Every access is wrapped in try/catch, since storage throws in private
browsing — the game must stay playable without it. Restored rows render
already-scored and skip the flip, via the `instantRows` prop on `Board`.

**Stats are recorded once** per finished game, guarded by a `recorded` ref in
`Wordle.jsx`. A game already finished when the page loads is marked as
recorded on mount so a refresh can't inflate the numbers.

The answer is derived client-side, so a determined player can read it out of
devtools. Fixing that needs a server, which the project doesn't have yet.

## The Anagrams game

Logic in `src/lib/anagrams.js` is pure and tested; the components hold no rules.

**Each puzzle carries two word lists, and the split is the whole design.**
`src/data/anagram-words.js` gives every pool a wide `words` set and a common
`target` subset, generated by `scripts/build-anagram-words.mjs`:

- `words` — every real word the pool makes, from ENABLE (the standard
  word-game dictionary: no proper nouns, no abbreviations). **Submissions are
  checked against this**, so ordinary words are never rejected.
- `target` — the common subset. The denominator for progress, the basis for
  `maxScore`, and what the end-of-round "missed" reveal lists.

One list cannot do both jobs. The first cut scored and validated against a
10k common-word list, which rejected **74% of valid words** — `nadir`,
`railed`, `derail` all bounced. But validating against the wide list alone
makes the progress bar crawl and turns the missed-word reveal into a wall of
obscurities. Hence the split, which mirrors wordle's own `ANSWERS` vs
`VALID_GUESSES` in `words.js`.

**Bonus words** — accepted but outside the target — score normally and are
counted separately in the UI, so the fraction can never read "72/69". They can
push a round past `maxScore`; the leaderboard clamps to 100, and overshooting
is meant to feel like a reward.

Precomputing per puzzle keeps the data at ~143KB instead of the ~600KB a
3-7 letter dictionary costs, and makes validation a Set lookup.

The data file is generated — don't hand-edit it, and only ever *append*, since
`puzzleForDay` indexes it by a stride like the wordle answers do. Re-running
the script with different filters reselects which pools ship, which changes
every day's puzzle.

**A round is won by finding a word that uses all seven letters.** Every
generated puzzle is checked to have one, so the goal is always reachable — this
is a far better target than "find them all", which almost nobody does. Finding
everything is still possible and pays the maximum.

**The clock is stored as an absolute deadline**, not a remaining duration, and
is persisted the moment the round opens. Both details matter: either one alone
would let a reload hand back time that had already run out. `ROUND_SECONDS` is
60. The page holds the remainder in *milliseconds* and ticks every 250ms, and
the clock bar's CSS transition is exactly one tick long — that pairing is what
makes the bar drain continuously instead of stepping once a second.

**Anagrams keeps no stats store.** It came along after the leaderboard could
summarise a game on its own, so `Wordle.jsx`'s pattern of a parallel
`glyphix.wordle.stats` is *not* mirrored — the modal reads
`leaderboard.summary('anagrams')` instead, so there is no second copy to drift.

## Continuous rounds

Both games are **no longer one-puzzle-per-day**. A day is an allowance of
rounds, and `src/lib/session.js` owns it:

```js
{ day, played, round, seed, cursor, index }   // at glyphix.<game>.session
```

- **`MAX_ROUNDS_PER_DAY` is 50.** Spend them and the page renders a
  "that's all for today" panel instead of a board — there is no pool to show,
  since the next one belongs to tomorrow's walk.
- **Rounds walk a shuffled permutation, not a stride.** `permutation(length,
  seed)` is a seeded Fisher-Yates over every pool index; `cursor` steps through
  it. That is what makes a 50-round session repeat-free, which a stride over a
  300-entry list cannot promise once you take 50 steps from an arbitrary
  offset. Only `seed` and `cursor` are stored — the permutation is rebuilt on
  demand, which is why the shuffle must be deterministic.
- **Exhausting the pool reshuffles under `seed + 1`**, so the second pass
  through 300 pools is in a different order than the first.
- **The walk survives midnight; the counter does not.** `rollOver` resets
  `played` and `round` on a new day but keeps `seed`/`cursor`, so yesterday's
  pools don't come back today.
- **`played` only advances on `completeRound`**, never on `startRound` —
  abandoning a round mid-way must not burn one of the fifty.
- `currentRound()` returns `null` once the allowance is spent — that null is
  what the limit UI keys on, so don't paper over it with a fallback round.

**The puzzle comes from the round, not the day.** `puzzleAt(index)` and
`answerForIndex(index)` replaced the day-derived pickers; `dayIndex()` now only
feeds the allowance and the leaderboard's day column. `puzzleForDay` and
`answerForDay` are still exported and still tested — they define the shuffle's
domain — but no page calls them.

**Progress is keyed by `(day, round)`.** `loadProgress(day, round)` returns
nothing for a round it wasn't saved under, so a reload mid-round resumes that
round and a new round starts clean. `Wordle.jsx`'s `instantRows` ref is
*mutable* and reset to 0 on each new round — read it as `instantRows.current`,
since a ref frozen at mount would replay the previous round's reveal skip.

## Wallets

Solana wallet-adapter (`@solana/wallet-adapter-react` + `base` + `web3.js`),
mounted as `WalletProviders` around the router in `main.jsx`.

**Recording is gated on a connected wallet.** No wallet, no leaderboard row —
the round still plays and still shows its summary, and the modal says
"Not saved". There is deliberately no anonymous local identity: a server-side
board needs something to key a row on, and inventing a device ID now would
mean migrating it away later.

**`autoConnect` is on and no wallet adapters are listed explicitly.** Modern
wallets register themselves through the Wallet Standard, so the array is empty
on purpose — adding hardcoded adapters would double-list every wallet.

**The connect UI is hand-rolled**, not `@solana/wallet-adapter-react-ui`. That
package ships its own CSS, which the codebase's inline-style convention has no
place for. `WalletButton.jsx` is a gold pill matching the rest of the site.

`npm audit` reports vulnerabilities in the adapter's transitive tree
(`react-native`, `trezor`). Those paths are dev-only tooling and the build
proves it: no `react-native` or `trezor` string reaches `dist/`. Solana is
split into its own ~399KB chunk via `manualChunks` in `vite.config.js` so the
landing page doesn't pay for it.

## The leaderboard

`src/lib/leaderboard.js` is built around a **swappable source** — the seam a
backend plugs into later. Every method takes the game as its first argument,
since a networked source needs to know which board it is talking about:

```js
{ id, canRank, submit(game, result), history(game, limit), summary(game), ranking(game, day) }
```

`createLocalSource()` is the only implementation today, backed by
localStorage. `setLeaderboardSource(source)` swaps it. Call sites use the
`leaderboard` facade and never touch a source directly — either as
`leaderboard.submit('wordle', result)` or, for a page pinned to one game,
`leaderboard.for('anagrams')`.

**Every method is async** even though the local one never awaits. That is
deliberate and load-bearing: it is what lets a networked source drop in
without editing a single caller. Keep new methods async for the same reason.

**Adding a game means adding one entry to `GAMES`** and nothing else. Storage
key, scoring, entry validation, and the shape of the stats panel all come from
that object, and the Leaderboard page renders whatever it declares.

**Wordle deliberately keeps the un-suffixed storage key**
(`glyphix.leaderboard.history`). It predates the per-game split, so leaving the
key alone means no existing player record had to be migrated. Anagrams uses
`glyphix.leaderboard.history.anagrams`. Don't "tidy" this into a matching pair —
that would orphan every record saved before the split.

**Games normalise to the same 0-100 points scale.** Wordle scores from the
`POINTS_BY_GUESS` table; anagrams scores completion against the round's own
maximum, plus a bonus for the all-letters word. Normalising is what keeps a
20-word pool and a 70-word pool worth the same, and what would make a combined
cross-game ranking mean anything.

**The local source returns `null` from `ranking()`** rather than inventing
rival players, and `canRank` is false. The Global tab renders an explanatory
empty state off that. Do not seed fake players to fill the space — the whole
point of the shape is that the UI degrades honestly until a backend exists.

**Summaries are derived, never stored.** `summarise(entries)` is pure and
recomputes points, win rate, distribution, and streaks from the history rows,
so corrupt or partial data can't leave the totals disagreeing with the rows
beneath them. Streaks count consecutive *puzzle days* — a skipped day breaks
a streak even if every game played was won.

**`submit()` replaces a round rather than appending.** Identity is
`(day, round)` via `roundKey`, not the day alone — days hold up to 50 rounds
now and they must stack. Re-submitting the *same* round still replaces, which
is the double-count protection the original day-level replace provided. Both
game pages also guard with a `recorded` ref, so there are two independent
defences. Entries written before continuous play have no `round`; `roundKey`
treats a missing one as round 0 rather than orphaning the row.

**Streaks collapse to days before counting.** A day counts as won if *any*
round that day was won, so one lost round can't wipe a streak earned earlier
the same day. A skipped day still breaks it.

`HISTORY_LIMIT` is 2000 — at 50 rounds a day the old 200 held four days.

Points come from the `POINTS_BY_GUESS` table — a table rather than a formula
so the curve can be tuned in one place, and so a backend can mirror it.

**Wiring a backend** means: implement the five members against your API,
call `setLeaderboardSource()` once at startup, and return a real object from
`ranking()`. `RankingTable` in `Leaderboard.jsx` already renders that shape
(`{ day, entries: [{ id, rank, name, guessCount, points, isYou }] }`) and is
otherwise unused.

## Conventions

**Styling is inline style objects, not Tailwind.** Despite Tailwind being
configured, only a handful of `className` attributes exist in the codebase.
Match the surrounding file: build a `style={{}}` object rather than reaching
for utility classes.

**Gold is `#E6B800`**, with `#C9A000` as the gradient partner and `#8B6914`
for borders. `tailwind.config.js` defines a `gold` color scale, but nothing
references it — the hex values are hardcoded throughout.

**Wordle tile colors** are `#538d4e` (correct), `#b59f3b` (present),
`#787c7e` (absent), exported as `STATE_COLORS` from `src/lib/wordle.js` and
duplicated as `TILE_COLORS` in `GameHub.jsx` for the card previews.

**Fonts:** Cinzel (serif display — headings, logo, tiles), Poppins (body and
buttons), Press Start 2P (the Hero logo lettering only), Playfair Display
italic (the Hero subtitle). All loaded from Google Fonts in `index.html` and
referenced by name in style objects.

**Animation** is framer-motion. Entrance animations use
`initial`/`animate` with a staggered `delay` derived from index
(`delay: index * 0.1`). The carousel uses `AnimatePresence` with
`mode="wait"` and a `direction` state for slide direction.

**`.btn-gold`** in `index.css` applies a shimmer + float loop to gold buttons;
add the class alongside the inline styles.

## Known gaps

Read these before assuming something is broken by your change:

- The two "coming soon" games have no routes, but their cards don't
  navigate, so nothing dead-ends.
- Anagrams ships 300 pools and Wordle 816 answers. At 50 rounds a day that is
  6 days and 16 days before the shuffle wraps and reshuffles. Growing the pools
  is the real fix; `scripts/build-anagram-words.mjs` can emit more by relaxing
  its target-size band.
- Anagram validation uses ENABLE, so a very obscure or dialect word can still
  be rejected. Widen the source in the build script rather than special-casing.
- Scores are per-device even though a wallet is required. The address is
  stamped on each entry, but `createLocalSource` does not partition storage by
  it — two wallets on one device share a history, and the same wallet on two
  devices has two. A networked source keyed on the address is what fixes it.
- Both games derive their answer client-side, so a determined player can read
  the word or the full solution list out of devtools. Fixing that needs a
  server, which the project doesn't have yet.
- `GameCard` in `GameHub.jsx` is defined but never rendered — the carousel
  inlines its own near-duplicate markup.
- GameHub reimplements the navbar inline instead of reusing `Navbar.jsx`, and
  its "Connected" pill is still hardcoded — only `Navbar.jsx` has the real
  `WalletButton`.
- `src/App.css` is empty and never imported. `src/assets/` is unused —
  backgrounds load from `public/`.
- The Hero canvas ignores `devicePixelRatio`, so tiles are soft on high-DPI
  displays.
- The Solana RPC endpoint is devnet and unused — nothing on-chain happens yet.
  Swap it for a paid mainnet RPC before token rewards are real.

## Deployment

None configured. The remote is `github.com/Tommy9ls/glyphix`, but there is no
CI workflow and no hosting provider set up, so pushing does not publish
anything.
