// ─── Matrix Design System ───────────────────────────────────────────────────
// Single source of truth for colors, typography, spacing, motion.
//
// Colors are expressed as CSS custom properties (var(--token)) whose concrete
// values live in index.css under [data-theme="dark"] / [data-theme="light"].
// Because every component consumes these tokens (e.g. style={{ color: colors.text }}),
// flipping data-theme on <html> re-themes the entire app with no per-component
// changes. The brand violet→indigo and semantic colors are shared by both modes.

export const colors = {
  // Surfaces
  canvas: "var(--canvas)",
  card: "var(--card)",
  elevated: "var(--elevated)",
  inset: "var(--inset)",
  border: "var(--border)",
  borderSubtle: "var(--border-subtle)",
  // Glass surfaces (used with backdrop-filter)
  glass: "var(--glass)",
  glassStrong: "var(--glass-strong)",
  glassBorder: "var(--glass-border)",
  glassEdge: "var(--glass-edge)",

  // Text
  text: "var(--text)",
  textSecondary: "var(--text-secondary)",
  textMuted: "var(--text-muted)",

  // Brand — violet → indigo (shared across modes)
  accent: "var(--accent)",
  accentDeep: "var(--accent-deep)",
  accentHover: "var(--accent-hover)",
  accentSoft: "var(--accent-soft)",
  focusGlow: "var(--focus-glow)",

  // Semantic (shared across modes)
  positive: "var(--positive)",
  positiveSoft: "var(--positive-soft)",
  negative: "var(--negative)",
  negativeSoft: "var(--negative-soft)",
  warning: "var(--warning)",
  warningSoft: "var(--warning-soft)",
  info: "var(--info)",
  infoSoft: "var(--info-soft)",
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
  card: "var(--shadow-card)",
  elevated: "var(--shadow-elevated)",
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
