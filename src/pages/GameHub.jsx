import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useNavigate } from "react-router-dom"

const TILE_COLORS = {
  correct: "#538d4e",
  present: "#b59f3b",
  absent: "#787c7e",
}

// `colors` lives on the game rather than in a parallel array, so reordering or
// inserting a game can't desync the two and blank out the preview tiles.
const games = [
  {
    id: "wordle",
    name: "Wordle",
    description: "Guess the hidden 5-letter word in 6 tries.",
    preview: ["G","R","E","A","T"],
    colors: [TILE_COLORS.correct, TILE_COLORS.present, TILE_COLORS.absent, TILE_COLORS.correct, TILE_COLORS.present],
    status: "live",
    players: "135",
  },
  {
    id: "anagrams",
    name: "Anagram Rush",
    description: "Unscramble letters to find as many words as you can before time runs out!",
    preview: ["R","A","N","G","E"],
    colors: [TILE_COLORS.absent, TILE_COLORS.correct, TILE_COLORS.absent, TILE_COLORS.present, TILE_COLORS.correct],
    status: "live",
    players: "143",
  },
  {
    id: "word-fusion",
    name: "Word Fusion",
    description: "Find words by connecting letters in any direction.",
    preview: ["F","U","S","E","D"],
    colors: [TILE_COLORS.present, TILE_COLORS.correct, TILE_COLORS.absent, TILE_COLORS.present, TILE_COLORS.correct],
    status: "soon",
    players: "0",
  },
  {
    id: "word-chain",
    name: "Word Chain",
    description: "Build word chains where each word starts with the last letter.",
    preview: ["C","A","T"],
    colors: [TILE_COLORS.correct, TILE_COLORS.absent, TILE_COLORS.correct],
    status: "soon",
    players: "0",
  },
]

function GameCard({ game, index, onClick }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.4 }}
      onClick={onClick}
      whileHover={{ y: -6, boxShadow: "0 16px 40px rgba(0,0,0,0.25)" }}
      style={{
        background: "rgba(255,255,255,0.12)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderRadius: 16,
        padding: "28px 28px",
        cursor: game.status === "live" ? "pointer" : "default",
        border: "1.5px solid rgba(255,255,255,0.25)",
        boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 12,
      }}
    >
      <div style={{ display: "flex", gap: 4, flexWrap: "wrap", justifyContent: "center" }}>
        {game.preview.map((letter, i) => (
          <motion.div
            key={i}
            initial={{ rotateX: 90, opacity: 0 }}
            animate={{ rotateX: 0, opacity: 1 }}
            transition={{ delay: index * 0.1 + i * 0.08, duration: 0.4 }}
            style={{
              width: 32, height: 32,
              borderRadius: 6,
              background: game.colors[i],
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "#fff", fontWeight: 700, fontSize: 12,
              fontFamily: "'Cinzel', serif",
            }}
          >
            {letter}
          </motion.div>
        ))}
      </div>

      <div style={{
        fontFamily: "'Cinzel', serif",
        fontSize: 18, fontWeight: 700,
        color: "#fff", textAlign: "center",
        textShadow: "0 2px 8px rgba(0,0,0,0.4)",
      }}>
        {game.name}
      </div>

      <div style={{
        fontSize: 13, color: "rgba(255,255,255,0.75)",
        lineHeight: 1.6, fontFamily: "Poppins, sans-serif",
        textAlign: "center", flexGrow: 1,
      }}>
        {game.description}
      </div>

      <div style={{
        fontSize: 12, color: "#7dbb78",
        fontFamily: "Poppins, sans-serif",
        display: "flex", alignItems: "center", gap: 4,
      }}>
        <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#7dbb78", display: "inline-block" }}/>
        {game.players} playing now
      </div>

      <button style={{
        width: "100%", padding: "10px 0",
        background: game.status === "live" ? "linear-gradient(135deg, #E6B800, #C9A000)" : "rgba(255,255,255,0.1)",
        color: game.status === "live" ? "#1a1a1a" : "rgba(255,255,255,0.4)",
        fontWeight: 700, fontSize: 13,
        border: game.status === "live" ? "2px solid #8B6914" : "1px solid rgba(255,255,255,0.15)",
        borderRadius: 999,
        cursor: game.status === "live" ? "pointer" : "default",
        fontFamily: "Poppins, sans-serif",
        letterSpacing: "0.06em", textTransform: "uppercase",
        boxShadow: game.status === "live" ? "0 4px 15px rgba(230,184,0,0.3)" : "none",
      }}>
        {game.status === "live" ? "Play Now →" : "Coming Soon"}
      </button>
    </motion.div>
  )
}

