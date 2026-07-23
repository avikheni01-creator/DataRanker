// FilterInput - autocomplete for the Screener filter DSL.
// Three-stage suggestions: column names → operators → column values.

import { useState, useRef, useEffect } from "react";

const OPERATORS = ["contains", ">=", "<=", "!=", ">", "<", "="];

const KIND = {
  field:    { label: "column",   color: "var(--accent)",   bg: "var(--accent-soft)" },
  operator: { label: "operator", color: "var(--warning)",  bg: "var(--warning-soft)" },
  value:    { label: "value",    color: "var(--positive)", bg: "var(--positive-soft)" },
  history:  { label: "recent",   color: "var(--text-muted)", bg: "var(--inset)" },
};

// ── Parsing helpers ───────────────────────────────────────────────────────────

function getLastClause(expr) {
  const idx = expr.toUpperCase().lastIndexOf(" AND ");
  if (idx === -1) return { prefix: "", clause: expr };
  return { prefix: expr.slice(0, idx + 5), clause: expr.slice(idx + 5) };
}

function computeSuggestions(clause, columns, snapshot) {
  const trimmed = clause.trimStart();

  // Stage 3 - FIELD OP<space>PARTIAL_VALUE
  const opMatch = trimmed.match(/^(.+?)\s+(>=|<=|!=|contains|>|<|=)\s(.*)$/i);
  if (opMatch) {
    const [, fieldRaw, , partial] = opMatch;
    const col = columns.find((c) => c.toLowerCase() === fieldRaw.trim().toLowerCase());
    if (!col || !snapshot) return [];
    const vals = snapshot.rows.map((r) => r[col]).filter((v) => v != null && String(v).trim() !== "");
    const sample = vals.slice(0, 10);
    const isNumeric =
      sample.length > 0 &&
      sample.every((v) => !isNaN(Number(String(v).replace(/[,%]/g, ""))));
    if (isNumeric) return [];
    const unique = [...new Set(vals)]
      .filter((v) => String(v).toLowerCase().includes(partial.toLowerCase()))
      .sort((a, b) => String(a).localeCompare(String(b)))
      .slice(0, 10);
    return unique.map((v) => ({ kind: "value", label: String(v) }));
  }

  // Stage 2 - FIELD<space>PARTIAL_OP
  const fieldSpace = trimmed.match(/^(\S.*?)\s+(\S*)$/);
  if (fieldSpace) {
    const partial = fieldSpace[2].toLowerCase();
    return OPERATORS.filter((op) => op.startsWith(partial)).map((op) => ({
      kind: "operator",
      label: op,
    }));
  }

  // Stage 1 - typing field name
  const partial = trimmed.toLowerCase();
  const list = partial
    ? columns.filter((c) => c.toLowerCase().includes(partial))
    : columns;
  return list.slice(0, 10).map((c) => ({ kind: "field", label: c }));
}

