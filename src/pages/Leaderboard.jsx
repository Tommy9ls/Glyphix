import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { STATE_COLORS, dayIndex } from '../lib/wordle'
import { GAMES, GAME_IDS, MAX_POINTS, gameConfig, leaderboard, pointsFor } from '../lib/leaderboard'
// Anagram rows have no answer word, so the row shows the day's pool instead —
// derived from the day rather than stored on every entry.
import { puzzleForDay } from '../lib/anagrams'

const GOLD = '#E6B800'

const panel = {
  background: 'rgba(255,255,255,0.1)',
  backdropFilter: 'blur(16px)',
  WebkitBackdropFilter: 'blur(16px)',
  border: '1px solid rgba(255,255,255,0.18)',
  borderRadius: 16,
  boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
}

const label = {
  fontSize: 10,
  color: 'rgba(255,255,255,0.55)',
  fontFamily: 'Poppins, sans-serif',
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
}

function Stat({ value, caption, accent }) {
  return (
    <div style={{ flex: 1, textAlign: 'center', minWidth: 62 }}>
      <div
        style={{
          fontFamily: "'Cinzel', serif",
          fontSize: 'clamp(20px, 5vw, 26px)',
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

function Distribution({ distribution, labels, emptyText = 'No wins recorded yet.' }) {
  const max = Math.max(1, ...distribution)
  const total = distribution.reduce((a, b) => a + b, 0)

  if (!total) {
    return (
      <div
        style={{
          fontSize: 13,
          color: 'rgba(255,255,255,0.5)',
          fontFamily: 'Poppins, sans-serif',
          textAlign: 'center',
          padding: '12px 0',
        }}
      >
        {emptyText}
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      {distribution.map((count, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span
            style={{
              fontSize: 12,
              color: 'rgba(255,255,255,0.6)',
              fontFamily: 'Poppins, sans-serif',
              width: 22,
            }}
          >
            {labels?.[i] ?? i + 1}
          </span>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${Math.max(9, (count / max) * 100)}%` }}
            transition={{ delay: 0.1 + i * 0.05, duration: 0.45, ease: 'easeOut' }}
            style={{
              background: count ? STATE_COLORS.correct : 'rgba(255,255,255,0.15)',
              color: '#fff',
              borderRadius: 4,
              padding: '3px 9px',
              fontSize: 12,
              fontWeight: 700,
              fontFamily: 'Poppins, sans-serif',
              textAlign: 'right',
              minWidth: 26,
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

function HistoryRow({ entry, today, game }) {
  const config = gameConfig(game)
  const points = pointsFor(entry, game)

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '11px 14px',
        borderRadius: 10,
        background: entry.day === today ? 'rgba(230,184,0,0.1)' : 'rgba(255,255,255,0.05)',
        border:
          entry.day === today
            ? '1px solid rgba(230,184,0,0.3)'
            : '1px solid rgba(255,255,255,0.07)',
      }}
    >
      <span
        style={{
          fontSize: 11,
          color: 'rgba(255,255,255,0.45)',
          fontFamily: 'Poppins, sans-serif',
          width: 42,
          flexShrink: 0,
        }}
      >
        #{entry.day}
      </span>

      <span
        style={{
          fontFamily: "'Cinzel', serif",
          fontSize: 15,
          fontWeight: 700,
          color: '#fff',
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          flex: 1,
          minWidth: 0,
        }}
      >
        {game === 'anagrams' ? puzzleForDay(entry.day).letters : entry.answer || '—'}
      </span>

      <span
        style={{
          fontSize: 12,
          fontWeight: 700,
          fontFamily: 'Poppins, sans-serif',
          color: entry.won ? STATE_COLORS.correct : STATE_COLORS.absent,
          padding: '3px 9px',
          borderRadius: 999,
          background: entry.won ? 'rgba(83,141,78,0.18)' : 'rgba(120,124,126,0.18)',
          flexShrink: 0,
        }}
      >
        {config.scoreLabel(entry)}
      </span>

      <span
        style={{
          fontSize: 12,
          fontWeight: 700,
          fontFamily: 'Poppins, sans-serif',
          color: points ? GOLD : 'rgba(255,255,255,0.3)',
          width: 40,
          textAlign: 'right',
          flexShrink: 0,
        }}
      >
        {points ? `+${points}` : '0'}
      </span>
    </div>
  )
}

/**
 * The global tab when the active source can't rank — an honest empty state
 * rather than invented rivals. Swapping in a networked source replaces this
 * with a real board without the rest of the page changing.
 */
function GlobalPlaceholder() {
  return (
    <div
      style={{
        ...panel,
        padding: '36px 28px',
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 12,
      }}
    >
      <div style={{ fontSize: 34 }}>🏆</div>
      <div
        style={{
          fontFamily: "'Cinzel', serif",
          fontSize: 18,
          fontWeight: 700,
          color: '#fff',
        }}
      >
        Global Ranking Is Coming
      </div>
      <div
        style={{
          fontSize: 13,
          color: 'rgba(255,255,255,0.6)',
          fontFamily: 'Poppins, sans-serif',
          lineHeight: 1.65,
          maxWidth: 320,
        }}
      >
        Scores live on this device for now, so there is nobody to rank you
        against yet. Ranking against other players needs accounts and a
        server — until then, your record below is the real one.
      </div>
    </div>
  )
}

function Leaderboard() {
  const navigate = useNavigate()
  const today = useMemo(() => dayIndex(), [])

  const [tab, setTab] = useState('you')
  const [game, setGame] = useState('wordle')
  const [summary, setSummary] = useState(null)
  const [history, setHistory] = useState([])
  const [ranking, setRanking] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)

    async function load() {
      const [nextSummary, nextHistory, nextRanking] = await Promise.all([
        leaderboard.summary(game),
        leaderboard.history(game, 30),
        leaderboard.ranking(game, today),
      ])
      if (cancelled) return
      setSummary(nextSummary)
      setHistory(nextHistory)
      setRanking(nextRanking)
      setLoading(false)
    }

    load().catch(() => {
      if (!cancelled) setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [today, game])

  const empty = !loading && summary && summary.played === 0

  return (
    <div
      style={{
        minHeight: '100vh',
        position: 'relative',
        overflowX: 'hidden',
        fontFamily: 'Poppins, sans-serif',
      }}
    >
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
          maxWidth: 560,
          margin: '0 auto',
          padding: '16px 16px 40px',
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
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

          <div
            style={{
              fontFamily: "'Cinzel', serif",
              fontSize: 18,
              fontWeight: 700,
              color: '#fff',
              textShadow: '0 2px 8px rgba(0,0,0,0.4)',
            }}
          >
            Leaderboard
          </div>

          <div style={{ width: 28 }} />
        </div>

        {/* Game switcher. Each game keeps its own history, so this swaps the
            whole panel rather than filtering one combined list. */}
        <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
          {GAME_IDS.map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => setGame(id)}
              style={{
                padding: '7px 18px',
                borderRadius: 999,
                cursor: 'pointer',
                fontFamily: 'Poppins, sans-serif',
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                background: game === id ? 'rgba(230,184,0,0.18)' : 'rgba(255,255,255,0.06)',
                border:
                  game === id
                    ? '1px solid rgba(230,184,0,0.5)'
                    : '1px solid rgba(255,255,255,0.12)',
                color: game === id ? GOLD : 'rgba(255,255,255,0.55)',
                transition: 'background 0.2s, color 0.2s, border-color 0.2s',
              }}
            >
              {GAMES[id].name}
            </button>
          ))}
        </div>

        {/* Tabs */}
        <div
          style={{
            display: 'flex',
            gap: 6,
            padding: 5,
            borderRadius: 999,
            background: 'rgba(255,255,255,0.08)',
            border: '1px solid rgba(255,255,255,0.14)',
          }}
        >
          {[
            { id: 'you', text: 'Your Record' },
            { id: 'global', text: 'Global' },
          ].map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => setTab(option.id)}
              style={{
                flex: 1,
                padding: '9px 0',
                borderRadius: 999,
                border: 'none',
                cursor: 'pointer',
                fontFamily: 'Poppins, sans-serif',
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
                background:
                  tab === option.id ? `linear-gradient(135deg, ${GOLD}, #C9A000)` : 'transparent',
                color: tab === option.id ? '#1a1a1a' : 'rgba(255,255,255,0.6)',
                transition: 'background 0.2s ease, color 0.2s ease',
              }}
            >
              {option.text}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.22 }}
            style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
          >
            {tab === 'global' ? (
              ranking ? (
                <RankingTable ranking={ranking} game={game} />
              ) : (
                <GlobalPlaceholder />
              )
            ) : loading ? (
              <div
                style={{
                  ...panel,
                  padding: '40px 0',
                  textAlign: 'center',
                  color: 'rgba(255,255,255,0.5)',
                  fontSize: 13,
                }}
              >
                Loading…
              </div>
            ) : empty ? (
              <div
                style={{
                  ...panel,
                  padding: '36px 28px',
                  textAlign: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 14,
                }}
              >
                <div style={{ fontSize: 32 }}>✦</div>
                <div style={{ fontFamily: "'Cinzel', serif", fontSize: 18, color: '#fff' }}>
                  No Games Yet
                </div>
                <div
                  style={{
                    fontSize: 13,
                    color: 'rgba(255,255,255,0.6)',
                    lineHeight: 1.6,
                    maxWidth: 280,
                  }}
                >
                  Finish today&apos;s puzzle and your record starts here.
                </div>
                <button
                  type="button"
                  onClick={() => navigate(gameConfig(game).path)}
                  className="btn-gold"
                  style={{
                    marginTop: 4,
                    padding: '10px 28px',
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
                  Play Today&apos;s {GAMES[game].name}
                </button>
              </div>
            ) : (
              <>
                {/* Points */}
                <div
                  style={{
                    ...panel,
                    padding: '22px 24px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 16,
                  }}
                >
                  <div>
                    <div style={label}>Total Points</div>
                    <div
                      style={{
                        fontFamily: "'Cinzel', serif",
                        fontSize: 36,
                        fontWeight: 700,
                        color: GOLD,
                        lineHeight: 1.1,
                      }}
                    >
                      {summary.points.toLocaleString()}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={label}>{summary.averageCaption}</div>
                    <div
                      style={{
                        fontFamily: "'Cinzel', serif",
                        fontSize: 24,
                        fontWeight: 700,
                        color: '#fff',
                      }}
                    >
                      {summary.average ?? '—'}
                    </div>
                    <div style={{ ...label, marginTop: 6 }}>
                      Best possible {MAX_POINTS}/day
                    </div>
                  </div>
                </div>

                {/* Headline stats */}
                <div
                  style={{
                    ...panel,
                    padding: '20px 14px',
                    display: 'flex',
                    gap: 6,
                    flexWrap: 'wrap',
                  }}
                >
                  <Stat value={summary.played} caption="Played" />
                  <Stat value={`${summary.winRate}%`} caption="Win Rate" />
                  <Stat value={summary.streak} caption="Streak" accent={summary.streak > 0} />
                  <Stat value={summary.maxStreak} caption="Best" />
                </div>

                {/* Distribution */}
                <div style={{ ...panel, padding: '20px 22px' }}>
                  <div style={{ ...label, marginBottom: 12, textAlign: 'center' }}>
                    {summary.distributionTitle}
                  </div>
                  <Distribution
                    distribution={summary.distribution}
                    labels={summary.distributionLabels}
                    emptyText={summary.distributionEmpty}
                  />
                </div>

                {/* History */}
                <div style={{ ...panel, padding: '20px 18px' }}>
                  <div style={{ ...label, marginBottom: 12, textAlign: 'center' }}>
                    Recent Games
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {history.map((entry) => (
                      <HistoryRow key={entry.day} entry={entry} today={today} game={game} />
                    ))}
                  </div>
                </div>
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}

/**
 * Renders a real ranking when the active source provides one. Unused by the
 * local source, which returns null — kept so a backend has a shape to fill.
 */
function RankingTable({ ranking, game }) {
  return (
    <div style={{ ...panel, padding: '18px 16px' }}>
      <div style={{ ...label, marginBottom: 12, textAlign: 'center' }}>
        Puzzle #{ranking.day} · {ranking.entries.length} players
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {ranking.entries.map((entry) => (
          <div
            key={entry.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '11px 14px',
              borderRadius: 10,
              background: entry.isYou ? 'rgba(230,184,0,0.12)' : 'rgba(255,255,255,0.05)',
              border: entry.isYou
                ? '1px solid rgba(230,184,0,0.35)'
                : '1px solid rgba(255,255,255,0.07)',
            }}
          >
            <span
              style={{
                fontFamily: "'Cinzel', serif",
                fontSize: 14,
                fontWeight: 700,
                color: entry.rank <= 3 ? GOLD : 'rgba(255,255,255,0.5)',
                width: 26,
              }}
            >
              {entry.rank}
            </span>
            <span
              style={{
                flex: 1,
                minWidth: 0,
                fontSize: 13,
                color: '#fff',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {entry.name}
            </span>
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>
              {gameConfig(game).scoreLabel(entry)}
            </span>
            <span style={{ fontSize: 12, fontWeight: 700, color: GOLD, width: 44, textAlign: 'right' }}>
              {entry.points}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default Leaderboard
