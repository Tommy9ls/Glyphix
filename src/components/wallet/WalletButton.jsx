import { useCallback, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useWallet } from '@solana/wallet-adapter-react'
import { WalletReadyState } from '@solana/wallet-adapter-base'
import { shortAddress } from '../../lib/player'

const GOLD = '#E6B800'

/**
 * Connect button and wallet picker.
 *
 * Hand-built rather than using `@solana/wallet-adapter-react-ui`, whose modal
 * ships its own stylesheet and would sit visibly outside the gold-plaque look
 * every other control here follows.
 */

const pill = {
  padding: '6px 16px',
  background: `linear-gradient(135deg, ${GOLD}, #C9A000)`,
  color: '#1a1a1a',
  fontWeight: 700,
  fontSize: 12,
  border: '2px solid #8B6914',
  borderRadius: 999,
  cursor: 'pointer',
  fontFamily: 'Poppins, sans-serif',
  letterSpacing: '0.05em',
  textTransform: 'uppercase',
  whiteSpace: 'nowrap',
  boxShadow: '0 4px 15px rgba(230,184,0,0.3)',
}

const label = {
  fontSize: 10,
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  color: 'rgba(255,255,255,0.5)',
  fontFamily: 'Poppins, sans-serif',
}

function WalletPicker({ open, onClose }) {
  const { wallets, select } = useWallet()

  // Installed wallets first; the rest are still listed so a player who has none
  // learns what to get rather than facing an empty dialog.
  const { installed, other } = useMemo(() => {
    const ready = (w) =>
      w.readyState === WalletReadyState.Installed || w.readyState === WalletReadyState.Loadable
    return {
      installed: wallets.filter((w) => ready(w.adapter)),
      other: wallets.filter((w) => !ready(w.adapter)),
    }
  }, [wallets])

  const choose = useCallback(
    (name) => {
      // `select` is enough — `autoConnect` on the provider takes it from here,
      // so there is no second connect() call to race with it.
      select(name)
      onClose()
    },
    [select, onClose],
  )

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
            zIndex: 200,
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
            initial={{ opacity: 0, y: 20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.97 }}
            transition={{ duration: 0.26, ease: 'easeOut' }}
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: 360,
              borderRadius: 20,
              background: 'rgba(20,18,12,0.95)',
              border: '1px solid rgba(230,184,0,0.3)',
              boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
              padding: '22px 20px',
              boxSizing: 'border-box',
            }}
          >
            <div
              style={{
                fontFamily: "'Cinzel', serif",
                fontSize: 20,
                fontWeight: 700,
                color: '#fff',
                textAlign: 'center',
              }}
            >
              Connect a wallet
            </div>
            <div style={{ ...label, textAlign: 'center', marginTop: 4 }}>Solana</div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 18 }}>
              {installed.map((w) => (
                <button
                  key={w.adapter.name}
                  type="button"
                  onClick={() => choose(w.adapter.name)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '11px 14px',
                    borderRadius: 12,
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(230,184,0,0.25)',
                    cursor: 'pointer',
                    color: '#fff',
                    fontFamily: 'Poppins, sans-serif',
                    fontSize: 13,
                    fontWeight: 600,
                    textAlign: 'left',
                  }}
                >
                  {w.adapter.icon && (
                    <img src={w.adapter.icon} alt="" width={22} height={22} style={{ borderRadius: 5 }} />
                  )}
                  <span style={{ flex: 1 }}>{w.adapter.name}</span>
                  <span style={{ ...label, color: 'rgba(230,184,0,0.8)' }}>Detected</span>
                </button>
              ))}

              {installed.length === 0 && (
                <div
                  style={{
                    padding: '14px 12px',
                    borderRadius: 12,
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: 'rgba(255,255,255,0.75)',
                    fontSize: 12,
                    fontFamily: 'Poppins, sans-serif',
                    lineHeight: 1.6,
                  }}
                >
                  No Solana wallet detected in this browser. Install{' '}
                  <a
                    href="https://phantom.app/"
                    target="_blank"
                    rel="noreferrer noopener"
                    style={{ color: GOLD }}
                  >
                    Phantom
                  </a>{' '}
                  or{' '}
                  <a
                    href="https://solflare.com/"
                    target="_blank"
                    rel="noreferrer noopener"
                    style={{ color: GOLD }}
                  >
                    Solflare
                  </a>
                  , then reload.
                </div>
              )}

              {other.length > 0 && (
                <div style={{ ...label, marginTop: 6 }}>
                  {other.length} more not installed
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={onClose}
              style={{
                width: '100%',
                marginTop: 16,
                padding: '10px 0',
                background: 'transparent',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: 999,
                color: 'rgba(255,255,255,0.7)',
                fontSize: 11,
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'Poppins, sans-serif',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
              }}
            >
              Cancel
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function WalletButton({ style }) {
  const { connected, connecting, publicKey, disconnect } = useWallet()
  const [pickerOpen, setPickerOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  const address = publicKey?.toBase58() ?? ''

  if (connected) {
    return (
      <div style={{ position: 'relative' }}>
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          style={{
            ...pill,
            background: 'rgba(230,184,0,0.14)',
            color: GOLD,
            border: '1px solid rgba(230,184,0,0.5)',
            boxShadow: 'none',
            textTransform: 'none',
            letterSpacing: 0,
            fontFamily: "'Cinzel', serif",
            ...style,
          }}
        >
          {shortAddress(address)}
        </button>

        <AnimatePresence>
          {menuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.16 }}
              style={{
                position: 'absolute',
                right: 0,
                top: 'calc(100% + 8px)',
                minWidth: 150,
                borderRadius: 12,
                background: 'rgba(20,18,12,0.96)',
                border: '1px solid rgba(230,184,0,0.3)',
                boxShadow: '0 12px 30px rgba(0,0,0,0.5)',
                padding: 6,
                zIndex: 60,
              }}
            >
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard?.writeText(address).catch(() => {})
                  setMenuOpen(false)
                }}
                style={{
                  width: '100%',
                  padding: '9px 10px',
                  background: 'transparent',
                  border: 'none',
                  borderRadius: 8,
                  color: 'rgba(255,255,255,0.85)',
                  fontSize: 12,
                  fontFamily: 'Poppins, sans-serif',
                  textAlign: 'left',
                  cursor: 'pointer',
                }}
              >
                Copy address
              </button>
              <button
                type="button"
                onClick={() => {
                  disconnect().catch(() => {})
                  setMenuOpen(false)
                }}
                style={{
                  width: '100%',
                  padding: '9px 10px',
                  background: 'transparent',
                  border: 'none',
                  borderRadius: 8,
                  color: '#e05a4a',
                  fontSize: 12,
                  fontFamily: 'Poppins, sans-serif',
                  textAlign: 'left',
                  cursor: 'pointer',
                }}
              >
                Disconnect
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    )
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setPickerOpen(true)}
        className="btn-gold"
        style={{ ...pill, ...style }}
      >
        {connecting ? 'Connecting…' : 'Connect Wallet'}
      </button>
      <WalletPicker open={pickerOpen} onClose={() => setPickerOpen(false)} />
    </>
  )
}

export default WalletButton
