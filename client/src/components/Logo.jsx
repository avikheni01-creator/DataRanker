import { fonts, colors } from "../theme";

// ThinkVest logo mark — renders only the brain icon from logo.png.
//
// Technique: background-image cropped via backgroundSize + backgroundPosition so
// only the brain portion (top ~55% of the square PNG) fills the container.
// background-blend-mode: multiply dissolves white PNG pixels into the teal
// backgroundColor (#ECFDF5), making the white background invisible while the
// navy and teal elements in the brain are almost perfectly preserved.
export default function Logo({ size = 22, showText = true, color = colors.text }) {
  const px = Math.round(size * 1.72);
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 9 }}>
      <span
        role="img"
        aria-label="ThinkVest"
        style={{
          display: "inline-block",
          width: px,
          height: px,
          flexShrink: 0,
          borderRadius: "8px",
          // Crop to brain: 185% scale shows the top ~54% of the square image.
          // Position 50% horizontal (centered), 12% vertical (shifts down past
          // the small white gap above the brain, centering the icon).
          backgroundImage: "url('/logo.png')",
          backgroundRepeat: "no-repeat",
          backgroundSize: "185% auto",
          backgroundPosition: "50% 12%",
          // multiply blend: white PNG pixels × #ECFDF5 = #ECFDF5 (invisible).
          // Navy/teal pixels are preserved — multiply barely changes them.
          backgroundColor: "#ECFDF5",
          backgroundBlendMode: "multiply",
          boxShadow: "0 0 0 1.5px rgba(16,185,129,0.35)",
        }}
      />
      {showText && (
        <span style={{ fontFamily: fonts.display, fontWeight: 700, fontSize: size * 0.82, letterSpacing: "0.01em", color }}>
          Think<span style={{ color: "#10B981" }}>Vest</span>
        </span>
      )}
    </span>
  );
}
