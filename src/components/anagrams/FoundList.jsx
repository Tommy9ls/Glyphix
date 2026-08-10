import { motion, AnimatePresence } from 'framer-motion'
import { byLength, missedWords, pointsForWord } from '../../lib/anagrams'

const GOLD = '#E6B800'

const label = {
  fontSize: 10,
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  color: 'rgba(255,255,255,0.5)',
  fontFamily: 'Poppins, sans-serif',
}

/**
 * Found words, grouped longest first.
 *
 * Once the round is over the misses are shown too, greyed out — seeing what was
 * there is the payoff, and it is the only way the player learns the pool. Only
 * the common target words are revealed; listing every accepted rarity would
 * bury the useful ones under a wall of obscurities.
 */
function FoundList({ found, puzzle, revealMissed = false }) {
  const groups = byLength(found)
  const missed = revealMissed ? missedWords(found, puzzle) : []
  const missedGroups = byLength(missed)

  if (!found.length && !missed.length) {
    return (
      <div style={{ ...label, textAlign: 'center', padding: '18px 0' }}>
        Words you find will appear here
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {groups.map((group) => (
        <div key={group.length}>
          <div style={{ ...label, marginBottom: 6 }}>
            {group.length} letters · {group.words.length}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            <AnimatePresence initial={false}>
              {group.words.map((word) => (
                <motion.span
                  key={word}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.2 }}
                  style={{
                    padding: '4px 10px',
                    borderRadius: 999,
                    background: 'rgba(230,184,0,0.16)',
                    border: '1px solid rgba(230,184,0,0.35)',
                    color: '#fff',
                    fontSize: 13,
                    fontWeight: 600,
                    fontFamily: 'Poppins, sans-serif',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                  }}
                >
                  {word}
                  <span style={{ color: GOLD, marginLeft: 6, fontSize: 11 }}>
                    +{pointsForWord(word)}
                  </span>
                </motion.span>
              ))}
            </AnimatePresence>
          </div>
        </div>
      ))}

      {missedGroups.length > 0 && (
        <div style={{ marginTop: 4, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.12)' }}>
          <div style={{ ...label, marginBottom: 8 }}>Missed · {missed.length}</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
            {missedGroups.flatMap((group) =>
              group.words.map((word) => (
                <span
                  key={word}
                  style={{
                    padding: '3px 9px',
                    borderRadius: 999,
                    background: 'rgba(255,255,255,0.06)',
                    color: 'rgba(255,255,255,0.45)',
                    fontSize: 12,
                    fontFamily: 'Poppins, sans-serif',
                    textTransform: 'uppercase',
                  }}
                >
                  {word}
                </span>
              )),
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default FoundList
