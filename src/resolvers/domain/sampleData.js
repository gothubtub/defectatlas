// Seed data for the mocked Jira layer (see src/resolvers/jira/mockClient.js).
//
// Adapted from the interactive prototype's client-side generator with one
// deliberate change: the prototype matched a ticket to a region by testing
// whether a fabricated (x, y) point fell inside the region's rectangle —
// a demo-only device, since the prototype had no real Jira field to key
// off. The BRD (section 6, "Association") specifies the real mechanism:
// an issue binds to a Component-Aspect by matching its Component-Aspect
// field value against the region's name. This module generates issues
// that way instead, and a fraction are deliberately left unmapped so
// UC-02's "unmapped issues" behavior has something to show.
const { mulberry32 } = require('./rng');

const SPACES = [
  { key: 'RB', name: 'RB — Retail Banking', versions: ['2026.8.0', '2026.9.0', '2026.10.0'] },
  { key: 'PP', name: 'PP — Payments Platform', versions: ['R14.2', 'R14.3', 'R15.0'] },
  { key: 'DC', name: 'DC — Digital Channels', versions: ['Sprint 41', 'Sprint 42', '2027.1.0'] }
];

const COMPONENTS = ['Payments', 'Checkout', 'Back Office', 'Reporting', 'Platform API', 'Notifications', 'Identity & Access'];

const REPORTERS = ['A. Okafor', 'M. Lindqvist', 'R. Chen', 'S. Patel', 'D. Romano', 'K. Nguyen', 'J. Weiss', 'T. Alvarez', 'L. Haddad', 'P. Novak'];

// Jira status -> atlas status, per BRD section 6.
const STATUS_MAPPING = {
  'To Do': 'open',
  'In Progress': 'open',
  Done: 'closed',
  "Won't Do": 'excluded',
  Duplicate: 'excluded',
  'Cannot Reproduce': 'excluded'
};
const OPEN_STATUSES = ['To Do', 'In Progress'];

function jqlFor(spaceKey, fixVersion) {
  return (
    'spaceJira = ' + (spaceKey || '?') +
    ' AND fixVersion = "' + (fixVersion || '?') + '"' +
    ' AND issuetype = Bug' +
    ' AND resolution not in ("Won\'t Do", Duplicate, "Cannot Reproduce")'
  );
}

