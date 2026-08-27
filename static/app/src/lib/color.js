// Ported verbatim from the prototype's DCLogic.heat()/rgba() — the
// blue-to-red density ramp and hex→rgba helper drive every heat marker,
// region fill and ranked-list bar.
const STOPS = [
  [0, [42, 86, 200]],
  [0.35, [30, 160, 190]],
  [0.65, [240, 190, 70]],
  [1, [255, 80, 60]]
];

export function heat(v) {
  for (let i = 0; i < STOPS.length - 1; i++) {
    const [a, ca] = STOPS[i];
    const [b, cb] = STOPS[i + 1];
    if (v <= b) {
      const f = (v - a) / (b - a || 1);
      return [
        Math.round(ca[0] + (cb[0] - ca[0]) * f),
        Math.round(ca[1] + (cb[1] - ca[1]) * f),
        Math.round(ca[2] + (cb[2] - ca[2]) * f)
      ];
    }
  }
  return STOPS[STOPS.length - 1][1];
}

export function rgba(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

export const SEVERITY_META = [
  ['critical', 'Critical', '#ff5a4c'],
  ['major', 'Major', '#f6b13c'],
  ['minor', 'Minor', '#57b6c9']
];
export const STATUS_META = [
  ['open', 'Open', '#34d3a6'],
  ['closed', 'Closed', '#8b919c']
];
export const CAUSE_META = [
  ['requirements', 'Requirements', '#8b5cf6'],
  ['design', 'Design', '#ec4899'],
  ['code', 'Code', '#38bdf8'],
  ['regression', 'Regression', '#fb923c']
];
export const CAUSE_COLOR = Object.fromEntries(CAUSE_META.map(([k, , c]) => [k, c]));
export const SEVERITY_COLOR = Object.fromEntries(SEVERITY_META.map(([k, , c]) => [k, c]));
