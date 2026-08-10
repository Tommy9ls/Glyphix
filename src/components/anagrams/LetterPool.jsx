import { motion } from 'framer-motion'

const GOLD = '#E6B800'

/**
 * The letter pool and the word being typed.
 *
 * A letter greys out once the in-progress word has consumed it, so the pool
 * always shows what is still available rather than making the player count.
 */
function LetterPool({ letters, used, onPick, disabled }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        gap: 8,
        flexWrap: 'wrap',
        padding: '0 4px',
      }}
    >
      {letters.map((letter, i) => {
        const spent = used[i]
        return (
          <motion.button
            key={i}
            type="button"
            disabled={disabled || spent}
            onClick={() => onPick(i)}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04, duration: 0.25 }}
            whileTap={{ scale: 0.92 }}
            style={{
              width: 46,
              height: 52,
              borderRadius: 10,
              border: `2px solid ${spent ? 'rgba(255,255,255,0.14)' : '#8B6914'}`,
              background: spent
                ? 'rgba(255,255,255,0.06)'
                : `linear-gradient(135deg, ${GOLD}, #C9A000)`,
              color: spent ? 'rgba(255,255,255,0.25)' : '#1a1a1a',
              fontFamily: "'Cinzel', serif",
              fontSize: 24,
              fontWeight: 700,
              textTransform: 'uppercase',
              cursor: disabled || spent ? 'default' : 'pointer',
              boxShadow: spent ? 'none' : '0 4px 14px rgba(0,0,0,0.35)',
              transition: 'background 0.15s, border-color 0.15s, color 0.15s',
            }}
          >
            {letter}
          </motion.button>
        )
      })}
    </div>
  )
}

export default LetterPool
