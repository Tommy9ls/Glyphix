import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { WORD_LENGTH, STATE_COLORS } from '../../lib/wordle'

const FLIP_DURATION = 0.5
const FLIP_STAGGER = 0.25

const TILE_SIZE = 'clamp(48px, 13vw, 62px)'

function Tile({ letter, state, reveal, instant, index, shake }) {
  // `reveal` starts the flip; `shown` is what actually swaps the colour, and
  // lands at the midpoint of the flip so the tile changes face-down.
  const [shown, setShown] = useState(Boolean(reveal && instant))

  useEffect(() => {
    if (!reveal) {
      setShown(false)
      return
    }
    if (instant) {
      setShown(true)
      return
    }
    const id = setTimeout(
      () => setShown(true),
      (index * FLIP_STAGGER + FLIP_DURATION / 2) * 1000,
    )
    return () => clearTimeout(id)
  }, [reveal, instant, index])

  const scored = shown && state
  const background = scored ? STATE_COLORS[state] : 'rgba(255,255,255,0.06)'
  const border = scored
    ? `2px solid ${STATE_COLORS[state]}`
    : letter
      ? '2px solid rgba(255,255,255,0.45)'
      : '2px solid rgba(255,255,255,0.18)'

  return (
    <motion.div
      // A fresh letter pops; a revealed tile flips. Never both at once.
      animate={
        reveal && !instant
          ? { rotateX: [0, -90, 0] }
          : letter && !shake
            ? { scale: [1, 1.08, 1] }
            : {}
      }
      transition={
        reveal && !instant
          ? {
              duration: FLIP_DURATION,
              delay: index * FLIP_STAGGER,
              times: [0, 0.5, 1],
              ease: 'easeInOut',
            }
          : { duration: 0.15 }
      }
      style={{
        width: TILE_SIZE,
        height: TILE_SIZE,
        borderRadius: 8,
        background,
        border,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#fff',
        fontFamily: "'Cinzel', serif",
        fontWeight: 700,
        fontSize: 'clamp(22px, 6vw, 30px)',
        textTransform: 'uppercase',
        textShadow: '0 2px 6px rgba(0,0,0,0.4)',
        boxShadow: scored ? '0 4px 14px rgba(0,0,0,0.3)' : 'none',
        transition: 'background 0.15s ease, border-color 0.15s ease',
        userSelect: 'none',
      }}
    >
      {letter}
    </motion.div>
  )
}

function Row({ word, scores, reveal, instant, shake, winning }) {
  const letters = word.padEnd(WORD_LENGTH).split('')

  return (
    <motion.div
      animate={
        shake
          ? { x: [0, -8, 8, -8, 8, -4, 0] }
          : winning
            ? { y: [0, -14, 0] }
            : {}
      }
      transition={
        shake
          ? { duration: 0.45 }
          : { duration: 0.5, delay: 0.2, ease: 'easeOut' }
      }
      style={{ display: 'flex', gap: 6, justifyContent: 'center' }}
    >
      {letters.map((letter, i) => (
        <Tile
          key={i}
          index={i}
          letter={letter.trim()}
          state={scores ? scores[i] : null}
          reveal={reveal}
          instant={instant}
          shake={shake}
        />
      ))}
    </motion.div>
  )
}

/**
 * The 6x5 grid.
 *
 * `rows` is one entry per line of the board, already scored by the caller.
 * `instantRows` is the number of leading rows restored from a previous
 * session — those skip the flip so a refresh doesn't replay the whole game.
 */
function Board({ rows, instantRows, shake, status }) {
  // The winning row is the last one with a guess in it, not the last row of
  // the grid — a win on guess three still needs to be the row that bounces.
  const lastSubmitted = rows.reduce((last, row, i) => (row.submitted ? i : last), -1)
  const bounceRow = status === 'won' && lastSubmitted >= instantRows ? lastSubmitted : -1

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'center' }}>
      {rows.map((row, i) => (
        <Row
          key={i}
          word={row.word}
          scores={row.scores}
          reveal={row.submitted}
          instant={i < instantRows}
          shake={shake && row.current}
          winning={i === bounceRow}
        />
      ))}
    </div>
  )
}

export default Board
