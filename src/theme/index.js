// ─── Matrix Design System — Premium Fintech Dark ───────────────────────────
// Single source of truth for colors, typography, spacing, motion.
// Canvas is near-black; the brand reads as a violet→indigo gradient with
// glassy translucent surfaces and soft glow. Imported by every page.

export const colors = {
  // Surfaces
  canvas: "#050810",
  card: "#0B1120",
  elevated: "#151D33",
  inset: "#080D1A",
  border: "#232C49",
  borderSubtle: "#141B30",
  // Glass surfaces (used with backdrop-filter)
  glass: "rgba(255,255,255,0.03)",
  glassStrong: "rgba(255,255,255,0.05)",
  glassBorder: "rgba(255,255,255,0.08)",
  glassEdge: "rgba(255,255,255,0.14)", // lit top edge of glass cards

  // Text
  text: "#F4F6FB",
  textSecondary: "#98A2BC",
  textMuted: "#5A6480",

  // Brand — violet → indigo
  accent: "#7C6CFF",
  accentDeep: "#4F46E5",
  accentHover: "#9D90FF",
  accentSoft: "rgba(124,108,255,0.12)",
  focusGlow: "rgba(124,108,255,0.22)",

  // Semantic
  positive: "#22C55E",
  positiveSoft: "rgba(34,197,94,0.12)",
  negative: "#EF4444",
  negativeSoft: "rgba(239,68,68,0.12)",
  warning: "#F59E0B",
  warningSoft: "rgba(245,158,11,0.12)",
  info: "#22D3EE",
  infoSoft: "rgba(34,211,238,0.12)",
};

export const gradients = {
  brand: `linear-gradient(135deg, ${colors.accent} 0%, ${colors.accentDeep} 100%)`,
  brandHover: `linear-gradient(135deg, ${colors.accentHover} 0%, ${colors.accent} 100%)`,
  textBright: `linear-gradient(120deg, ${colors.text} 30%, ${colors.accentHover} 100%)`,
  score: `linear-gradient(90deg, ${colors.accent}, ${colors.positive})`,
};

export const fonts = {
  sans: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  display: "'Space Grotesk', 'Inter', sans-serif",
  mono: "'JetBrains Mono', ui-monospace, 'SFMono-Regular', monospace",
};

export const radius = {
  sm: "10px",
  md: "14px",
  lg: "18px",
  xl: "26px",
  pill: "999px",
};

export const shadow = {
  card: "0 1px 2px rgba(0,0,0,0.4), 0 8px 24px rgba(0,0,0,0.25)",
  elevated: "0 16px 48px rgba(0,0,0,0.55)",
  glow: "0 8px 32px rgba(124,108,255,0.35)",
  glowSoft: "0 0 60px rgba(124,108,255,0.12)",
  glowGreen: "0 8px 30px rgba(34,197,94,0.25)",
};

// Reusable glass-card CSS (string) — translucent fill, blur, lit top edge.
export const glassCss = `
  background: linear-gradient(180deg, ${colors.glassStrong}, ${colors.glass});
  border: 1px solid ${colors.glassBorder};
  border-top-color: ${colors.glassEdge};
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  box-shadow: ${shadow.card};
`;

// Framer Motion presets — keep micro-interactions ≤120ms, page fades 250ms.
export const motion = {
  pageFade: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: { duration: 0.25, ease: "easeOut" },
  },
  rise: {
    initial: { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.4, ease: "easeOut" },
  },
  stagger: (i, step = 0.02) => ({
    initial: { opacity: 0, y: 4 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.2, delay: i * step, ease: "easeOut" },
  }),
  cardHover: {
    whileHover: { y: -2 },
    transition: { duration: 0.12, ease: "easeOut" },
  },
};

const theme = { colors, gradients, fonts, radius, shadow, glassCss, motion };
export default theme;
