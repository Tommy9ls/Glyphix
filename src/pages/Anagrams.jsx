import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useWallet } from '@solana/wallet-adapter-react'
import LetterPool from '../components/anagrams/LetterPool'
import FoundList from '../components/anagrams/FoundList'
import ResultModal from '../components/anagrams/ResultModal'
import {
  ALREADY_FOUND,
  MIN_WORD_LENGTH,
  NOT_IN_POOL,
  PUZZLE_COUNT,
  ROUND_SECONDS,
  TOO_SHORT,
  UNKNOWN_WORD,
  arrangeLetters,
  isComplete,
  isWon,
  maxScore,
  puzzleAt,
  roundResult,
  splitFound,
  submitWord,
  totalScore,
} from '../lib/anagrams'
import { completeRound, currentRound, loadSession, roundsLeft } from '../lib/session'
import { dayIndex } from '../lib/day'
import { loadAnagramProgress, saveAnagramProgress } from '../lib/storage'
import { leaderboard } from '../lib/leaderboard'

const GOLD = '#E6B800'

// How often the clock re-reads the deadline. Also the CSS transition duration
// for the clock bar, so the two stay in step and the bar drains continuously
// rather than jumping a notch per tick.
const TICK_MS = 250

// A 60-second round makes the old 30s warning half the game, so the red zone is
// the last quarter.
const LOW_TIME_SECONDS = 15

const REJECTION_MESSAGES = {
  [TOO_SHORT]: `At least ${MIN_WORD_LENGTH} letters`,
  [NOT_IN_POOL]: 'Not in the pool',
  [ALREADY_FOUND]: 'Already found',
  [UNKNOWN_WORD]: 'Not in word list',
}

