import { Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar'
import Hero from './components/Hero'
import GameHub from './pages/GameHub'

function App() {
  return (
    <div className="bg-white min-h-screen text-gray-900">
      <Routes>
        <Route path="/" element={<><Navbar /><Hero /></>} />
        <Route path="/games" element={<GameHub />} />
      </Routes>
    </div>
  )
}

export default App