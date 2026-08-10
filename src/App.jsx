import { Routes, Route, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import Navbar from './components/Navbar'
import Hero from './components/Hero'
import GameHub from './pages/GameHub'
import Wordle from './pages/Wordle'
import Anagrams from './pages/Anagrams'
import Leaderboard from './pages/Leaderboard'

/**
 * The colour behind the page — what fills the overscroll gutters at the top and
 * bottom on mobile, and what the browser paints its chrome with.
 *
 * The landing page's art is bright, the game pages sit on a dark blurred
 * backdrop, so one flat colour would clash with one or the other.
 */
const PAGE_COLORS = {
  '/': '#1b1230',
  '/games': '#0e1524',
  '/games/wordle': '#0e1524',
  '/games/anagrams': '#0e1524',
  '/leaderboard': '#0e1524',
}

const DEFAULT_COLOR = '#0e1524'

function App() {
  const { pathname } = useLocation()
  const pageColor = PAGE_COLORS[pathname] ?? DEFAULT_COLOR

  // Painted on <html> rather than a wrapper div: Safari's rubber-band area
  // takes its colour from the root element, so styling the app container
  // leaves the white bars above and below.
  useEffect(() => {
    document.documentElement.style.backgroundColor = pageColor
    document.body.style.backgroundColor = pageColor
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', pageColor)
  }, [pageColor])

  return (
    <div style={{ minHeight: '100vh', background: pageColor, color: '#111827' }}>
      <Routes>
        <Route path="/" element={<><Navbar /><Hero /></>} />
        <Route path="/games" element={<GameHub />} />
        <Route path="/games/wordle" element={<Wordle />} />
        <Route path="/games/anagrams" element={<Anagrams />} />
        <Route path="/leaderboard" element={<Leaderboard />} />
      </Routes>
    </div>
  )
}

export default App