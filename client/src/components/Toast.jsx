import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { colors, fonts, radius, shadow } from "../theme";

// Minimal auto-dismissing toast. Controlled by parent: pass `message` to show,
// `onClose` clears it. Used for the KPI-editor access gate.
export default function Toast({ message, onClose, duration = 3200 }) {
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(onClose, duration);
    return () => clearTimeout(t);
  }, [message, onClose, duration]);

  return (
    <AnimatePresence>
      {message && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          style={{
            position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)",
            zIndex: 1000, display: "flex", alignItems: "center", gap: 10,
            background: colors.elevated, border: `1px solid ${colors.border}`,
            borderLeft: `3px solid ${colors.warning}`,
            color: colors.text, fontFamily: fonts.sans, fontSize: 14, fontWeight: 500,
            padding: "12px 18px", borderRadius: radius.sm, boxShadow: shadow.elevated,
          }}
          role="status"
        >
          <span style={{ color: colors.warning }}>!</span>
          {message}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
