import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useWallet } from '@solana/wallet-adapter-react'
import { GAMES, GAME_IDS, leaderboard, pointsForDay } from '../../lib/leaderboard'
import { MAX_ROUNDS_PER_DAY } from '../../lib/session'
import { dayIndex } from '../../lib/day'
import { addressHue, shortAddress } from '../../lib/player'

const GOLD = '#E6B800'

const label = {
  fontSize: 9,
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  color: 'rgba(255,255,255,0.5)',
  fontFamily: 'Poppins, sans-serif',
}

function Figure({ value, caption, accent }) {
  return (
    <div style={{ flex: '1 1 54px', textAlign: 'center' }}>
      <div
        style={{
          fontFamily: "'Cinzel', serif",
          fontSize: 19,
          fontWeight: 700,
          color: accent ? GOLD : '#fff',
          lineHeight: 1.1,
        }}
      >
        {value}
      </div>
      <div style={{ ...label, marginTop: 2 }}>{caption}</div>
    </div>
  )
}

/**
 * The player card: who you are, and how today is going.
 *
 * Totals come from the leaderboard's own summaries rather than a separate
 * tally, so this panel and the leaderboard page can never disagree.
 */
function PlayerProfile({ compact = false }) {
  const { connected, publicKey } = useWallet()
  const [stats, setStats] = useState(null)
  const today = dayIndex()

  const address = publicKey?.toBase58() ?? ''

  useEffect(() => {
    if (!connected) {
      setStats(null)
      return undefined
    }
    let cancelled = false

    Promise.all(
      GAME_IDS.map(async (game) => {
        const [summary, history] = await Promise.all([
          leaderboard.summary(game),
          leaderboard.history(game, MAX_ROUNDS_PER_DAY * 2),
        ])
        return {
          game,
          summary,
          todayPoints: pointsForDay(history, today, game),
          todayRounds: history.filter((e) => e.day === today).length,
        }
      }),
    )
      .then((rows) => {
        if (!cancelled) setStats(rows)
      })
      .catch(() => {
        if (!cancelled) setStats(null)
      })

    return () => {
      cancelled = true
    }
  }, [connected, today])

  if (!connected) {
    return (
      <div
        style={{
          padding: '14px 16px',
          borderRadius: 14,
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.1)',
          color: 'rgba(255,255,255,0.65)',
          fontFamily: 'Poppins, sans-serif',
          fontSize: 12,
          lineHeight: 1.6,
          textAlign: 'center',
        }}
      >
        Connect a wallet to save scores and build a record.
      </div>
    )
  }

  const totalPoints = stats ? stats.reduce((sum, r) => sum + r.summary.points, 0) : 0
  const todayPoints = stats ? stats.reduce((sum, r) => sum + r.todayPoints, 0) : 0
  const bestStreak = stats ? Math.max(0, ...stats.map((r) => r.summary.maxStreak)) : 0
  const hue = addressHue(address)

  return (
    <div
      style={{
        padding: compact ? '14px 14px' : '18px 18px',
        borderRadius: 16,
        background: 'rgba(255,255,255,0.06)',
        border: '1px solid rgba(230,184,0,0.25)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
        <div
          style={{
            width: 34,
            height: 34,
            borderRadius: 999,
            flexShrink: 0,
            // Derived from the address, so the same wallet always looks the same.
            background: `linear-gradient(135deg, hsl(${hue} 70% 55%), hsl(${(hue + 40) % 360} 70% 40%))`,
            border: '1px solid rgba(255,255,255,0.25)',
          }}
        />
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontFamily: "'Cinzel', serif",
              fontSize: 15,
              fontWeight: 700,
              color: '#fff',
            }}
          >
            {shortAddress(address)}
          </div>
          <div style={label}>Connected</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 4, marginTop: 14 }}>
        <Figure value={totalPoints.toLocaleString()} caption="Points" accent />
        <Figure value={todayPoints.toLocaleString()} caption="Today" />
        <Figure value={bestStreak} caption="Best streak" />
      </div>

      {/* Rounds remaining today, per game — the 50-a-day allowance. */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginTop: 14 }}>
        {(stats ?? []).map((row) => {
          const used = Math.min(row.todayRounds, MAX_ROUNDS_PER_DAY)
          return (
            <div key={row.game}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: 11,
                  color: 'rgba(255,255,255,0.6)',
                  fontFamily: 'Poppins, sans-serif',
                  marginBottom: 3,
                }}
              >
                <span>{GAMES[row.game].name}</span>
                <span>
                  {used}/{MAX_ROUNDS_PER_DAY}
                </span>
              </div>
              <div
                style={{
                  height: 4,
                  borderRadius: 999,
                  background: 'rgba(255,255,255,0.12)',
                  overflow: 'hidden',
                }}
              >
                <motion.div
                  animate={{ width: `${(used / MAX_ROUNDS_PER_DAY) * 100}%` }}
                  transition={{ duration: 0.4, ease: 'easeOut' }}
                  style={{ height: '100%', background: GOLD }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default PlayerProfile
