import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useWallet } from '@solana/wallet-adapter-react'
import Board from '../components/wordle/Board'
import Keyboard from '../components/wordle/Keyboard'
import ResultModal from '../components/wordle/ResultModal'
import {
  WORD_LENGTH,
  MAX_GUESSES,
  ANSWER_COUNT,
  answerForDay,
  answerForIndex,
  dayIndex,
  gameStatus,
  isValidGuess,
  keyStates,
  scoreGuess,
} from '../lib/wordle'
import { completeRound, currentRound, loadSession, roundsLeft } from '../lib/session'
import { loadProgress, loadStats, recordGame, saveProgress } from '../lib/storage'
import { leaderboard } from '../lib/leaderboard'

const GOLD = '#E6B800'

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

function Wordle() {
  const navigate = useNavigate()
  const { connected, publicKey } = useWallet()

  // Fixed for the lifetime of the page. A player who leaves the tab open
  // across midnight keeps today's day number until they reload, which is
  // simpler than swapping the board out from under them mid-guess.
  const day = useMemo(() => dayIndex(), [])

  // The round owns the answer now: rounds walk a shuffled permutation of the
  // pool, so nothing is derived from the day beyond the daily allowance.
  const [session, setSession] = useState(() =>
    currentRound('wordle', ANSWER_COUNT, loadSession('wordle', day)),
  )
  const limitReached = session === null
  const round = session?.round ?? 0
  const answer = useMemo(
    () => (session ? answerForIndex(session.index) : answerForDay(day)),
    [session, day],
  )

  const restored = useMemo(() => loadProgress(day, round), [day, round])
  const [guesses, setGuesses] = useState(restored)
  const [current, setCurrent] = useState('')
  const [stats, setStats] = useState(loadStats)
  const [toast, setToast] = useState('')
  const [shake, setShake] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  // Set when a finished round could not be saved because no wallet was
  // connected, so the result panel can say so instead of failing silently.
  const [unsaved, setUnsaved] = useState(false)

  // Rows restored from storage render already-scored, with no flip animation.
  // Mutable so a fresh round animates from empty again.
  const instantRows = useRef(restored.length)
  // Guards against double-counting a finished game in the stats.
  const recorded = useRef(false)
  const toastTimer = useRef(null)

  useEffect(() => () => clearTimeout(toastTimer.current), [])

  const status = gameStatus(guesses, answer)
  const finished = status !== 'playing'
  // The reveal animation runs for a beat after the last guess; input stays
  // locked until it finishes so keystrokes can't land on a flipping row.
  const [revealing, setRevealing] = useState(false)

  const showToast = useCallback((message, ms = 1600) => {
    setToast(message)
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(''), ms)
  }, [])

  const submit = useCallback(() => {
    if (current.length < WORD_LENGTH) {
      showToast('Not enough letters')
      setShake(true)
      setTimeout(() => setShake(false), 450)
      return
    }
    if (!isValidGuess(current)) {
      showToast('Not in word list')
      setShake(true)
      setTimeout(() => setShake(false), 450)
      return
    }

    const next = [...guesses, current]
    setGuesses(next)
    setCurrent('')
    saveProgress(day, round, next)

    // Board reveal is 5 staggered flips; hold input until the last one lands.
    setRevealing(true)
    const revealMs = (WORD_LENGTH - 1) * 250 + 500
    setTimeout(() => setRevealing(false), revealMs)

    const outcome = gameStatus(next, answer)
    if (outcome !== 'playing' && !recorded.current) {
      recorded.current = true
      const won = outcome === 'won'
      setStats((prev) => recordGame(prev, { day, won, guessCount: next.length }))

      // A round only reaches the leaderboard with a wallet attached — there is
      // no anonymous identity for a server-side board to hang it on later.
      if (connected && publicKey) {
        // Fire-and-forget: the leaderboard is a side record, and a storage
        // failure here shouldn't interrupt the end of the game.
        leaderboard
          .submit('wordle', {
            day,
            round,
            won,
            guessCount: next.length,
            answer,
            wallet: publicKey.toBase58(),
          })
          .catch(() => {})
      } else {
        setUnsaved(true)
      }
      // Let the tiles finish flipping (and the win bounce play) first.
      setTimeout(() => setModalOpen(true), revealMs + 400)
    }
  }, [answer, connected, current, day, guesses, publicKey, round, showToast])

  /** Clear the board and draw the next puzzle from the player's shuffled walk. */
  const nextRound = useCallback(() => {
    const advanced = completeRound('wordle', session)
    const started = currentRound('wordle', ANSWER_COUNT, { ...advanced, index: null })
    recorded.current = false
    instantRows.current = 0
    setModalOpen(false)
    setUnsaved(false)
    setGuesses([])
    setCurrent('')
    setRevealing(false)
    setSession(started)
  }, [session])

  const press = useCallback(
    (key) => {
      if (finished || revealing) return
      if (key === 'enter') {
        submit()
      } else if (key === 'back') {
        setCurrent((c) => c.slice(0, -1))
      } else if (/^[a-z]$/.test(key)) {
        setCurrent((c) => (c.length < WORD_LENGTH ? c + key : c))
      }
    },
    [finished, revealing, submit],
  )

  // Physical keyboard. Ignored while the result panel is open so Enter and
  // Escape belong to the dialog rather than the board.
  useEffect(() => {
    const handler = (e) => {
      if (modalOpen) {
        if (e.key === 'Escape') setModalOpen(false)
        return
      }
      if (e.ctrlKey || e.metaKey || e.altKey) return
      if (e.key === 'Enter') press('enter')
      else if (e.key === 'Backspace') press('back')
      else press(e.key.toLowerCase())
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [press, modalOpen])

  // A game already finished when the page loaded (restored from storage) was
  // recorded in the session that finished it — mark it so we don't re-count.
  useEffect(() => {
    if (gameStatus(restored, answer) !== 'playing') recorded.current = true
  }, [restored, answer])

  const rows = useMemo(() => {
    const out = []
    for (let i = 0; i < MAX_GUESSES; i++) {
      if (i < guesses.length) {
        out.push({ word: guesses[i], scores: scoreGuess(guesses[i], answer), submitted: true })
      } else if (i === guesses.length) {
        out.push({ word: current, scores: null, submitted: false, current: true })
      } else {
        out.push({ word: '', scores: null, submitted: false })
      }
    }
    return out
  }, [guesses, current, answer])

  const letterStates = useMemo(() => keyStates(guesses, answer), [guesses, answer])

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
              Wordle
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

        {/* Board */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px 0',
          }}
        >
          <Board rows={rows} instantRows={instantRows.current} shake={shake} status={status} />
        </div>

        {/* Result banner once the game is over */}
        {finished && !modalOpen && (
          <motion.button
            type="button"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={() => setModalOpen(true)}
            style={{
              margin: '0 auto 14px',
              padding: '8px 22px',
              borderRadius: 999,
              background: 'rgba(255,255,255,0.1)',
              border: `1px solid rgba(230,184,0,0.4)`,
              color: '#fff',
              fontSize: 12,
              fontWeight: 600,
              fontFamily: 'Poppins, sans-serif',
              cursor: 'pointer',
              letterSpacing: '0.04em',
            }}
          >
            {status === 'won' ? 'You got it — view results' : `The word was ${answer.toUpperCase()}`}
          </motion.button>
        )}

        {limitReached && (
          <div
            style={{
              margin: '24px 0',
              padding: '28px 24px',
              borderRadius: 16,
              background: 'rgba(0,0,0,0.35)',
              border: '1px solid rgba(230,184,0,0.3)',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                fontFamily: "'Cinzel', serif",
                fontSize: 20,
                fontWeight: 700,
                color: GOLD,
              }}
            >
              That&apos;s all 50 for today
            </div>
            <div
              style={{
                marginTop: 8,
                fontSize: 13,
                color: 'rgba(255,255,255,0.65)',
                lineHeight: 1.6,
              }}
            >
              You&apos;ve played every round today&apos;s allowance gives. The counter
              resets at midnight.
            </div>
          </div>
        )}

        <Keyboard states={letterStates} onPress={press} disabled={finished || revealing} />
      </div>

      <ResultModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onViewLeaderboard={() => navigate('/leaderboard')}
        onNextRound={nextRound}
        roundsLeft={roundsLeft(session ?? { played: 0 })}
        unsaved={unsaved}
        status={status}
        answer={answer}
        guesses={guesses}
        day={day}
        round={round}
        stats={stats}
      />
    </div>
  )
}

export default Wordle
