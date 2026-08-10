import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        /**
         * Split the Solana stack out of the main chunk.
         *
         * @solana/web3.js and the wallet adapters are most of the bundle, but
         * nothing on the landing page needs them until someone connects. Giving
         * them their own chunk keeps the app's own code in a file that stays
         * small and re-downloads on its own cadence.
         */
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('@solana') || id.includes('solana')) return 'solana'
            if (id.includes('framer-motion')) return 'motion'
            if (id.includes('react')) return 'react'
          }
          return undefined
        },
      },
    },
  },
})
