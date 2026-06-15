// lib/rank.js — faithful port of pandas Series.rank()
//
// rank(values, { ascending = true, method = "average", pct = false }) => array
//
// Only finite numbers are "valid". null/undefined/NaN/"" are invalid and keep
// their position as null (na_option="keep"); they are excluded from ranking and
// from the pct denominator.

function isValid(v) {
  return typeof v === "number" && Number.isFinite(v);
}

function rank(values, options = {}) {
  const ascending = options.ascending !== undefined ? options.ascending : true;
  const method = options.method || "average";
  const pct = options.pct || false;

  const n = values.length;
  const out = new Array(n).fill(null);

  // Collect valid (index, value) pairs.
  const valid = [];
  for (let i = 0; i < n; i++) {
    if (isValid(values[i])) valid.push({ idx: i, val: values[i] });
  }
  const k = valid.length;
  if (k === 0) return out;

  // Sort by value (ascending order of value). For descending rank, we reverse
  // the position assignment afterwards.
  valid.sort((a, b) => a.val - b.val);

  // Assign positions 1..k. Group ties (equal values) together.
  let i = 0;
  while (i < k) {
    let j = i;
    while (j + 1 < k && valid[j + 1].val === valid[i].val) j++;
    // The tied group occupies sorted positions i..j (0-indexed).
    // Their 1-based positions are (i+1)..(j+1).
    for (let g = i; g <= j; g++) {
      let assigned;
      if (ascending) {
        if (method === "min") {
          assigned = i + 1;
        } else {
          // average of positions (i+1)..(j+1)
          assigned = (i + 1 + (j + 1)) / 2;
        }
      } else {
        // descending: largest value gets rank 1. The group's descending
        // positions are (k - j)..(k - i).
        if (method === "min") {
          assigned = k - j; // minimum (smallest) of the descending positions
        } else {
          assigned = (k - j + (k - i)) / 2;
        }
      }
      out[valid[g].idx] = assigned;
    }

    i = j + 1;
  }

  if (pct) {
    for (let p = 0; p < n; p++) {
      if (out[p] !== null) out[p] = out[p] / k;
    }
  }

  return out;
}

module.exports = { rank };