function buildNewExpr(prefix, clause, suggestion) {
  const trimmed = clause.trimStart();
  const leading = clause.slice(0, clause.length - trimmed.length);

  // Stage 3 - replace value
  const opMatch = trimmed.match(/^(.+?)\s+(>=|<=|!=|contains|>|<|=)\s(.*)$/i);
  if (opMatch) {
    return (
      prefix + leading + opMatch[1] + " " + opMatch[2] + " " + suggestion.label + " "
    );
  }

  // Stage 2 - replace operator
  const fieldSpace = trimmed.match(/^(\S.*?)\s+\S*$/);
  if (fieldSpace && suggestion.kind === "operator") {
    return prefix + leading + fieldSpace[1] + " " + suggestion.label + " ";
  }

  // Stage 1 - replace field
  return prefix + leading + suggestion.label + " ";
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function FilterInput({
  value, onChange, columns, snapshot,
  className, placeholder, history = [],
}) {
  const [open, setOpen] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [activeIdx, setActiveIdx] = useState(-1);
  const inputRef = useRef(null);
  const dropRef = useRef(null);

  useEffect(() => {
    if (!value.trim() && history.length > 0) {
      setSuggestions(history.map(h => ({ kind: "history", label: h })));
    } else {
      const { clause } = getLastClause(value);
      setSuggestions(computeSuggestions(clause, columns, snapshot));
    }
    setActiveIdx(-1);
  }, [value, columns, snapshot, history]);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (
        !inputRef.current?.contains(e.target) &&
        !dropRef.current?.contains(e.target)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const select = (s) => {
    if (s.kind === "history") {
      onChange(s.label);
    } else {
      const { prefix, clause } = getLastClause(value);
      onChange(buildNewExpr(prefix, clause, s));
    }
    setOpen(false);
    setActiveIdx(-1);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const handleKeyDown = (e) => {
    if (!open || !suggestions.length) {
      if (e.key === "Escape") setOpen(false);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, -1));
    } else if (e.key === "Enter" && activeIdx >= 0) {
      e.preventDefault();
      select(suggestions[activeIdx]);
    } else if (e.key === "Tab" && suggestions.length > 0) {
      e.preventDefault();
      select(suggestions[activeIdx >= 0 ? activeIdx : 0]);
    } else if (e.key === "Escape") {
      setOpen(false);
      setActiveIdx(-1);
    }
  };

  const show = open && suggestions.length > 0;

  const listboxId = "fi-listbox";

  return (
    <div style={{ position: "relative", flex: 1, minWidth: 0 }} role="combobox" aria-expanded={show} aria-haspopup="listbox" aria-owns={listboxId}>
      <input
        ref={inputRef}
        className={className}
        type="text"
        placeholder={placeholder}
        value={value}
        autoComplete="off"
        spellCheck={false}
        aria-autocomplete="list"
        aria-controls={listboxId}
        aria-activedescendant={activeIdx >= 0 ? `fi-opt-${activeIdx}` : undefined}
        onChange={(e) => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
      />

      {show && (
        <div
          ref={dropRef}
          id={listboxId}
          role="listbox"
          aria-label="Filter suggestions"
          style={{
            position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0,
            background: "var(--card)", border: "1px solid var(--border)",
            borderRadius: 10, boxShadow: "0 8px 28px rgba(0,0,0,.28)",
            zIndex: 200, overflow: "hidden", maxHeight: 300, overflowY: "auto",
          }}
        >
          {suggestions.map((s, i) => {
            const k = KIND[s.kind];
            return (
              <div
                key={i}
                id={`fi-opt-${i}`}
                role="option"
                aria-selected={i === activeIdx}
                onMouseDown={(e) => { e.preventDefault(); select(s); }}
                style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "9px 14px", cursor: "pointer",
                  background: i === activeIdx ? "rgba(16,185,129,.08)" : "transparent",
                  borderBottom: i < suggestions.length - 1 ? "1px solid var(--border)" : "none",
                  transition: "background .1s",
                }}
                onMouseEnter={() => setActiveIdx(i)}
              >
                <span style={{
                  fontSize: 9, fontWeight: 700, letterSpacing: ".1em",
                  textTransform: "uppercase", color: k.color, background: k.bg,
                  borderRadius: 4, padding: "2px 6px", flexShrink: 0,
                }}>
                  {k.label}
                </span>
                <span style={{ fontSize: 13, color: "var(--text)", fontFamily: "monospace" }}>
                  {s.label}
                </span>
              </div>
            );
          })}

          <div style={{
            padding: "7px 14px", fontSize: 11, color: "var(--text-muted)",
            borderTop: "1px solid var(--border)", background: "var(--inset)",
            fontFamily: "monospace",
          }}>
            {suggestions[0]?.kind === "history"
              ? "↑↓ navigate · Enter to reuse · Esc close"
              : "↑↓ navigate · Enter/Tab select · Esc close"}
          </div>
        </div>
      )}
    </div>
  );
}
