export const CANVAS_W = 1120;
export const CANVAS_H = 680;

export function rectBounds(points) {
  const [p1, p2] = points;
  const x = Math.min(p1[0], p2[0]);
  const y = Math.min(p1[1], p2[1]);
  return { x, y, w: Math.abs(p2[0] - p1[0]), h: Math.abs(p2[1] - p1[1]) };
}

export function rectCorners(b) {
  return [[b.x, b.y], [b.x + b.w, b.y], [b.x + b.w, b.y + b.h], [b.x, b.y + b.h]];
}

export function centroid(points) {
  const b = rectBounds(points);
  return [b.x + b.w / 2, b.y + b.h / 2];
}

export function clampPoint([x, y]) {
  return [Math.max(0, Math.min(CANVAS_W, x)), Math.max(0, Math.min(CANVAS_H, y))];
}

// Converts a pointer event to logical 1120x680 canvas coordinates,
// compensating for the CSS transform:scale() the canvas is displayed at.
export function toLocal(e, canvasEl) {
  const r = canvasEl.getBoundingClientRect();
  const s = r.width / CANVAS_W;
  return [
    Math.max(0, Math.min(CANVAS_W, (e.clientX - r.left) / s)),
    Math.max(0, Math.min(CANVAS_H, (e.clientY - r.top) / s))
  ];
}
