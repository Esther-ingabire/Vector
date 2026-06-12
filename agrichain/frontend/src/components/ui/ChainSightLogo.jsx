/**
 * ChainSight Logo
 * Green gradient hexagon with a white supply-chain network mark inside.
 * Three connected nodes form an upward triangle — representing the three
 * tiers of the chain (field → distribution → oversight) and data connectivity.
 */
export default function ChainSightLogo({ size = 56, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 60 60"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="ChainSight"
    >
      <defs>
        <linearGradient id="cs-g" x1="8" y1="3" x2="52" y2="57" gradientUnits="userSpaceOnUse">
          <stop offset="0%"  stopColor="#52c484" />
          <stop offset="55%" stopColor="#1e7a46" />
          <stop offset="100%" stopColor="#0f3d22" />
        </linearGradient>
        <filter id="cs-sh" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="2.5" floodColor="#052210" floodOpacity="0.35" />
        </filter>
      </defs>

      {/* Hexagon — pointed-top */}
      <polygon
        points="30,3 53,16.5 53,43.5 30,57 7,43.5 7,16.5"
        fill="url(#cs-g)"
        filter="url(#cs-sh)"
      />
      {/* Subtle inner bevel highlight */}
      <polygon
        points="30,5.5 50.5,17.8 50.5,42.2 30,54.5 9.5,42.2 9.5,17.8"
        fill="none"
        stroke="rgba(255,255,255,0.14)"
        strokeWidth="1.2"
      />

      {/* ── Network mark ──
          Equilateral triangle of nodes (chain = field→dist→market)
          Top node  : (30, 18)     — oversight / MINAGRI
          Left node : (20.5, 34.5) — field / cooperative
          Right node: (39.5, 34.5) — market / distributor
      */}

      {/* Connecting lines — drawn BEHIND the dots */}
      <line x1="30"  y1="18"   x2="20.5" y2="34.5" stroke="rgba(255,255,255,0.55)" strokeWidth="2.2" strokeLinecap="round" />
      <line x1="30"  y1="18"   x2="39.5" y2="34.5" stroke="rgba(255,255,255,0.55)" strokeWidth="2.2" strokeLinecap="round" />
      <line x1="20.5" y1="34.5" x2="39.5" y2="34.5" stroke="rgba(255,255,255,0.55)" strokeWidth="2.2" strokeLinecap="round" />

      {/* Nodes */}
      <circle cx="30"   cy="18"   r="4.2" fill="white" />
      <circle cx="20.5" cy="34.5" r="4.2" fill="white" />
      <circle cx="39.5" cy="34.5" r="4.2" fill="white" />

      {/* Top node gets a green centre dot to signal "data / live" */}
      <circle cx="30" cy="18" r="1.8" fill="#1e7a46" />
    </svg>
  )
}