// Each default artifact ships with a handful of pre-drawn Component-Aspect
// regions so the demo library isn't empty on first install. Real usage
// (UC-07) draws these from scratch; these are seed data only.
// Coordinates are on the BRD's fixed 1120x680 logical canvas.
const DEFAULT_ARTIFACTS = [
  {
    id: 'mbt',
    name: 'Money transfer flow',
    image: 'demo/money-transfer-flow.png',
    component: 'Payments',
    space: 'PP — Payments Platform',
    regions: [
      { id: 'mbt_match', name: 'AML match handling', x: 93, y: 0, w: 162, h: 85, inc: '2025-09-05', incMag: 6, base: 6, titles: {
        requirements: ['Unclear requirement for SLA on compliance officer review', 'No spec for what happens if the officer takes no action'],
        design: ['Compliance Officer Action diamond lacks a legend for Y/N outcomes', 'Potential Match Message has no designed escalation state'],
        code: ['Compliance Officer Action defaults to approve on timeout', 'Potential Match Message doesn’t attach the matched watchlist entry'],
        regression: ['Officer Action stopped routing to End after the workflow-engine upgrade', 'Match message duplicated after the last deploy']
      } },
      { id: 'mbt_hold', name: 'Compliance hold actions', x: 503, y: 23, w: 216, h: 62, inc: '2025-11-30', incMag: 5, base: 5, titles: {
        requirements: ['Unclear requirement for hold expiry duration', 'No spec for notifying the customer during a hold'],
        design: ['Compliance Hold card lacks a designed released state', 'Notify Compliance Operations has no priority indicator'],
        code: ['Transfer stuck in hold after operations acknowledges', 'Notify Compliance Operations fires twice for the same transfer'],
        regression: ['Compliance Hold stopped blocking settlement after the last release', 'Notify step stopped reaching the operations queue after routing change']
      } },
      { id: 'mbt_dup', name: 'Duplicate & cutoff checks', x: 719, y: 23, w: 251, h: 132, inc: '2026-02-10', incMag: 7, base: 8, titles: {
        requirements: ['Unclear requirement for duplicate detection window', 'No spec for overriding a cutoff-time block'],
        design: ['Duplicate Warning lacks a designed dismiss action', 'Transfer Cut-off Time diamond legend missing for after-hours case'],
        code: ['Duplicate Detected check misses same-day repeat transfers', 'Cut-off Time check uses local time instead of bank timezone'],
        regression: ['Duplicate Warning stopped appearing after the fraud-service migration', 'Cutoff check regressed after the timezone library bump']
      } },
      { id: 'mbt_sched', name: 'Scheduled transfer flow', x: 93, y: 166, w: 549, h: 74, inc: '2025-08-14', incMag: 6, base: 7, titles: {
        requirements: ['Unclear requirement for max future-dated schedule window', 'No spec for editing a saved draft transfer'],
        design: ['Save As Draft lacks a designed confirmation toast', 'Transfer Confirmation Screen with IMAD overflows on long reference numbers'],
        code: ['Schedule Transfer doesn’t validate business-day settlement', 'Queue for Settlement drops the transfer if the queue restarts'],
        regression: ['Confirmation Summary stopped showing IMAD after the last deploy', 'Save As Draft stopped persisting after the state-library bump']
      } },
      { id: 'mbt_validate', name: 'Transfer validation chain', x: 93, y: 348, w: 599, h: 58, inc: '2025-09-05', incMag: 9, base: 10, titles: {
        requirements: ['Unclear requirement for session timeout during validation', 'No spec for partial beneficiary validation retries'],
        design: ['OFAC Screening step lacks a designed pending state', 'Within Transaction Limits diamond too close to Beneficiary Validation at smaller scales'],
        code: ['Sufficient Available Balance check ignores pending holds', 'Beneficiary Validation passes on a partial name match'],
        regression: ['OFAC Screening stopped blocking flagged names after the vendor API migration', 'Transaction Limits check reverted to per-day only after refactor']
      } },
      { id: 'mbt_errors', name: 'Validation error handling', x: 422, y: 387, w: 270, h: 174, inc: '2025-12-18', incMag: 5, base: 5, titles: {
        requirements: ['Unclear requirement for retry count before Error and Exception Queue', 'No spec for customer-facing copy on Invalid Routing/Error'],
        design: ['Limit Exceeded Error lacks a designed next-step CTA', 'Invalid Routing/Error visually identical to Funds Unavailable Notice'],
        code: ['Funds Unavailable Notice shows stale balance after retry', 'Invalid Routing/Error doesn’t log the failed routing number'],
        regression: ['Limit Exceeded Error stopped showing the limit amount after copy update', 'Error and Exception Queue stopped receiving items after the queue migration']
      } }
    ]
  },
  {
    id: 'process',
    name: 'Order-to-cash process',
    image: 'demo/order-to-cash-process.jpg',
    component: 'Checkout',
    space: 'RB — Retail Banking',
    regions: [
      { id: 'p_quote', name: 'Enquiry → Quotation', x: 0, y: 0, w: 220, h: 300, inc: '2025-08-04', incMag: 5, base: 5, titles: {
        requirements: ['Unclear requirement for quote expiry window', 'No spec for multi-currency quotes'],
        design: ['Quotation state icon inconsistent with Enquiry state', 'No empty-state design for a quote with zero line items'],
        code: ['Quotation totals miscalculate with mixed tax rates', 'Enquiry status doesn’t transition after quote approval'],
        regression: ['Quote-to-order handoff broke after the pricing engine migration', 'Enquiry form validation regressed after the last deploy']
      } },
      { id: 'p_service', name: 'Service Order → Service', x: 0, y: 300, w: 700, h: 240, inc: '2025-11-11', incMag: 7, base: 8, titles: {
        requirements: ['Unclear requirement for what triggers the Yes/No branch', 'No spec for partial service completion'],
        design: ['Decision diamond legend never designed for non-technical users', 'No visual distinction between hire vs in-house paths'],
        code: ['Service Order stuck in “No” branch when resource is unavailable', 'Purchase Request duplicates when resubmitted after timeout'],
        regression: ['Branch routing to Purchase Order broke after the workflow-engine upgrade', 'Service Order stopped closing automatically after the last release']
      } },
      { id: 'p_purchase', name: 'Purchase Request → AP Invoice', x: 400, y: 0, w: 720, h: 300, inc: '2026-01-22', incMag: 6, base: 6, titles: {
        requirements: ['Unclear requirement for approval threshold on Purchase Orders', 'No spec for hire-vehicle cancellation flow'],
        design: ['Purchase Order card lacks a designed rejected state', 'AP Invoice arrow overlaps Purchase Order box at narrow widths'],
        code: ['Purchase Request doesn’t inherit vendor from prior order', 'AP Invoice total drifts from Purchase Order due to rounding'],
        regression: ['AP Invoice generation stalled after the accounting-system migration', 'Purchase Order approval email stopped sending after refactor']
      } },
      { id: 'p_pay', name: 'POD → Payments', x: 0, y: 540, w: 1120, h: 140, inc: '2025-09-30', incMag: 4, base: 5, titles: {
        requirements: ['Unclear requirement for partial payment matching', 'No spec for POD rejection reasons'],
        design: ['Incoming/Outgoing payment cards visually identical', 'AR Invoice lacks a designed overdue state'],
        code: ['Incoming Payment doesn’t reconcile against AR Invoice number', 'Outgoing Payment fires twice on double-click'],
        regression: ['AR Invoice numbering collided after the ERP sync change', 'POD confirmation stopped updating Service Order status']
      } }
    ]
  },
  {
    id: 'arch',
    name: 'System architecture',
    image: 'demo/system-architecture.png',
    component: 'Platform API',
    space: 'DC — Digital Channels',
    regions: [
      { id: 'a_client', name: 'Web / Mobile / DNS', x: 0, y: 0, w: 1120, h: 340, inc: '2025-07-14', incMag: 6, base: 6, titles: {
        requirements: ['Unclear requirement for mobile offline fallback', 'No spec for DNS failover priority'],
        design: ['CDN routing diagram lacks a legend for cache miss', 'No designed error state for DNS resolution failure'],
        code: ['Mobile client retries DNS lookup in a tight loop', 'CDN cache key omits query params, causing stale content'],
        regression: ['Web Browser → CDN path broke after the routing config change', 'Mobile push stopped reaching CDN after last deploy']
      } },
      { id: 'a_app', name: 'Load Balancer / App tier', x: 0, y: 340, w: 500, h: 340, inc: '2025-10-19', incMag: 8, base: 9, titles: {
        requirements: ['Unclear requirement for autoscaling thresholds', 'No spec for graceful VM drain during deploys'],
        design: ['App Frontend/Backend diagram missing a legend for VM color coding', 'No designed alert for Load Balancer saturation'],
        code: ['Load Balancer sticky session breaks on VM restart', 'DB Cache invalidation race condition on write-heavy paths'],
        regression: ['App Server stopped reading NoSQL Database after the driver upgrade', 'Load Balancer health check flapped after the last config push']
      } },
      { id: 'a_storage', name: 'Cloud Storage / Media', x: 500, y: 340, w: 620, h: 220, inc: '2026-02-27', incMag: 5, base: 5, titles: {
        requirements: ['Unclear requirement for max media file size', 'No spec for Video Convertor retry policy'],
        design: ['Content Filter box lacks a designed rejected-media state', 'External Storage arrows overlap at smaller diagram scales'],
        code: ['Video Convertor drops audio track on certain codecs', 'Content Filter false-flags high-motion video as unsafe'],
        regression: ['Media Files → External Storage path stalled after the storage-provider migration', 'Video Convertor queue backed up after the last deploy']
      } },
      { id: 'a_data', name: 'Data Warehouse / BI', x: 500, y: 560, w: 620, h: 120, inc: '2025-12-02', incMag: 4, base: 4, titles: {
        requirements: ['Unclear requirement for ETL retry cadence', 'No spec for Business Intelligence access control'],
        design: ['Data Warehouse diagram lacks a legend for hot vs cold data', 'Hadoop/Spark box visually indistinguishable from storage boxes'],
        code: ['ETL job silently drops rows with null user IDs', 'Business Intelligence dashboard reads a stale Data Warehouse snapshot'],
        regression: ['ETL pipeline broke after the Data Warehouse schema migration', 'Hadoop/Spark job stopped triggering after the scheduler upgrade']
      } }
    ]
  },
  {
    id: 'backoffice',
    name: 'Back office UI',
    image: 'demo/back-office-ui.png',
    component: 'Back Office',
    space: 'RB — Retail Banking',
    regions: [
      { id: 'bo_side', name: 'Sidebar nav', x: 0, y: 0, w: 220, h: 680, inc: '2025-08-21', incMag: 4, base: 4, titles: {
        requirements: ['Unclear requirement for which item highlights on sub-routes', 'No spec for collapsed-sidebar behavior on tablet'],
        design: ['Active state on “Dashboard” too subtle against the blue background', 'Icon set inconsistent in stroke weight across items'],
        code: ['Sidebar item click sometimes navigates to the wrong route', 'Documents icon fails to render on first paint'],
        regression: ['Sidebar collapsed on desktop after the last responsive rewrite', 'Fees item stopped showing its badge count after refactor']
      } },
      { id: 'bo_alert', name: 'Alert banner', x: 220, y: 60, w: 900, h: 60, inc: '2026-01-09', incMag: 3, base: 3, titles: {
        requirements: ['Unclear requirement for snooze duration', 'No spec for multiple simultaneous alerts'],
        design: ['Snooze and Done buttons have insufficient contrast against each other', 'Alert banner lacks a designed dismissed state'],
        code: ['Snooze button doesn’t actually delay the alert re-trigger', 'Done button double-fires the completion event'],
        regression: ['Alert banner stopped appearing after the notifications-service migration', 'Phone number link stopped opening the dialer after last release']
      } },
      { id: 'bo_activities', name: 'Client activities table', x: 220, y: 130, w: 900, h: 420, inc: '2025-10-05', incMag: 9, base: 10, titles: {
        requirements: ['Unclear requirement for default status filter', 'No spec for bulk-verifying multiple clients at once'],
        design: ['Status pill colors too similar between Processing and In review', 'Search field lacks a designed empty-results state'],
        code: ['Verify Client button stays enabled with no row selected', 'Status filter counts don’t match the filtered table rows'],
        regression: ['Table sort by Status stopped working after the last deploy', 'Add New Client modal stopped closing after save']
      } },
      { id: 'bo_calendar', name: 'My calendar panel', x: 880, y: 40, w: 240, h: 600, inc: '2025-12-15', incMag: 5, base: 5, titles: {
        requirements: ['Unclear requirement for calendar timezone display', 'No spec for recurring reminder behavior'],
        design: ['Meeting link color fails contrast against the light background', 'Add New Task button placement inconsistent with other primary actions'],
        code: ['Calendar view toggle doesn’t persist between sessions', 'Reminders tab shows Trainings items by mistake'],
        regression: ['Meeting links stopped opening client profiles after the routing change', 'Calendar list view stopped updating after new task creation']
      } }
    ]
  }
];

