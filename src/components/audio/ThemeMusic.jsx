import { useCallback, useEffect, useRef, useState } from 'react'
import { readJSON, writeJSON } from '../../lib/storage'

const GOLD = '#E6B800'

const MUTED_KEY = 'glyphix.music.muted'

/** Background music, not a foreground track — loud enough to notice, quiet
 *  enough to think over. */
const VOLUME = 0.32

/**
 * The theme song.
 *
 * Lives in `App.jsx` above the router, so navigating between pages does not
 * unmount the `<audio>` element and restart the track.
 *
 * **Autoplay is blocked by every modern browser** until the user has interacted
 * with the page, and the block is silent — `play()` returns a promise that
 * rejects. So we try immediately, and if that fails we arm one-shot listeners
 * for the first tap, click, or keypress and start then. That first gesture is
 * usually "Start Playing", so in practice the music begins as the player enters
 * the game.
 *
 * The mute choice persists: someone who turned it off should not have it come
 * back every reload.
 */
function ThemeMusic() {
  const audioRef = useRef(null)
  const [muted, setMuted] = useState(() => readJSON(MUTED_KEY, false) === true)
  // Purely cosmetic: lets the button hint that sound is waiting on a tap.
  const [playing, setPlaying] = useState(false)

  const toggle = useCallback(() => {
    setMuted((wasMuted) => {
      const next = !wasMuted
      writeJSON(MUTED_KEY, next)
      const audio = audioRef.current
      if (audio && !next) {
        // Unmuting is itself a user gesture, so this play() is always allowed.
        audio.play().then(() => setPlaying(true)).catch(() => {})
      }
      return next
    })
  }, [])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return undefined

    audio.volume = VOLUME
    if (muted) {
      audio.pause()
      setPlaying(false)
      return undefined
    }

    let cleanup = () => {}

    const start = () => {
      audio
        .play()
        .then(() => {
          setPlaying(true)
          cleanup()
        })
        .catch(() => {
          // Autoplay refused — wait for a gesture and try again.
        })
    }

    start()

    const onGesture = () => start()
    const events = ['pointerdown', 'keydown', 'touchstart']
    events.forEach((e) => window.addEventListener(e, onGesture, { passive: true }))
    cleanup = () => events.forEach((e) => window.removeEventListener(e, onGesture))

    return () => cleanup()
  }, [muted])

  return (
    <>
      <audio ref={audioRef} src="/glyphix.mp3" loop preload="auto" />

      <button
        type="button"
        onClick={toggle}
        aria-label={muted ? 'Unmute theme music' : 'Mute theme music'}
        aria-pressed={!muted}
        title={muted ? 'Unmute theme music' : 'Mute theme music'}
        style={{
          position: 'fixed',
          right: 14,
          bottom: 14,
          zIndex: 120,
          width: 40,
          height: 40,
          borderRadius: 999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(20,18,12,0.72)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          border: `1px solid ${muted ? 'rgba(255,255,255,0.22)' : 'rgba(230,184,0,0.55)'}`,
          color: muted ? 'rgba(255,255,255,0.55)' : GOLD,
          fontSize: 16,
          lineHeight: 1,
          cursor: 'pointer',
          boxShadow: '0 4px 18px rgba(0,0,0,0.35)',
          // A tap target under ~40px is hard to hit on a phone.
          padding: 0,
          transition: 'color 0.2s, border-color 0.2s',
        }}
      >
        {muted ? '🔇' : '🔊'}
        {/* Faint ring while the track is waiting for a first gesture, so an
            unmuted-but-silent button doesn't look broken. */}
        {!muted && !playing && (
          <span
            style={{
              position: 'absolute',
              inset: -3,
              borderRadius: 999,
              border: '1px solid rgba(230,184,0,0.35)',
              animation: 'shimmer 2.5s ease-in-out infinite',
            }}
          />
        )}
      </button>
    </>
  )
}

export default ThemeMusic
