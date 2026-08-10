import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import FoundList from './FoundList'
import { maxScore, shareText, splitFound, totalScore } from '../../lib/anagrams'
import { MAX_POINTS, pointsFor } from '../../lib/leaderboard'
import { msUntilNextPuzzle } from '../../lib/day'

const GOLD = '#E6B800'

const label = {
  fontSize: 10,
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  color: 'rgba(255,255,255,0.5)',
  fontFamily: 'Poppins, sans-serif',
}

function Countdown() {
  const [ms, setMs] = useState(msUntilNextPuzzle)

  useEffect(() => {
    const id = setInterval(() => setMs(msUntilNextPuzzle()), 1000)
    return () => clearInterval(id)
  }, [])

  const total = Math.max(0, Math.floor(ms / 1000))
  const pad = (n) => String(n).padStart(2, '0')
  return (
    <span style={{ fontFamily: "'Cinzel', serif", fontSize: 20, fontWeight: 700, color: '#fff' }}>
      {pad(Math.floor(total / 3600))}:{pad(Math.floor((total % 3600) / 60))}:{pad(total % 60)}
    </span>
  )
}

function Stat({ value, caption, accent }) {
  return (
    <div style={{ flex: '1 1 60px', textAlign: 'center' }}>
      <div
        style={{
          fontFamily: "'Cinzel', serif",
          fontSize: 22,
          fontWeight: 700,
          color: accent ? GOLD : '#fff',
          lineHeight: 1.1,
        }}
      >
        {value}
      </div>
      <div style={{ ...label, marginTop: 3 }}>{caption}</div>
    </div>
  )
}

/**
 * End-of-round summary.
 *
 * `summary` is the leaderboard's own summary for anagrams, so the totals here
 * and on the leaderboard page can't disagree — both are derived from the same
 * history rather than counted twice.
 */
function ResultModal({
  open,
  onClose,
  onViewLeaderboard,
  onNextRound,
  roundsLeft = 0,
  unsaved = false,
  found,
  puzzle,
  day,
  round = 0,
  won,
  reason,
  summary,
}) {
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!open) setCopied(false)
  }, [open])

  const score = totalScore(found)
  const best = maxScore(puzzle)
  const { target: targetFound, bonus: bonusFound } = splitFound(found, puzzle)
  const earned = pointsFor(
    {
      day,
      won,
      found: targetFound.length,
      total: puzzle.target.size,
      score,
      maxScore: best,
    },
    'anagrams',
  )

  async function share() {
    const text = shareText(found, puzzle, day)
    try {
      // The share sheet is the better experience on mobile; the clipboard is
      // the fallback everywhere else, and both can be refused.
      if (navigator.share) await navigator.share({ text })
      else await navigator.clipboard.writeText(text)
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }

  const headline = won ? 'Pool cleared' : reason === 'time' ? "Time's up" : 'Round over'

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
            zIndex: 100,
            background: 'rgba(0,0,0,0.72)',
            backdropFilter: 'blur(6px)',
            WebkitBackdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
        >
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.97 }}
            transition={{ duration: 0.28, ease: 'easeOut' }}
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: 420,
              maxHeight: '86vh',
              overflowY: 'auto',
              borderRadius: 20,
              background: 'rgba(20,18,12,0.94)',
              border: '1px solid rgba(230,184,0,0.3)',
              boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
              padding: '24px 22px',
              boxSizing: 'border-box',
            }}
          >
            <div style={{ textAlign: 'center' }}>
              <div
                style={{
                  fontFamily: "'Cinzel', serif",
                  fontSize: 26,
                  fontWeight: 700,
                  color: won ? GOLD : '#fff',
                }}
              >
                {headline}
              </div>
              <div style={{ ...label, marginTop: 4 }}>
                Anagrams · Day {day} · Round {round + 1}
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                gap: 6,
                marginTop: 20,
                padding: '16px 10px',
                borderRadius: 14,
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
              }}
            >
              <Stat value={`${targetFound.length}/${puzzle.target.size}`} caption="Words" />
              {bonusFound.length > 0 && <Stat value={`+${bonusFound.length}`} caption="Bonus" />}
              <Stat value={score} caption="Score" />
              <Stat value={`+${earned}`} caption="Points" accent />
            </div>

            <div style={{ ...label, textAlign: 'center', marginTop: 8 }}>
              Best possible {MAX_POINTS}/day
            </div>

            {summary && summary.played > 0 && (
              <div
                style={{
                  display: 'flex',
                  gap: 6,
                  marginTop: 16,
                  padding: '14px 10px',
                  borderRadius: 14,
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                }}
              >
                <Stat value={summary.played} caption="Played" />
                <Stat value={`${summary.winRate}%`} caption="Cleared" />
                <Stat value={summary.streak} caption="Streak" accent={summary.streak > 0} />
                <Stat value={summary.maxStreak} caption="Best" />
              </div>
            )}

            <div style={{ marginTop: 20 }}>
              <FoundList found={found} puzzle={puzzle} revealMissed />
            </div>

            {/*
              Rounds are continuous, so the next pool is available now. The
              midnight countdown only returns once the daily allowance is spent,
              which is the one case where waiting is what actually happens next.
            */}
            <div
              style={{
                marginTop: 22,
                paddingTop: 18,
                borderTop: '1px solid rgba(255,255,255,0.12)',
                textAlign: 'center',
              }}
            >
              {roundsLeft > 0 ? (
                <>
                  <div style={label}>Rounds left today</div>
                  <div
                    style={{
                      marginTop: 4,
                      fontFamily: "'Cinzel', serif",
                      fontSize: 20,
                      fontWeight: 700,
                      color: '#fff',
                    }}
                  >
                    {roundsLeft}
                  </div>
                </>
              ) : (
                <>
                  <div style={label}>Resets in</div>
                  <div style={{ marginTop: 4 }}>
                    <Countdown />
                  </div>
                </>
              )}
            </div>

            {unsaved && (
              <div
                style={{
                  marginTop: 14,
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

            {onNextRound && roundsLeft > 0 && (
              <button
                type="button"
                onClick={onNextRound}
                style={{
                  width: '100%',
                  marginTop: 14,
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

            <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
              <button
                type="button"
                onClick={share}
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
                }}
              >
                {copied ? 'Copied' : 'Share'}
              </button>
              <button
                type="button"
                onClick={onViewLeaderboard}
                style={{
                  flex: 1,
                  padding: '12px 0',
                  background: 'rgba(255,255,255,0.1)',
                  color: '#fff',
                  fontWeight: 600,
                  fontSize: 12,
                  border: '1px solid rgba(255,255,255,0.22)',
                  borderRadius: 999,
                  cursor: 'pointer',
                  fontFamily: 'Poppins, sans-serif',
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                }}
              >
                Leaderboard
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default ResultModal