const DATA_START = Date.parse('2025-01-01T00:00:00Z');
const DATA_END = Date.parse('2026-06-29T00:00:00Z');
const DAY = 86400000;

function rectPoints(r) {
  return [[r.x, r.y], [r.x + r.w, r.y + r.h]];
}

// Deterministic issue generation, seeded so re-running the mock sync
// yields the same base dataset — new "incoming changes" (see mockClient)
// are layered on top per sync, not baked in here.
function generateIssues() {
  const rnd = mulberry32(20260629);
  const W = { critical: 3, major: 2, minor: 1 };
  const issues = [];
  let n = 1042;
  for (const artifact of DEFAULT_ARTIFACTS) {
    const space = SPACES.find(s => s.name === artifact.space);
    for (const region of artifact.regions) {
      const incTs = Date.parse(region.inc + 'T00:00:00Z');
      const count = region.base + region.incMag + 2;
      for (let i = 0; i < count; i++) {
        let created = rnd() < 0.45 ? incTs + (rnd() - rnd()) * 22 * DAY : DATA_START + rnd() * (DATA_END - DATA_START);
        created = Math.max(DATA_START + DAY, Math.min(DATA_END - DAY, created));
        const sr = rnd();
        const severity = sr < 0.18 ? 'critical' : sr < 0.6 ? 'major' : 'minor';
        const cr = rnd();
        const rootCause = cr < 0.22 ? 'requirements' : cr < 0.47 ? 'design' : cr < 0.78 ? 'code' : 'regression';
        const titlePool = region.titles[rootCause];
        const excluded = rnd() < 0.14;
        const excludedResolution = excluded ? ['Won\'t Do', 'Duplicate', 'Cannot Reproduce'][Math.floor(rnd() * 3)] : null;
        let resolvedAt = null;
        let rawStatus = OPEN_STATUSES[rnd() < 0.4 ? 0 : 1];
        if (!excluded && rnd() >= 0.13) {
          const life = (6 + rnd() * 90 + (severity === 'critical' ? rnd() * 70 : 0)) * DAY;
          const rr = created + life;
          if (rr <= DATA_END) { resolvedAt = Math.round(rr); rawStatus = 'Done'; }
        }
        if (excluded) rawStatus = excludedResolution;
        // ~8% of issues in a region carry a value that matches no drawn
        // region (BRD: "unmapped" — component-level only), a further ~4%
        // are cross-mapped to a sibling region on the same artifact so
        // Component-Aspect switches show live redistribution.
        const mapRoll = rnd();
        let componentAspect = region.name;
        if (mapRoll < 0.08) componentAspect = '';
        else if (mapRoll < 0.12) {
          const siblings = artifact.regions.filter(r => r.id !== region.id);
          if (siblings.length) componentAspect = siblings[Math.floor(rnd() * siblings.length)].name;
        }
        issues.push({
          key: 'WEB-' + n++,
          artifactId: artifact.id,
          component: artifact.component,
          space: artifact.space,
          fixVersion: space.versions[Math.floor(((created - DATA_START) / (DATA_END - DATA_START)) * space.versions.length) % space.versions.length],
          componentAspect,
          severity,
          rawStatus,
          rootCause,
          title: titlePool[i % titlePool.length],
          reporter: REPORTERS[(i * 3 + region.id.length) % REPORTERS.length],
          createdAt: Math.round(created),
          resolvedAt,
          updatedAt: resolvedAt || Math.round(created)
        });
      }
    }
  }
  return issues;
}

module.exports = {
  SPACES,
  COMPONENTS,
  STATUS_MAPPING,
  OPEN_STATUSES,
  DEFAULT_ARTIFACTS,
  DATA_START,
  DATA_END,
  DAY,
  jqlFor,
  rectPoints,
  generateIssues
};
