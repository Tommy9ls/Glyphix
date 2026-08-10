import { motion } from 'framer-motion'
import { STATE_COLORS } from '../../lib/wordle'

const ROWS = [
  ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
  ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
  ['enter', 'z', 'x', 'c', 'v', 'b', 'n', 'm', 'back'],
]

const LABELS = { enter: 'Enter', back: '⌫' }

function Key({ value, state, onPress, disabled }) {
  const wide = value === 'enter' || value === 'back'
  const scored = Boolean(state)

  return (
    <motion.button
      type="button"
      onClick={() => onPress(value)}
      disabled={disabled}
      whileTap={disabled ? undefined : { scale: 0.92 }}
      aria-label={value === 'back' ? 'Backspace' : value}
      style={{
        flex: wide ? '1.6 1 0' : '1 1 0',
        minWidth: 0,
        height: 'clamp(44px, 11vw, 54px)',
        borderRadius: 6,
        background: scored ? STATE_COLORS[state] : 'rgba(255,255,255,0.16)',
        color: '#fff',
        border: scored
          ? `1px solid ${STATE_COLORS[state]}`
          : '1px solid rgba(255,255,255,0.22)',
        fontFamily: 'Poppins, sans-serif',
        fontWeight: 600,
        fontSize: wide ? 'clamp(10px, 2.6vw, 12px)' : 'clamp(13px, 3.6vw, 15px)',
        textTransform: wide ? 'uppercase' : 'uppercase',
        letterSpacing: wide ? '0.06em' : 0,
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.55 : 1,
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
        transition: 'background 0.25s ease, border-color 0.25s ease',
        userSelect: 'none',
      }}
    >
      {LABELS[value] || value}
    </motion.button>
  )
}

/** On-screen keyboard. `states` maps a letter to its best-known tile state. */
function Keyboard({ states, onPress, disabled }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        width: '100%',
        maxWidth: 500,
        margin: '0 auto',
      }}
    >
      {ROWS.map((row, i) => (
        <div key={i} style={{ display: 'flex', gap: 5, justifyContent: 'center' }}>
          {/* The middle row is inset by half a key, as on a real keyboard. */}
          {i === 1 && <div style={{ flex: '0.5 1 0' }} />}
          {row.map((value) => (
            <Key
              key={value}
              value={value}
              state={states[value]}
              onPress={onPress}
              disabled={disabled}
            />
          ))}
          {i === 1 && <div style={{ flex: '0.5 1 0' }} />}
        </div>
      ))}
    </div>
  )
}

export default Keyboard
