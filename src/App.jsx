import { Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar'
import Hero from './components/Hero'
import GameHub from './pages/GameHub'
import Wordle from './pages/Wordle'
import Anagrams from './pages/Anagrams'
import Leaderboard from './pages/Leaderboard'

function App() {
  return (
    <div className="bg-white min-h-screen text-gray-900">
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