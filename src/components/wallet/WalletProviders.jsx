import { useMemo } from 'react'
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react'
import { clusterApiUrl } from '@solana/web3.js'

/**
 * Solana wallet context for the whole app.
 *
 * **The empty `wallets` array is deliberate.** Every current Solana wallet
 * (Phantom, Solflare, Backpack) registers itself through the Wallet Standard,
 * which `WalletProvider` discovers on its own. The obvious alternative —
 * passing the `@solana/wallet-adapter-wallets` meta-package — pulls in an
 * adapter for every wallet ever shipped, including Trezor, which drags in
 * `@trezor/connect` and React Native: about 100 extra transitive packages and
 * 80-plus security advisories, for wallets nobody here uses. Add a single
 * explicit adapter to this array if a non-standard wallet is ever needed.
 *
 * The endpoint is devnet because nothing on-chain happens yet — the app only
 * reads the connected address. Swap it for a paid mainnet RPC when token
 * rewards become real; `clusterApiUrl('mainnet-beta')` is rate-limited too
 * aggressively to rely on.
 */
function WalletProviders({ children }) {
  const endpoint = useMemo(() => clusterApiUrl('devnet'), [])

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={[]} autoConnect>
        {children}
      </WalletProvider>
    </ConnectionProvider>
  )
}

export default WalletProviders
