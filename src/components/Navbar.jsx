import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import WalletButton from "./wallet/WalletButton"

function Navbar() {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 40)
    }
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  const navContainerStyle = {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 50,
    display: "flex",
    justifyContent: "center",
  }

  // Widths, padding and gaps come from `.gx-nav*` in index.css so they can shrink
  // at the mobile breakpoint; only the scroll-reactive colours stay inline.
  const navStyle = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    maxWidth: 720,
    borderRadius: 999,
    background: scrolled ? "rgba(255,255,255,0.75)" : "rgba(255,255,255,0.15)",
    backdropFilter: "blur(16px)",
    border: scrolled ? "1px solid rgba(200,160,50,0.3)" : "1px solid rgba(255,255,255,0.3)",
    boxShadow: scrolled
      ? "0 4px 30px rgba(0,0,0,0.1)"
      : "0 4px 30px rgba(0,0,0,0.15)",
    transition: "all 0.3s ease",
  }

  const logoStyle = {
    fontFamily: "'Cinzel', serif",
    fontSize: "clamp(14px, 3.6vw, 16px)",
    fontWeight: 700,
    color: scrolled ? "#1a1a1a" : "#fff",
    textShadow: scrolled ? "none" : "0 1px 4px rgba(0,0,0,0.3)",
    whiteSpace: "nowrap",
  }

  const linkStyle = {
    fontSize: 13,
    fontWeight: 500,
    color: scrolled ? "#78350f" : "#fff",
    textDecoration: "none",
    textShadow: scrolled ? "none" : "0 1px 4px rgba(0,0,0,0.3)",
    whiteSpace: "nowrap",
  }

  return (
    <div style={navContainerStyle} className="gx-nav-container">
      <nav style={navStyle} className="gx-nav">
        <span style={logoStyle}>
          Glyph<span style={{ color: "#E6B800" }}>ix</span>
        </span>

        <div style={{ display: "flex", alignItems: "center" }} className="gx-nav-links">
          <Link to="/leaderboard" style={linkStyle} className="gx-nav-link">Leaderboard</Link>
          <WalletButton className="gx-wallet-btn" />
        </div>
      </nav>
    </div>
  )
}

export default Navbar