import { colors, fonts } from "../theme";

// Matrix wordmark — gradient diamond glyph + name. Size scales the glyph;
// the wordmark text follows. Used in landing, auth, and the app sidebar.
export default function Logo({ size = 22, showText = true, color = colors.text }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <defs>
          <linearGradient id="mxg" x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse">
            <stop stopColor={colors.accentHover} />
            <stop offset="1" stopColor={colors.accentDeep} />
          </linearGradient>
        </defs>
        <rect x="3" y="3" width="18" height="18" rx="5" transform="rotate(45 12 12)" fill="url(#mxg)" opacity="0.18" />
        <rect x="4.5" y="4.5" width="15" height="15" rx="4" transform="rotate(45 12 12)" stroke="url(#mxg)" strokeWidth="1.6" />
        <path d="M8 15.5v-7l4 4 4-4v7" stroke="url(#mxg)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {showText && (
        <span
          style={{
            fontFamily: fonts.display,
            fontWeight: 700,
            fontSize: size * 0.85,
            letterSpacing: "0.01em",
            color,
          }}
        >
          Matrix
        </span>
      )}
    </span>
  );
}
