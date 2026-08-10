import { useEffect, useRef, useState } from "react"
import { motion } from "framer-motion"
import { useNavigate } from 'react-router-dom'

const TILES = ["G","L","Y","P","H","I","X","W","O","R","D","S","P","L","A","Y","E","A","R","N"]
const COLORS = ["#E6B800","#C9A000","#538d4e","#b59f3b","#8B7355","#D85A30"]

function CastleBackground() {
  // Styling lives in index.css as `.hero-bg` rather than inline, because the
  // mobile fix needs a media query that an inline style object can't express.
  return <div className="absolute inset-0 w-full h-full hero-bg" />
}

function CanvasBackground() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext("2d")
    let animId

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener("resize", resize)

    // Fewer, smaller, fainter tiles on a phone. At desktop counts they crowd
    // the plaque card, which occupies most of a narrow viewport.
    const narrow = window.innerWidth < 768
    const tiles = Array.from({ length: narrow ? 10 : 24 }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      size: (Math.random() * 18 + 32) * (narrow ? 0.6 : 1),
      letter: TILES[Math.floor(Math.random() * TILES.length)],
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      speedX: (Math.random() - 0.5) * 0.5,
      speedY: (Math.random() - 0.5) * 0.5,
      rotation: Math.random() * 360,
      rotSpeed: (Math.random() - 0.5) * 0.3,
      opacity: (Math.random() * 0.5 + 0.4) * (narrow ? 0.55 : 1),
    }))

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      tiles.forEach(t => {
        t.x += t.speedX
        t.y += t.speedY
        t.rotation += t.rotSpeed
        if (t.x < -60) t.x = canvas.width + 60
        if (t.x > canvas.width + 60) t.x = -60
        if (t.y < -60) t.y = canvas.height + 60
        if (t.y > canvas.height + 60) t.y = -60

        ctx.save()
        ctx.translate(t.x, t.y)
        ctx.rotate((t.rotation * Math.PI) / 180)
        ctx.globalAlpha = t.opacity

        const s = t.size
        ctx.fillStyle = t.color
        ctx.beginPath()
        ctx.roundRect(-s / 2, -s / 2, s, s, s * 0.15)
        ctx.fill()

        ctx.globalAlpha = t.opacity * 2.5
        ctx.fillStyle = "#fff"
        ctx.font = `bold ${s * 0.55}px sans-serif`
        ctx.textAlign = "center"
        ctx.textBaseline = "middle"
        ctx.fillText(t.letter, 0, 0)
        ctx.restore()
      })
      animId = requestAnimationFrame(draw)
    }

    draw()
    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener("resize", resize)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full"
      style={{ opacity: 0.9 }}
    />
  )
}

function StartButton({ onClick }) {
  const [hovered, setHovered] = useState(false)

  return (
    <motion.button
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 1.3, duration: 0.5 }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onClick}
      whileTap={{ scale: 0.96 }}
      style={{
        position: "relative",
        // Solid gold by default. This used to be transparent with the fill
        // swept in on hover, which meant touch devices — where hover never
        // fires — only ever saw an empty gold outline.
        padding: "12px clamp(28px, 8vw, 40px)",
        background: "linear-gradient(135deg, #E6B800, #C9A000)",
        color: "#1a1208",
        fontWeight: 700,
        fontSize: "clamp(12px, 3.2vw, 14px)",
        border: "5px solid #E6B800",
        borderRadius: 999,
        cursor: "pointer",
        fontFamily: "'Cinzel', serif",
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        overflow: "hidden",
        boxShadow: "0 4px 18px rgba(230,184,0,0.35)",
        transition: "color 0.35s ease",
      }}
    >
      {/* Lighter sheen that sweeps across on hover — a desktop enhancement on
          top of the solid fill, never the fill itself. */}
      <motion.div
        initial={false}
        animate={{ x: hovered ? "0%" : "-100%" }}
        transition={{ duration: 0.35, ease: "easeInOut" }}
        style={{
          position: "absolute",
          inset: 0,
          background: "linear-gradient(135deg, #FFD84D, #E6B800)",
          zIndex: 0,
        }}
      />
      <span style={{ position: "relative", zIndex: 1 }}>
         Start Playing 
      </span>
    </motion.button>
  )
}

