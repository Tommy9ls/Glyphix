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
    padding: "16px 24px",
  }

  const navStyle = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    width: "60%",
    maxWidth: 720,
    minWidth: 320,
    padding: "10px 24px",
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
    fontSize: 16,
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
    <div style={navContainerStyle}>
      <nav style={navStyle}>
        <span style={logoStyle}>
          Glyph<span style={{ color: "#E6B800" }}>ix</span>
        </span>

        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <Link to="/leaderboard" style={linkStyle}>Leaderboard</Link>
          <WalletButton />
        </div>
      </nav>
    </div>
  )
}

export default Navbar