function Toast({ message }) {
  return (
    <AnimatePresence>
      {message && (
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
          style={{
            position: 'fixed',
            top: 88,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 90,
            padding: '10px 20px',
            borderRadius: 999,
            background: 'rgba(20,18,12,0.92)',
            border: '1px solid rgba(230,184,0,0.4)',
            color: '#fff',
            fontSize: 13,
            fontWeight: 600,
            fontFamily: 'Poppins, sans-serif',
            boxShadow: '0 8px 30px rgba(0,0,0,0.45)',
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
          }}
        >
          {message}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function formatClock(seconds) {
  const safe = Math.max(0, seconds)
  return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, '0')}`
}

function Anagrams() {
  const navigate = useNavigate()
  const { connected, publicKey } = useWallet()

  // Fixed for the lifetime of the page, matching Wordle: a player who leaves
  // the tab open across midnight keeps today's day number until they reload.
  const day = useMemo(() => dayIndex(), [])

  // The round owns the pool now — rounds walk a shuffled permutation, so
  // nothing is derived from the day beyond the daily allowance.
  const [session, setSession] = useState(() =>
    currentRound('anagrams', PUZZLE_COUNT, loadSession('anagrams', day)),
  )
  const limitReached = session === null
  const round = session?.round ?? 0
  const puzzle = useMemo(() => puzzleAt(session?.index ?? 0), [session])

  const restored = useMemo(() => loadAnagramProgress(day, round), [day, round])

  const [found, setFound] = useState(restored.found)
  const [finished, setFinished] = useState(restored.finished)
  const [seed, setSeed] = useState(day + round)
  const [picked, setPicked] = useState([])
  const [toast, setToast] = useState('')
  const [shake, setShake] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [summary, setSummary] = useState(null)
  const [endReason, setEndReason] = useState(restored.finished ? 'time' : null)
  // Set when a finished round could not be saved for want of a wallet.
  const [unsaved, setUnsaved] = useState(false)

  // The deadline is absolute, so a reload resumes the same round rather than
  // restarting the clock. A round with no saved deadline is starting now.
  const [endsAt, setEndsAt] = useState(() => restored.endsAt ?? Date.now() + ROUND_SECONDS * 1000)
  // Held in milliseconds, not whole seconds: the clock bar interpolates between
  // ticks, and a value that only changed once a second would step visibly.
  const [remainingMs, setRemainingMs] = useState(() => Math.max(0, endsAt - Date.now()))

  // Guards against double-submitting a finished round to the leaderboard.
  const recorded = useRef(false)
  const toastTimer = useRef(null)

  const arrangement = useMemo(() => arrangeLetters(puzzle.letters, seed), [puzzle, seed])

  useEffect(() => () => clearTimeout(toastTimer.current), [])

  const showToast = useCallback((message, ms = 1400) => {
    setToast(message)
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(''), ms)
  }, [])

  const reject = useCallback(
    (message) => {
      showToast(message)
      setShake(true)
      setTimeout(() => setShake(false), 420)
    },
    [showToast],
  )

  /** End the round, record it once, and show the summary. */
  const finish = useCallback(
    (words, reason) => {
      setFinished(true)
      setEndReason(reason)
      saveAnagramProgress(day, round, { found: words, endsAt, finished: true })

      if (!recorded.current) {
        recorded.current = true
        // A round only reaches the leaderboard with a wallet attached — there
        // is no anonymous identity for a server-side board to key it on.
        if (connected && publicKey) {
          // Fire-and-forget: the leaderboard is a side record, and a storage
          // failure here shouldn't interrupt the end of the round.
          leaderboard
            .submit('anagrams', {
              ...roundResult(words, puzzle, day),
              round,
              wallet: publicKey.toBase58(),
            })
            .then(() => leaderboard.summary('anagrams'))
            .then(setSummary)
            .catch(() => {})
        } else {
          setUnsaved(true)
        }
      }
      setTimeout(() => setModalOpen(true), 350)
    },
    [connected, day, endsAt, publicKey, puzzle, round],
  )

  /** Clear the board and draw the next pool from the player's shuffled walk. */
  const nextRound = useCallback(() => {
    const advanced = completeRound('anagrams', session)
    const started = currentRound('anagrams', PUZZLE_COUNT, { ...advanced, index: null })
    if (!started) {
      setSession(null)
      setModalOpen(false)
      return
    }
    const freshEndsAt = Date.now() + ROUND_SECONDS * 1000
    recorded.current = false
    setModalOpen(false)
    setUnsaved(false)
    setFound([])
    setPicked([])
    setFinished(false)
    setEndReason(null)
    setEndsAt(freshEndsAt)
    setRemainingMs(ROUND_SECONDS * 1000)
    setSeed(day + started.round)
    setSession(started)
    saveAnagramProgress(day, started.round, { found: [], endsAt: freshEndsAt, finished: false })
  }, [day, session])

  // Persist the deadline the moment the round opens. Without this a player who
  // reloads before finding a word would be handed a brand new clock.
  useEffect(() => {
    if (restored.endsAt === null && !restored.finished) {
      saveAnagramProgress(day, round, { found: restored.found, endsAt, finished: false })
    }
  }, [day, endsAt, restored, round])

  // A round already finished when the page loaded was recorded in the session
  // that finished it — mark it so a refresh can't re-submit, and pull the
  // stored stats so the modal still has something to show.
  useEffect(() => {
    if (!restored.finished) return
    recorded.current = true
    leaderboard.summary('anagrams').then(setSummary).catch(() => {})
  }, [restored.finished])

  // The clock. Recomputed from the deadline rather than decremented, so a
  // backgrounded tab that stops firing timers still lands on the right value.
  useEffect(() => {
    if (finished) return undefined
    const id = setInterval(() => {
      const left = Math.max(0, endsAt - Date.now())
      setRemainingMs(left)
      if (left <= 0) finish(found, 'time')
    }, TICK_MS)
    return () => clearInterval(id)
  }, [endsAt, finished, finish, found])

  const current = useMemo(() => picked.map((i) => arrangement[i]).join(''), [picked, arrangement])
  const used = useMemo(
    () => arrangement.map((_, i) => picked.includes(i)),
    [arrangement, picked],
  )

  const pick = useCallback(
    (index) => {
      if (finished) return
      setPicked((prev) => (prev.includes(index) ? prev : [...prev, index]))
    },
    [finished],
  )

  /** Type a letter: consume the first matching tile that is still free. */
  const pickLetter = useCallback(
    (letter) => {
      if (finished) return
      setPicked((prev) => {
        const index = arrangement.findIndex((l, i) => l === letter && !prev.includes(i))
        return index === -1 ? prev : [...prev, index]
      })
    },
    [arrangement, finished],
  )

  const submit = useCallback(() => {
    if (finished || !picked.length) return

    const outcome = submitWord(current, puzzle, found)
    if (!outcome.ok) {
      reject(REJECTION_MESSAGES[outcome.reason] ?? 'Not a word')
      return
    }

    const next = [...found, outcome.word]
    setFound(next)
    setPicked([])
    saveAnagramProgress(day, round, { found: next, endsAt, finished: false })
    showToast(`${outcome.word.toUpperCase()} +${outcome.points}`, 1000)

    if (isComplete(next, puzzle)) finish(next, 'complete')
  }, [current, day, endsAt, finish, finished, found, picked, puzzle, reject, round, showToast])

  // Physical keyboard. Ignored while the result panel is open so Escape belongs
  // to the dialog rather than the pool.
  useEffect(() => {
    const handler = (e) => {
      if (modalOpen) {
        if (e.key === 'Escape') setModalOpen(false)
        return
      }
      if (e.ctrlKey || e.metaKey || e.altKey) return
      if (e.key === 'Enter') submit()
      else if (e.key === 'Backspace') setPicked((p) => p.slice(0, -1))
      else if (e.key === 'Escape') setPicked([])
      else if (/^[a-z]$/i.test(e.key)) pickLetter(e.key.toLowerCase())
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [modalOpen, pickLetter, submit])

  const score = totalScore(found)
  const best = maxScore(puzzle)
  const won = isWon(found, puzzle)
  // Bonus words score but don't move the denominator, so the fraction can never
  // read "72/69" — the extras are called out beside it instead.
  const { target: targetFound, bonus: bonusFound } = splitFound(found, puzzle)
  const remaining = Math.ceil(remainingMs / 1000)
  const lowTime = !finished && remaining <= LOW_TIME_SECONDS
  // Clamped, since a round restored from storage may predate a change to
  // ROUND_SECONDS and would otherwise overflow the track.
  const timeLeftPercent = finished
    ? 0
    : Math.max(0, Math.min(100, (remainingMs / (ROUND_SECONDS * 1000)) * 100))

  return (
    <div
      style={{
        minHeight: '100vh',
        position: 'relative',
        overflowX: 'hidden',
        fontFamily: 'Poppins, sans-serif',
      }}
    >
      {/* Background, matching the game hub */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          backgroundImage: "url('/gamehub_bg.png')",
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          filter: 'blur(3px) brightness(0.6)',
          transform: 'scale(1.05)',
          zIndex: 0,
        }}
      />
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1 }} />

      <div
        style={{
          position: 'relative',
          zIndex: 5,
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100vh',
          maxWidth: 560,
          margin: '0 auto',
          padding: '16px 16px 24px',
          boxSizing: 'border-box',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 16px',
            borderRadius: 999,
            background: 'rgba(255,255,255,0.12)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: '1px solid rgba(255,255,255,0.2)',
            boxShadow: '0 4px 30px rgba(0,0,0,0.2)',
            gap: 12,
          }}
        >
          <button
            type="button"
            onClick={() => navigate('/games')}
            aria-label="Back to games"
            style={{
              background: 'transparent',
              border: 'none',
              color: '#fff',
              fontSize: 20,
              cursor: 'pointer',
              lineHeight: 1,
              padding: 4,
            }}
          >
            ←
          </button>

          <div style={{ textAlign: 'center', lineHeight: 1.2 }}>
            <div
              style={{
                fontFamily: "'Cinzel', serif",
                fontSize: 18,
                fontWeight: 700,
                color: '#fff',
                textShadow: '0 2px 8px rgba(0,0,0,0.4)',
              }}
            >
              Anagrams
            </div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.55)', letterSpacing: '0.06em' }}>
              ROUND {round + 1} · {roundsLeft(session ?? { played: 0 })} LEFT TODAY
            </div>
          </div>

          <button
            type="button"
            onClick={() => setModalOpen(true)}
            aria-label="Statistics"
            style={{
              background: 'transparent',
              border: 'none',
              color: finished ? GOLD : 'rgba(255,255,255,0.75)',
              fontSize: 17,
              cursor: 'pointer',
              lineHeight: 1,
              padding: 4,
            }}
          >
            📊
          </button>
        </div>

        <Toast message={toast} />

        {/*
          The daily allowance is spent. The board is left out entirely rather
          than shown disabled — there is no pool to reveal, since the next one
          belongs to tomorrow's walk.
        */}
        {limitReached && (
          <div
            style={{
              marginTop: 40,
              padding: '32px 24px',
              borderRadius: 18,
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(230,184,0,0.25)',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                fontFamily: "'Cinzel', serif",
                fontSize: 22,
                fontWeight: 700,
                color: GOLD,
              }}
            >
              That&apos;s all for today
            </div>
            <div
              style={{
                marginTop: 10,
                fontSize: 13,
                lineHeight: 1.6,
                color: 'rgba(255,255,255,0.7)',
                fontFamily: 'Poppins, sans-serif',
              }}
            >
              You have played every round for day {day}. Fresh pools land at
              midnight.
            </div>
            <button
              type="button"
              onClick={() => navigate('/leaderboard')}
              className="btn-gold"
              style={{
                marginTop: 22,
                padding: '12px 28px',
                background: `linear-gradient(135deg, ${GOLD}, #C9A000)`,
                color: '#1a1a1a',
                fontWeight: 700,
                fontSize: 12,
                border: '2px solid #8B6914',
                borderRadius: 999,
                cursor: 'pointer',
                fontFamily: 'Poppins, sans-serif',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
              }}
            >
              View Leaderboard
            </button>
          </div>
        )}

        {!limitReached && (
          <>
        {/* Clock, score, progress */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            marginTop: 14,
            padding: '12px 18px',
            borderRadius: 16,
            background: 'rgba(255,255,255,0.07)',
            border: '1px solid rgba(255,255,255,0.14)',
          }}
        >
          <div>
            <div style={{ fontSize: 10, letterSpacing: '0.12em', color: 'rgba(255,255,255,0.5)' }}>
              TIME
            </div>
            <motion.div
              animate={lowTime ? { scale: [1, 1.08, 1] } : { scale: 1 }}
              transition={lowTime ? { duration: 1, repeat: Infinity } : { duration: 0.2 }}
              style={{
                fontFamily: "'Cinzel', serif",
                fontSize: 26,
                fontWeight: 700,
                color: lowTime ? '#e05a4a' : '#fff',
                lineHeight: 1.1,
              }}
            >
              {finished ? '0:00' : formatClock(remaining)}
            </motion.div>
          </div>

          <div style={{ flex: 1, padding: '0 4px' }}>
            {/*
              Two bars, because they answer different questions: the top one
              drains with the clock, the bottom one fills with score. The clock
              bar transitions linearly over exactly one tick, so it creeps
              continuously instead of stepping once a second.
            */}
            <div
              style={{
                height: 6,
                borderRadius: 999,
                background: 'rgba(255,255,255,0.14)',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: `${timeLeftPercent}%`,
                  background: lowTime
                    ? 'linear-gradient(90deg, #e05a4a, #c0392b)'
                    : `linear-gradient(90deg, ${GOLD}, #C9A000)`,
                  transition: `width ${TICK_MS}ms linear, background 0.3s ease`,
                }}
              />
            </div>

            <div
              style={{
                height: 3,
                borderRadius: 999,
                background: 'rgba(255,255,255,0.1)',
                overflow: 'hidden',
                marginTop: 4,
              }}
            >
              <motion.div
                animate={{ width: `${best ? Math.min(100, (score / best) * 100) : 0}%` }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
                style={{ height: '100%', background: 'rgba(230,184,0,0.55)' }}
              />
            </div>

            <div
              style={{
                fontSize: 11,
                color: 'rgba(255,255,255,0.55)',
                marginTop: 5,
                textAlign: 'center',
              }}
            >
              {targetFound.length}/{puzzle.target.size} words
              {bonusFound.length > 0 && (
                <span style={{ color: GOLD }}> · +{bonusFound.length} bonus</span>
              )}
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 10, letterSpacing: '0.12em', color: 'rgba(255,255,255,0.5)' }}>
              SCORE
            </div>
            <div
              style={{
                fontFamily: "'Cinzel', serif",
                fontSize: 26,
                fontWeight: 700,
                color: GOLD,
                lineHeight: 1.1,
              }}
            >
              {score}
            </div>
          </div>
        </div>

        {/* Current word */}
        <motion.div
          animate={shake ? { x: [0, -8, 8, -6, 6, 0] } : { x: 0 }}
          transition={{ duration: 0.42 }}
          style={{
            minHeight: 52,
            margin: '22px 0 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            letterSpacing: '0.22em',
            fontFamily: "'Cinzel', serif",
            fontSize: 30,
            fontWeight: 700,
            color: '#fff',
            textTransform: 'uppercase',
            textShadow: '0 2px 10px rgba(0,0,0,0.5)',
          }}
        >
          {current || <span style={{ opacity: 0.25, fontSize: 15 }}>tap or type letters</span>}
        </motion.div>

        <LetterPool letters={arrangement} used={used} onPick={pick} disabled={finished} />

        {/* Controls */}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 18 }}>
          <button
            type="button"
            onClick={() => {
              setPicked([])
              setSeed((s) => s + 1)
            }}
            disabled={finished}
            style={{
              padding: '10px 18px',
              borderRadius: 999,
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.22)',
              color: '#fff',
              fontSize: 12,
              fontWeight: 600,
              fontFamily: 'Poppins, sans-serif',
              cursor: finished ? 'default' : 'pointer',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              opacity: finished ? 0.4 : 1,
            }}
          >
            Shuffle
          </button>
          <button
            type="button"
            onClick={() => setPicked((p) => p.slice(0, -1))}
            disabled={finished || !picked.length}
            style={{
              padding: '10px 18px',
              borderRadius: 999,
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.22)',
              color: '#fff',
              fontSize: 12,
              fontWeight: 600,
              fontFamily: 'Poppins, sans-serif',
              cursor: finished || !picked.length ? 'default' : 'pointer',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              opacity: finished || !picked.length ? 0.4 : 1,
            }}
          >
            Delete
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={finished || !picked.length}
            className="btn-gold"
            style={{
              padding: '10px 26px',
              borderRadius: 999,
              background: `linear-gradient(135deg, ${GOLD}, #C9A000)`,
              border: '2px solid #8B6914',
              color: '#1a1a1a',
              fontSize: 12,
              fontWeight: 700,
              fontFamily: 'Poppins, sans-serif',
              cursor: finished || !picked.length ? 'default' : 'pointer',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              opacity: finished || !picked.length ? 0.5 : 1,
            }}
          >
            Enter
          </button>
        </div>

        {/* Found words */}
        <div
          style={{
            flex: 1,
            marginTop: 22,
            padding: '16px 18px',
            borderRadius: 16,
            background: 'rgba(0,0,0,0.28)',
            border: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          <FoundList found={found} puzzle={puzzle} />
        </div>

        {finished && !modalOpen && (
          <motion.button
            type="button"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={() => setModalOpen(true)}
            style={{
              margin: '16px auto 0',
              padding: '8px 22px',
              borderRadius: 999,
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(230,184,0,0.4)',
              color: '#fff',
              fontSize: 12,
              fontWeight: 600,
              fontFamily: 'Poppins, sans-serif',
              cursor: 'pointer',
              letterSpacing: '0.04em',
            }}
          >
            View results
          </motion.button>
        )}
          </>
        )}
      </div>

      <ResultModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onViewLeaderboard={() => navigate('/leaderboard')}
        onNextRound={nextRound}
        roundsLeft={roundsLeft(session ?? { played: 0 })}
        unsaved={unsaved}
        found={found}
        puzzle={puzzle}
        day={day}
        round={round}
        won={won}
        reason={endReason}
        summary={summary}
      />
    </div>
  )
}

export default Anagrams
