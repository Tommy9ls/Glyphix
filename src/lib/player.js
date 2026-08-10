/**
 * Who the player is, as far as the games are concerned.
 *
 * A connected wallet address is the identity. It is the value that will key a
 * server-side leaderboard later, so scores are only recorded while one is
 * connected — an anonymous round has nothing to attach to and would be lost the
 * moment accounts arrive.
 */

/** `7xKq…9fRm` — enough to recognise, short enough for a pill. */
export function shortAddress(address, lead = 4, tail = 4) {
  if (typeof address !== 'string' || address.length <= lead + tail + 1) return address ?? ''
  return `${address.slice(0, lead)}…${address.slice(-tail)}`
}

/**
 * A stable colour per address, so a player's pill looks like *theirs*.
 * Hue only — saturation and lightness stay fixed so every result sits
 * comfortably against the dark UI.
 */
export function addressHue(address) {
  if (!address) return 42
  let hash = 0
  for (let i = 0; i < address.length; i++) hash = (hash * 31 + address.charCodeAt(i)) >>> 0
  return hash % 360
}