function GameHub() {
  const navigate = useNavigate()
  const [current, setCurrent] = useState(0)
  const [direction, setDirection] = useState(1)

  const paginate = (newDirection) => {
    setDirection(newDirection)
    setCurrent((prev) => (prev + newDirection + games.length) % games.length)
  }

  return (
    <div style={{
      width: "100vw",
      minHeight: "100vh",
      overflow: "hidden",
      position: "relative",
      fontFamily: "Poppins, sans-serif",
    }}>

      {/* Background */}
      <div style={{
        position: "fixed",
        inset: 0,
        backgroundImage: "url('/gamehub_bg.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        filter: "blur(2px) brightness(0.75)",
        transform: "scale(1.05)",
        zIndex: 0,
      }}/>

      {/* Dark overlay */}
      <div style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.3)",
        zIndex: 2,
      }}/>

      {/* UI Content */}
      <div style={{ position: "relative", zIndex: 5 }}>

        {/* Navbar */}
        <div style={{ display: "flex", justifyContent: "center", padding: "16px 24px 0" }}>
          <nav style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            width: "100%",
            maxWidth: 1100,
            padding: "12px 28px",
            borderRadius: 999,
            background: "rgba(255,255,255,0.12)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
            border: "1px solid rgba(255,255,255,0.2)",
            boxShadow: "0 4px 30px rgba(0,0,0,0.2)",
          }}>
            <span
              onClick={() => navigate("/")}
              style={{
                fontFamily: "'Cinzel', serif",
                fontSize: 20, fontWeight: 700,
                cursor: "pointer", color: "#fff",
                textShadow: "0 2px 8px rgba(0,0,0,0.4)",
              }}
            >
              Glyph<span style={{ color: "#E6B800" }}>ix</span>
            </span>

            <button
              className="btn-gold"
              style={{
                padding: "8px 24px",
                background: "linear-gradient(135deg, #E6B800, #C9A000)",
                color: "#1a1a1a", fontWeight: 700, fontSize: 13,
                border: "2px solid #8B6914", borderRadius: 999,
                cursor: "pointer", fontFamily: "Poppins, sans-serif",
                letterSpacing: "0.05em", textTransform: "uppercase",
                whiteSpace: "nowrap",
                boxShadow: "0 4px 15px rgba(230,184,0,0.3)",
              }}
            >
              Connected
            </button>
          </nav>
        </div>

        {/* Hero heading */}
        <div style={{ textAlign: "center", padding: "25px 24px 20px", maxWidth: 1100, margin: "0 auto" }}>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            style={{
              fontFamily: "'Cinzel', serif",
              fontSize: "clamp(32px, 5vw, 52px)",
              fontWeight: 700, color: "#fff", marginBottom: 8,
              textShadow: "0 2px 12px rgba(0,0,0,0.5)",
            }}
          >
            Choose A Game
          </motion.h1>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, marginBottom: 12 }}>
            <div style={{ width: 60, height: 1, background: "linear-gradient(90deg, transparent, #E6B800)" }}/>
            <span style={{ color: "#E6B800", fontSize: 12 }}>✦</span>
            <div style={{ width: 60, height: 1, background: "linear-gradient(90deg, #E6B800, transparent)" }}/>
          </div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            style={{ fontSize: 15, color: "rgba(255,255,255,0.7)", fontFamily: "Poppins, sans-serif" }}
          >
            Test your vocabulary. Earn rewards. Climb the leaderboard.
          </motion.p>
        </div>

        {/* Carousel */}
        <div style={{
          maxWidth: 1100,
          margin: "0 auto",
          padding: "20px 80px 40px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 24,
          position: "relative",
        }}>

          {/* Left arrow */}
          <button
            onClick={() => paginate(-1)}
            style={{
              width: 48, height: 48,
              borderRadius: "50%",
              background: "rgba(255,255,255,0.15)",
              backdropFilter: "blur(12px)",
              border: "1px solid rgba(255,255,255,0.3)",
              color: "#fff", fontSize: 22,
              cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0, zIndex: 10,
              transition: "background 0.2s",
            }}
            onMouseEnter={e => e.currentTarget.style.background = "rgba(230,184,0,0.3)"}
            onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.15)"}
          >
            ←
          </button>

          {/* Card viewport */}
          <div style={{ width: 360, overflow: "hidden", position: "relative", height: 360 }}>
            <AnimatePresence initial={false} custom={direction} mode="wait">
              <motion.div
                key={current}
                custom={direction}
                variants={{
                  enter: (d) => ({ x: d > 0 ? 400 : -400, opacity: 0 }),
                  center: { x: 0, opacity: 1 },
                  exit: (d) => ({ x: d > 0 ? -400 : 400, opacity: 0 }),
                }}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.4, ease: "easeInOut" }}
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.2}
                onDragEnd={(e, { offset }) => {
                  if (offset.x < -80) paginate(1)
                  else if (offset.x > 80) paginate(-1)
                }}
                onClick={() => games[current].status === "live" && navigate(`/games/${games[current].id}`)}
                style={{
                  position: "absolute",
                  width: "100%", height: "100%",
                  background: "rgba(255,255,255,0.12)",
                  backdropFilter: "blur(20px)",
                  WebkitBackdropFilter: "blur(20px)",
                  borderRadius: 24,
                  padding: "20px 24px",
                  border: "1.5px solid rgba(255,255,255,0.25)",
                  boxShadow: "0 8px 40px rgba(0,0,0,0.3)",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 10,
                  cursor: games[current].status === "live" ? "pointer" : "default",
                  boxSizing: "border-box",
                }}
              >
                {/* Status badge */}
                <div style={{
                  position: "absolute",
                  top: 14, right: 14,
                  padding: "3px 10px",
                  borderRadius: 999, fontSize: 10,
                  fontWeight: 700, letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  background: games[current].status === "live" ? "rgba(83,141,78,0.3)" : "rgba(255,255,255,0.1)",
                  color: games[current].status === "live" ? "#7dbb78" : "rgba(255,255,255,0.4)",
                  border: games[current].status === "live" ? "1px solid rgba(83,141,78,0.5)" : "1px solid rgba(255,255,255,0.15)",
                }}>
                  {games[current].status === "live" ? "● Live" : "Coming Soon"}
                </div>

                {/* Preview tiles */}
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "center" }}>
                  {games[current].preview.map((letter, i) => (
                    <motion.div
                      key={`${current}-${i}`}
                      initial={{ rotateX: 90, opacity: 0 }}
                      animate={{ rotateX: 0, opacity: 1 }}
                      transition={{ delay: i * 0.08, duration: 0.4 }}
                      style={{
                        width: 40, height: 40, borderRadius: 6,
                        background: games[current].colors[i],
                        display: "flex", alignItems: "center", justifyContent: "center",
                        color: "#fff", fontWeight: 700, fontSize: 16,
                        fontFamily: "'Cinzel', serif",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
                      }}
                    >
                      {letter}
                    </motion.div>
                  ))}
                </div>

                {/* Game name */}
                <div style={{
                  fontFamily: "'Cinzel', serif",
                  fontSize: 24, fontWeight: 700,
                  color: "#fff", textAlign: "center",
                  textShadow: "0 2px 12px rgba(0,0,0,0.5)",
                }}>
                  {games[current].name}
                </div>

                {/* Gold divider */}
                <div style={{ display: "flex", alignItems: "center", gap: 8, width: "60%" }}>
                  <div style={{ flex: 1, height: 1, background: "linear-gradient(90deg, transparent, #E6B800)" }}/>
                  <span style={{ color: "#E6B800", fontSize: 10 }}>✦</span>
                  <div style={{ flex: 1, height: 1, background: "linear-gradient(90deg, #E6B800, transparent)" }}/>
                </div>

                {/* Description */}
                <div style={{
                  fontSize: 13, color: "rgba(255,255,255,0.75)",
                  lineHeight: 1.5, fontFamily: "Poppins, sans-serif",
                  textAlign: "center",
                }}>
                  {games[current].description}
                </div>

                {/* Players */}
                <div style={{
                  fontSize: 12, color: "#7dbb78",
                  fontFamily: "Poppins, sans-serif",
                  display: "flex", alignItems: "center", gap: 6,
                }}>
                  <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#7dbb78", display: "inline-block" }}/>
                  {games[current].players} playing now
                </div>

                {/* Button */}
                <button style={{
                  padding: "10px 36px",
                  background: games[current].status === "live" ? "linear-gradient(135deg, #E6B800, #C9A000)" : "rgba(255,255,255,0.1)",
                  color: games[current].status === "live" ? "#1a1a1a" : "rgba(255,255,255,0.4)",
                  fontWeight: 700, fontSize: 12,
                  border: games[current].status === "live" ? "2px solid #8B6914" : "1px solid rgba(255,255,255,0.15)",
                  borderRadius: 999,
                  cursor: games[current].status === "live" ? "pointer" : "default",
                  fontFamily: "Poppins, sans-serif",
                  letterSpacing: "0.08em", textTransform: "uppercase",
                  boxShadow: games[current].status === "live" ? "0 4px 20px rgba(230,184,0,0.4)" : "none",
                }}>
                  {games[current].status === "live" ? "Play Now" : "Coming Soon"}
                </button>

              </motion.div>
            </AnimatePresence>
          </div>

          {/* Right arrow */}
          <button
            onClick={() => paginate(1)}
            style={{
              width: 48, height: 48,
              borderRadius: "50%",
              background: "rgba(255,255,255,0.15)",
              backdropFilter: "blur(12px)",
              border: "1px solid rgba(255,255,255,0.3)",
              color: "#fff", fontSize: 22,
              cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0, zIndex: 10,
              transition: "background 0.2s",
            }}
            onMouseEnter={e => e.currentTarget.style.background = "rgba(230,184,0,0.3)"}
            onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.15)"}
          >
            →
          </button>

        </div>

        {/* Dot indicators */}
        <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: -24, marginBottom: 40 }}>
          {games.map((_, i) => (
            <div
              key={i}
              onClick={() => { setDirection(i > current ? 1 : -1); setCurrent(i) }}
              style={{
                width: i === current ? 24 : 8,
                height: 8, borderRadius: 999,
                background: i === current ? "#E6B800" : "rgba(255,255,255,0.3)",
                cursor: "pointer",
                transition: "all 0.3s ease",
              }}
            />
          ))}
        </div>

        {/* Leaderboard banner */}
        <div style={{ maxWidth: 1100, margin: "0 auto 40px", padding: "0 80px" }}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.5 }}
            style={{
              background: "rgba(255,255,255,0.1)",
              backdropFilter: "blur(16px)",
              WebkitBackdropFilter: "blur(16px)",
              borderRadius: 16, padding: "20px 28px",
              display: "flex", alignItems: "center", gap: 20,
              border: "1px solid rgba(255,255,255,0.2)",
              boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
            }}
          >
            <div style={{ fontSize: 40 }}>🏆</div>
            <div style={{ flex: 1 }}>
              <div style={{
                fontFamily: "'Cinzel', serif",
                fontSize: 18, fontWeight: 700,
                color: "#fff", marginBottom: 4,
              }}>
                Compete. Win. Reward.
              </div>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", fontFamily: "Poppins, sans-serif" }}>
                All games contribute to the leaderboard. The more you play, the more you earn!
              </div>
            </div>
            <button
              onClick={() => navigate("/leaderboard")}
              style={{
                padding: "10px 24px", background: "transparent",
                color: "#fff", fontWeight: 700, fontSize: 13,
                border: "2px solid rgba(255,255,255,0.4)",
                borderRadius: 999, cursor: "pointer",
                fontFamily: "Poppins, sans-serif",
                letterSpacing: "0.05em", textTransform: "uppercase",
                whiteSpace: "nowrap",
              }}
            >
              View Leaderboard →
            </button>
          </motion.div>
        </div>

        {/* Footer */}
        <div style={{
          borderTop: "1px solid rgba(255,255,255,0.1)",
          padding: "20px 80px", maxWidth: 1100, margin: "0 auto",
          display: "flex", alignItems: "center",
          justifyContent: "space-between", flexWrap: "wrap", gap: 12,
        }}>
          <div style={{ display: "flex", gap: 32 }}>
            {["About", "How to Play", "Rewards", "FAQ"].map(link => (
              <a key={link} href="#" style={{
                fontSize: 13, color: "rgba(255,255,255,0.5)",
                textDecoration: "none", fontFamily: "Poppins, sans-serif",
              }}>
                {link}
              </a>
            ))}
          </div>
          <div style={{ display: "flex", gap: 20 }}>
            <img src="/x_icon.png" alt="X" style={{ width: 24, height: 24, cursor: "pointer", opacity: 0.7, filter: "invert(1)" }} />
            <img src="/telegram_icon.png" alt="Telegram" style={{ width: 24, height: 24, cursor: "pointer", opacity: 0.7, filter: "invert(1)" }} />
            <img src="/chart_icon.png" alt="Chart" style={{ width: 24, height: 24, cursor: "pointer", opacity: 0.7, filter: "invert(1)" }} />
          </div>
        </div>

      </div>
    </div>
  )
}

export default GameHub