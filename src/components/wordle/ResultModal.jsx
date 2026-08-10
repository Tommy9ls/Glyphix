import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MAX_GUESSES, msUntilNextPuzzle, shareText } from '../../lib/wordle'

const GOLD = '#E6B800'

function formatCountdown(ms) {
  const total = Math.max(0, Math.floor(ms / 1000))
  const h = String(Math.floor(total / 3600)).padStart(2, '0')
  const m = String(Math.floor((total % 3600) / 60)).padStart(2, '0')
  const s = String(total % 60).padStart(2, '0')
  return `${h}:${m}:${s}`
}

function Stat({ label, value }) {
  return (
    <div style={{ textAlign: 'center', flex: 1 }}>
      <div
        style={{
          fontFamily: "'Cinzel', serif",
          fontSize: 26,
          fontWeight: 700,
          color: '#fff',
        }}
      >
        {value}
      </div>
      <div
        style={{
          fontSize: 10,
          color: 'rgba(255,255,255,0.55)',
          fontFamily: 'Poppins, sans-serif',
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          marginTop: 2,
        }}
      >
        {label}
      </div>
    </div>
  )
}

function Distribution({ distribution, highlight }) {
  const max = Math.max(1, ...distribution)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, width: '100%' }}>
      {distribution.map((count, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span
            style={{
              fontSize: 12,
              color: 'rgba(255,255,255,0.6)',
              fontFamily: 'Poppins, sans-serif',
              width: 10,
            }}
          >
            {i + 1}
          </span>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${Math.max(8, (count / max) * 100)}%` }}
            transition={{ delay: 0.15 + i * 0.05, duration: 0.4, ease: 'easeOut' }}
            style={{
              background: i === highlight ? GOLD : 'rgba(255,255,255,0.18)',
              color: i === highlight ? '#1a1a1a' : 'rgba(255,255,255,0.8)',
              borderRadius: 4,
              padding: '2px 8px',
              fontSize: 12,
              fontWeight: 700,
              fontFamily: 'Poppins, sans-serif',
              textAlign: 'right',
              minWidth: 24,
              boxSizing: 'border-box',
            }}
          >
            {count}
          </motion.div>
        </div>
      ))}
    </div>
  )
}

/**
 * End-of-game panel: outcome, stats, guess distribution, and a share button.
 *
 * Dismissible — closing it returns you to the finished board, and the header
 * keeps a button to bring it back.
 */
function ResultModal({
  open,
  onClose,
  status,
  answer,
  guesses,
  day,
  round = 0,
  stats,
  onViewLeaderboard,
  onNextRound,
  roundsLeft = 0,
  unsaved = false,
}) {
  const [remaining, setRemaining] = useState(() => msUntilNextPuzzle())
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!open) return
    setRemaining(msUntilNextPuzzle())
    const id = setInterval(() => setRemaining(msUntilNextPuzzle()), 1000)
    return () => clearInterval(id)
  }, [open])

  // Reset the button label whenever the panel is reopened.
  useEffect(() => {
    if (open) setCopied(false)
  }, [open])

  const won = status === 'won'
  // Opening this panel mid-game (the 📊 button) must never leak the answer —
  // the reveal below was previously gated on `won`, so an unfinished game fell
  // into the "The word was ..." branch and handed the answer over.
  const inProgress = status === 'playing'

  const handleShare = async () => {
    const text = shareText(guesses, answer, day)
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard blocked (insecure origin, or permission denied) — fall back
      // to a prompt so the player can still copy the grid by hand.
      window.prompt('Copy your result:', text)
    }
  }

  const winPercent = stats.played ? Math.round((stats.wins / stats.played) * 100) : 0

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(6px)',
            WebkitBackdropFilter: 'blur(6px)',
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
          }}
        >
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: 380,
              background: 'rgba(28,24,16,0.92)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              border: `1px solid rgba(230,184,0,0.35)`,
              borderRadius: 20,
              padding: '28px 26px',
              boxShadow: '0 25px 60px rgba(0,0,0,0.6)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 16,
            }}
          >
            <div
              style={{
                fontFamily: "'Cinzel', serif",
                fontSize: 26,
                fontWeight: 700,
                color: won ? GOLD : '#fff',
                textAlign: 'center',
                textShadow: '0 2px 10px rgba(0,0,0,0.5)',
              }}
            >
              {inProgress ? 'Your Stats' : won ? 'Victory' : 'Out of Guesses'}
            </div>

            <div
              style={{
                fontSize: 10,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: 'rgba(255,255,255,0.5)',
                fontFamily: 'Poppins, sans-serif',
                marginTop: -8,
              }}
            >
              Day {day} · Round {round + 1}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, width: '70%' }}>
              <div style={{ flex: 1, height: 1, background: `linear-gradient(90deg, transparent, ${GOLD})` }} />
              <span style={{ color: GOLD, fontSize: 10 }}>✦</span>
              <div style={{ flex: 1, height: 1, background: `linear-gradient(90deg, ${GOLD}, transparent)` }} />
            </div>

            <div
              style={{
                fontSize: 13,
                color: 'rgba(255,255,255,0.75)',
                fontFamily: 'Poppins, sans-serif',
                textAlign: 'center',
                lineHeight: 1.6,
              }}
            >
              {inProgress ? (
                <>
                  {guesses.length} of {MAX_GUESSES} guesses used. Keep going.
                </>
              ) : won ? (
                <>
                  Solved in {guesses.length}{' '}
                  {guesses.length === 1 ? 'guess' : 'guesses'}.
                </>
              ) : (
                <>
                  The word was{' '}
                  <strong style={{ color: GOLD, letterSpacing: '0.08em' }}>
                    {answer.toUpperCase()}
                  </strong>
                </>
              )}
            </div>

            <div style={{ display: 'flex', width: '100%', gap: 4 }}>
              <Stat label="Played" value={stats.played} />
              <Stat label="Win %" value={winPercent} />
              <Stat label="Streak" value={stats.streak} />
              <Stat label="Best" value={stats.maxStreak} />
            </div>

            <div style={{ width: '100%' }}>
              <div
                style={{
                  fontSize: 10,
                  color: 'rgba(255,255,255,0.55)',
                  fontFamily: 'Poppins, sans-serif',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  marginBottom: 8,
                  textAlign: 'center',
                }}
              >
                Guess Distribution
              </div>
              <Distribution
                distribution={stats.distribution}
                highlight={won ? guesses.length - 1 : -1}
              />
            </div>

            <div
              style={{
                display: 'flex',
                width: '100%',
                gap: 12,
                alignItems: 'center',
                borderTop: '1px solid rgba(255,255,255,0.12)',
                paddingTop: 16,
              }}
            >
              {/*
                Rounds are continuous, so the next one is available now rather
                than at midnight. The countdown only returns once the daily
                allowance is spent, which is the one case where waiting is
                actually what happens next.
              */}
              <div style={{ flex: 1, textAlign: 'center' }}>
                <div
                  style={{
                    fontSize: 10,
                    color: 'rgba(255,255,255,0.55)',
                    fontFamily: 'Poppins, sans-serif',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                  }}
                >
                  {roundsLeft > 0 ? 'Rounds Left' : 'Resets In'}
                </div>
                <div
                  style={{
                    fontFamily: "'Cinzel', serif",
                    fontSize: 20,
                    fontWeight: 700,
                    color: '#fff',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {roundsLeft > 0 ? roundsLeft : formatCountdown(remaining)}
                </div>
              </div>

              {/* Sharing an unfinished game would post a partial grid, so the
                  button only appears once the round is over. */}
              {!inProgress && (
                <button
                  type="button"
                  onClick={handleShare}
                  className="btn-gold"
                  style={{
                    flex: 1,
                    padding: '12px 0',
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
                    whiteSpace: 'nowrap',
                  }}
                >
                  {copied ? 'Copied!' : 'Share'}
                </button>
              )}
            </div>

            {/*
              Scores need a wallet to belong to, so a round played without one
              is not silently dropped — it says so, and offers the fix.
            */}
            {unsaved && (
              <div
                style={{
                  marginTop: 12,
                  padding: '11px 14px',
                  borderRadius: 12,
                  background: 'rgba(224,90,74,0.12)',
                  border: '1px solid rgba(224,90,74,0.35)',
                  color: 'rgba(255,255,255,0.85)',
                  fontSize: 12,
                  fontFamily: 'Poppins, sans-serif',
                  lineHeight: 1.55,
                  textAlign: 'center',
                }}
              >
                Not saved — connect a wallet to record scores.
              </div>
            )}

            {/* Never offered mid-game: skipping to a fresh word would let a
                player bail out of one they're stuck on for free. */}
            {!inProgress && onNextRound && roundsLeft > 0 && (
              <button
                type="button"
                onClick={onNextRound}
                style={{
                  width: '100%',
                  marginTop: 12,
                  padding: '13px 0',
                  background: 'rgba(255,255,255,0.1)',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: 12,
                  border: '1px solid rgba(230,184,0,0.45)',
                  borderRadius: 999,
                  cursor: 'pointer',
                  fontFamily: 'Poppins, sans-serif',
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                }}
              >
                Next Round →
              </button>
            )}

            {onViewLeaderboard && (
              <button
                type="button"
                onClick={onViewLeaderboard}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'rgba(255,255,255,0.65)',
                  fontSize: 12,
                  fontWeight: 600,
                  fontFamily: 'Poppins, sans-serif',
                  cursor: 'pointer',
                  letterSpacing: '0.04em',
                  padding: 0,
                }}
              >
                View leaderboard →
              </button>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default ResultModal
