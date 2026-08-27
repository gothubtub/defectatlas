// The derived-view computation — port of the prototype's renderVals()
// core math (heat weighting, region aggregation, timeline path) adapted
// to the BRD's name-matching association (see sampleData.js on the
// resolver side for why) instead of the prototype's point-in-rect demo
// hack.
import { heat, rgba } from './color';
import { rectBounds, rectCorners, centroid } from './geometry';
import { fmtDate, DAY } from './format';

const SEVERITY_WEIGHT = { critical: 3, major: 2, minor: 1 };

function statusAt(issue, time) {
  return issue.resolvedAt != null && issue.resolvedAt <= time ? 'closed' : 'open';
}

function matches(issue, filters, time) {
  return issue.createdAt <= time && filters.sev[issue.severity] && filters.status[statusAt(issue, time)] && filters.cause[issue.rootCause];
}

function normalizeName(s) {
  return (s || '').trim().toLowerCase();
}

export function computeAtlasView({ artifact, issues, filters, t, viewStartDate, lastSync, sel }) {
  const now0 = Date.now();
  // Component-Aspect names are only unique *within* an artifact (BRD
  // UC-07), so an issue belongs to this artifact when its Jira Component
  // matches the artifact's assigned component — Component-Aspect string
  // matching (below) then narrows further to a specific region.
  const artifactIssues = issues.filter(i => !artifact || !artifact.component || i.component === artifact.component);
  const created = artifactIssues.map(i => i.createdAt);
  const dataStart = created.length ? Math.min(...created) : now0 - 180 * DAY;
  const requestedStart = viewStartDate ? Date.parse(viewStartDate + 'T00:00:00Z') : dataStart;
  const dataEnd = lastSync || now0;
  const viewStart = Math.max(dataStart, Math.min(dataEnd - DAY, isNaN(requestedStart) ? dataStart : requestedStart));
  const viewEnd = Math.max(viewStart + DAY, dataEnd);
  const viewSpan = viewEnd - viewStart;
  const now = viewStart + t * viewSpan;

  const regions = (artifact ? artifact.regions : []).map(r => {
    const bounds = rectBounds(r.points);
    let w = 0, open = 0, closed = 0, total = 0, reqOpen = 0, codeOpen = 0;
    for (const i of artifactIssues) {
      if (normalizeName(i.componentAspect) !== normalizeName(r.name)) continue;
      if (i.createdAt <= now) total++;
      if (matches(i, filters, now)) {
        w += SEVERITY_WEIGHT[i.severity] || 1;
        if (statusAt(i, now) === 'open') {
          open++;
          if (i.rootCause === 'requirements') reqOpen++;
          if (i.rootCause === 'code') codeOpen++;
        } else closed++;
      }
    }
    return { id: r.id, name: r.name, points: r.points, bounds, w, count: open + closed, open, closed, total, reqOpen, codeOpen };
  });
  const maxW = Math.max(1, ...regions.map(r => r.w));
  const regionsOut = regions.map(r => ({ ...r, intensity: Math.min(1, r.w / maxW) }));

  const unmapped = artifactIssues.filter(i => {
    const name = normalizeName(i.componentAspect);
    return !name || !regionsOut.some(r => normalizeName(r.name) === name);
  });
  const unmappedVisible = unmapped.filter(i => matches(i, filters, now));

  const markers = regionsOut.filter(r => r.count > 0).map(r => {
    const [cx, cy] = centroid(r.points);
    const v = r.intensity;
    const col = heat(v);
    const d = 26 + 34 * v;
    return { id: r.id, cx, cy, d, fontSize: Math.round(11 + v * 4), color: col, label: String(r.count) };
  });

  const ranked = regionsOut.slice().sort((a, b) => b.w - a.w);

  // Chart: weekly buckets across the view window, normalized per-artifact
  // (the prototype normalized globally across every page's tickets — a
  // reasonable simplification here since artifacts are now independently
  // synced Jira slices rather than one shared demo dataset).
  const weeks = [];
  for (let ts = dataStart; ts <= viewEnd; ts += 7 * DAY) weeks.push(ts);
  weeks.push(viewEnd);
  let maxTotal = 1;
  const weekTotals = weeks.map(ts => {
    let tot = 0;
    for (const i of artifactIssues) if (matches(i, filters, ts)) tot += SEVERITY_WEIGHT[i.severity] || 1;
    if (tot > maxTotal) maxTotal = tot;
    return tot;
  });
  const X = i => (i / (weeks.length - 1 || 1)) * 1000;
  const Y = v => 112 - (v / maxTotal) * 100 - 6;
  let line = '';
  weeks.forEach((ts, i) => {
    const px = X(i).toFixed(1), py = Y(weekTotals[i]).toFixed(1);
    line += (i ? ' L' : 'M') + px + ',' + py;
  });
  const area = line + ' L1000,112 L0,112 Z';

  const ticks = [];
  {
    const spanMonths = viewSpan / (30.44 * DAY);
    const maxTicks = 7;
    const step = Math.max(1, Math.ceil(spanMonths / maxTicks));
    const startD = new Date(viewStart);
    let y = startD.getUTCFullYear(), m = startD.getUTCMonth();
    if (startD.getUTCDate() > 1) { m += 1; if (m > 11) { m -= 12; y += 1; } }
    const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    for (let ts = Date.UTC(y, m, 1); ts <= viewEnd; ts = Date.UTC(y, m, 1)) {
      if (ts >= viewStart) ticks.push({ left: (((ts - viewStart) / viewSpan) * 100).toFixed(2) + '%', label: `${MON[m]} '${String(y).slice(2)}` });
      m += step; while (m > 11) { m -= 12; y += 1; }
    }
  }

  // Filter-chip counts — ported from the prototype's sevChips/statusChips/
  // causeChips: each shows how many issues would match if *that* chip
  // were the only change, so a chip's own dimension isn't applied to its
  // own count (sev chips ignore the sev filter, etc). Root-cause chips
  // are the exception and do apply both other filters, matching the
  // original exactly.
  const chipCounts = { sev: {}, status: {}, cause: {} };
  for (const key of ['critical', 'major', 'minor']) {
    chipCounts.sev[key] = artifactIssues.filter(i => i.severity === key && i.createdAt <= now && filters.status[statusAt(i, now)]).length;
  }
  for (const key of ['open', 'closed']) {
    chipCounts.status[key] = artifactIssues.filter(i => i.createdAt <= now && filters.sev[i.severity] && statusAt(i, now) === key).length;
  }
  for (const key of ['requirements', 'design', 'code', 'regression']) {
    chipCounts.cause[key] = artifactIssues.filter(i => i.rootCause === key && i.createdAt <= now && filters.sev[i.severity] && filters.status[statusAt(i, now)]).length;
  }

  const selRegion = sel ? regionsOut.find(r => r.id === sel) : null;
  const scope = selRegion ? artifactIssues.filter(i => normalizeName(i.componentAspect) === normalizeName(selRegion.name)) : artifactIssues;
  const visNow = scope.filter(i => matches(i, filters, now));
  const openCount = visNow.filter(i => statusAt(i, now) === 'open').length;
  const closedCount = visNow.filter(i => statusAt(i, now) === 'closed').length;
  const prev = now - 30 * DAY;
  const openPrev = scope.filter(i => matches(i, filters, prev)).length;
  const delta = visNow.length - openPrev;

  return {
    dataStart, viewStart, viewEnd, now,
    regions: regionsOut, markers, ranked, unmapped, unmappedVisible, chipCounts,
    areaPath: area, linePath: line, ticks,
    dateLabel: fmtDate(now), viewEndLabel: fmtDate(viewEnd),
    selRegion,
    openTotal: visNow.length, openCount, closedCount,
    trendArrow: delta > 0 ? '▲' : delta < 0 ? '▼' : '—',
    trendColor: delta > 0 ? '#ff7a6c' : delta < 0 ? '#5fd0a0' : '#8b919c',
    trendText: `${delta > 0 ? '+' : ''}${delta} vs 30d ago`,
    totalCount: scope.filter(i => filters.sev[i.severity] && i.createdAt <= now).length,
    resolvedCount: scope.filter(i => filters.sev[i.severity] && i.resolvedAt != null && i.resolvedAt <= now).length,
    visibleTickets: visNow
  };
}

export { rectCorners, rgba };