const letters = [
  { char: "G", gold: false },
  { char: "l", gold: false },
  { char: "y", gold: false },
  { char: "p", gold: false },
  { char: "h", gold: false },
  { char: "i", gold: true },
  { char: "x", gold: true },
]

function Hero() {
  const navigate = useNavigate()
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden" style={{ paddingTop: "50px" }}>

      <CastleBackground />
      <CanvasBackground />

      <div
        className="absolute z-10 px-4 md:px-6"
        style={{
          // Sits above centre so the card lands inside the screen drawn in the
          // background art rather than below it.
          top: "42%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          maxWidth: 600,
          width: "100%",
        }}
      >
        <div style={{ position: "relative", maxWidth: 460, width: "100%" }}>

          {/* Framed plaque card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            style={{
              position: "relative",
              borderRadius: 18,
              padding: "10px",
              border: "1px solid rgba(230,184,0,0.35)",
              boxShadow: "0 25px 60px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.05)",
            }}
          >
            {/* thin gold inlay border */}
            <div
              style={{
                borderRadius: 12,
                border: "1px solid rgba(230,184,0,0.5)",
                padding: "clamp(28px, 8vw, 50px) clamp(18px, 5vw, 28px)",
                backgroundImage: "url('/card_bg.png')",
                backgroundSize: "cover",
                backgroundPosition: "center",
                backgroundRepeat: "no-repeat",
                boxShadow: "inset 0 2px 10px rgba(0,0,0,0.25), inset 0 -2px 10px rgba(255,255,255,0.15)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                textAlign: "center",
              }}
            >


              {/* Logo */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4, marginBottom: 20 }}>
                {letters.map((l, i) => {
                  const isSpecial = l.char === "i" || l.char === "x"
                  return (
                    <motion.span
                      key={i}
                      initial={{ opacity: 0, y: 30, rotateX: 90 }}
                      animate={
                        isSpecial
                          ? { opacity: 1, y: 0, rotateX: 0, rotate: -10 }
                          : { opacity: 1, y: 0, rotateX: 0, rotate: 0 }
                      }
                      transition={{ delay: 0.3 + i * 0.1, duration: 0.5, type: "spring", stiffness: 200 }}
                      style={{
                        color: "#ffffff",
                        fontFamily: "'Press Start 2P', system-ui",
                        fontSize: "clamp(18px, 4.2vw, 32px)",
                        fontWeight: 400,
                        lineHeight: 1,
                        textShadow: "0 2px 6px rgba(0,0,0,0.5)",
                        ...(isSpecial && {
                          background: "linear-gradient(160deg, #E6B800, #a87f10)",
                          color: "#ffffff",
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          width: "clamp(28px, 6vw, 46px)",
                          height: "clamp(28px, 6vw, 46px)",
                          borderRadius: 6,
                          border: "2px solid #8B6914",
                          boxShadow: "0 4px 10px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.4)",
                          textShadow: "0 2px 4px rgba(0,0,0,0.4)",
                          marginLeft: 2,
                        })
                      }}
                    >
                      {l.char}
                    </motion.span>
                  )
                })}
              </div>

              {/* Subtitle */}
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.85 }}
                transition={{ delay: 1.1, duration: 0.6 }}
                style={{
                  color: "#000000",
                  fontSize: "clamp(12px, 1.9vw, 15px)",
                  fontFamily: "'Playfair Display', 'Cinzel', serif",
                  fontStyle: "italic",
                  lineHeight: 1.6,
                  marginBottom: 26,
                }}
              >
                Compete in daily word challenges,<br />top the leaderboard, earn real rewards.
              </motion.p>

              {/* Pill button */}
              <StartButton onClick={() => navigate('/games')} />

            </div>
          </motion.div>

        </div>
      </div>

    </section>
  )
}

export default Hero