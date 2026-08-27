// Dev-only stand-in for the Forge resolver — see api.js for when this is
// used. Deliberately smaller than the real mock dataset (src/resolvers/
// domain/sampleData.js): its only job is letting every screen and
// interaction be clicked through in a plain browser during development.
function mulberry32(seed) {
  let a = seed;
  return function rnd() {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const DAY = 86400000;
const DATA_START = Date.parse('2025-01-01T00:00:00Z');
const DATA_END = Date.parse('2026-06-29T00:00:00Z');

const SPACES = [
  { key: 'RB', name: 'RB — Retail Banking', versions: ['2026.8.0', '2026.9.0', '2026.10.0'] },
  { key: 'PP', name: 'PP — Payments Platform', versions: ['R14.2', 'R14.3', 'R15.0'] },
  { key: 'DC', name: 'DC — Digital Channels', versions: ['Sprint 41', 'Sprint 42', '2027.1.0'] }
];
const COMPONENTS = ['Payments', 'Checkout', 'Back Office', 'Reporting', 'Platform API', 'Notifications', 'Identity & Access'];
const TITLES = {
  requirements: ['Unclear requirement for timeout behavior', 'No spec for the retry limit'],
  design: ['Missing designed empty state', 'Icon inconsistent with the rest of the flow'],
  code: ['Off-by-one on the last page of results', 'Silent failure when the upstream call times out'],
  regression: ['Broke after the last deploy', 'Stopped firing after the routing change']
};

function seedArtifacts() {
  const rnd = mulberry32(20260629);
  const defs = [
    { id: 'mbt', name: 'Money transfer flow', component: 'Payments', space: 'PP — Payments Platform', demoColor: ['#123', '#2a5'], regions: [
      { id: 'r1', name: 'AML match handling', x: 40, y: 40, w: 300, h: 200 },
      { id: 'r2', name: 'Compliance hold actions', x: 400, y: 60, w: 280, h: 180 },
      { id: 'r3', name: 'Duplicate & cutoff checks', x: 740, y: 40, w: 320, h: 220 }
    ] },
    { id: 'process', name: 'Order-to-cash process', component: 'Checkout', space: 'RB — Retail Banking', demoColor: ['#312', '#a52'], regions: [
      { id: 'r4', name: 'Enquiry → Quotation', x: 60, y: 60, w: 260, h: 240 },
      { id: 'r5', name: 'Service Order → Service', x: 400, y: 300, w: 500, h: 240 }
    ] }
  ];
  let n = 1042;
  const issuesByArtifact = {};
  for (const a of defs) {
    const spaceMeta = SPACES.find(s => s.name === a.space);
    const issues = [];
    for (const region of a.regions) {
      for (let i = 0; i < 9; i++) {
        const created = Math.round(DATA_START + rnd() * (DATA_END - DATA_START));
        const sev = rnd() < 0.2 ? 'critical' : rnd() < 0.6 ? 'major' : 'minor';
        const cause = ['requirements', 'design', 'code', 'regression'][Math.floor(rnd() * 4)];
        const resolved = rnd() < 0.5 ? Math.min(DATA_END, created + (10 + rnd() * 120) * DAY) : null;
        issues.push({
          key: 'WEB-' + n++,
          component: a.component,
          componentAspect: rnd() < 0.85 ? region.name : '',
          severity: sev,
          status: resolved ? 'closed' : 'open',
          rootCause: cause,
          title: TITLES[cause][i % 2],
          reporter: ['A. Okafor', 'M. Lindqvist', 'R. Chen'][i % 3],
          createdAt: created,
          resolvedAt: resolved ? Math.round(resolved) : null,
          fixVersion: spaceMeta.versions[i % spaceMeta.versions.length]
        });
      }
    }
    issuesByArtifact[a.id] = issues;
  }

  return {
    artifacts: defs.map(a => ({
      id: a.id, name: a.name, component: a.component, space: a.space,
      imageRef: { kind: 'demo-gradient', colors: a.demoColor },
      imageUrl: '',
      regions: a.regions.map(r => ({ id: r.id, name: r.name, points: [[r.x, r.y], [r.x + r.w, r.y + r.h]] }))
    })),
    issuesByArtifact
  };
}

const seed = seedArtifacts();

const state = {
  scope: { space: 'PP — Payments Platform', fixVersion: 'R14.3' },
  jql: '',
  lastSync: null,
  conflicts: [],
  localEdits: {},
  syncCount: 0,
  artifacts: seed.artifacts,
  members: [{ accountId: 'dev-user', role: 'editor', displayName: 'Dev User' }],
  user: { accountId: 'dev-user', role: 'editor', isAdmin: true }
};

function jqlFor(space, fixVersion) {
  const key = (space || '').split(' — ')[0];
  return `spaceJira = ${key || '?'} AND fixVersion = "${fixVersion || '?'}" AND issuetype = Bug AND resolution not in ("Won't Do", Duplicate, "Cannot Reproduce")`;
}

function currentIssues() {
  const out = [];
  for (const a of state.artifacts) {
    for (const raw of seed.issuesByArtifact[a.id] || []) {
      if (raw.fixVersion !== state.scope.fixVersion) continue;
      const edits = state.localEdits[raw.key] || {};
      let status = raw.status, severity = raw.severity;
      if (edits.status && !state.conflicts.some(c => c.issueKey === raw.key && c.field === 'status')) status = edits.status.value;
      if (edits.severity && !state.conflicts.some(c => c.issueKey === raw.key && c.field === 'severity')) severity = edits.severity.value;
      out.push({ ...raw, status, severity });
    }
  }
  return out;
}

const handlers = {
  async bootstrap() {
    return {
      user: state.user,
      spaces: SPACES.map(s => ({ key: s.key, name: s.name })),
      fixVersions: SPACES.find(s => s.name === state.scope.space).versions,
      scope: state.scope,
      jql: state.jql || jqlFor(state.scope.space, state.scope.fixVersion),
      lastSync: state.lastSync,
      conflicts: state.conflicts,
      components: COMPONENTS,
      artifacts: state.artifacts,
      members: state.members
    };
  },
  async setScope({ space, fixVersion }) {
    state.scope = { space, fixVersion: fixVersion || '' };
    state.jql = space ? jqlFor(space, state.scope.fixVersion) : '';
    return { scope: state.scope, fixVersions: space ? SPACES.find(s => s.name === space).versions : [], jql: state.jql, artifacts: state.artifacts, components: COMPONENTS };
  },
  async setJql({ jql }) { state.jql = jql; return { jql }; },
  async sync() {
    state.syncCount++;
    state.lastSync = Date.now();
    // Manufacture one deterministic conflict on the 2nd sync so the
    // conflict-resolution UI is reachable without relying on chance.
    if (state.syncCount === 2) {
      const withEdit = Object.keys(state.localEdits)[0];
      if (withEdit) {
        const field = Object.keys(state.localEdits[withEdit])[0];
        state.conflicts = [{ issueKey: withEdit, field, atlasValue: state.localEdits[withEdit][field].value, jiraValue: field === 'status' ? 'open' : 'critical', atlasChangedAt: Date.now(), jiraChangedAt: Date.now() }];
      }
    }
    return { lastSync: state.lastSync, conflicts: state.conflicts, issues: currentIssues() };
  },
  async getIssues() { return { issues: currentIssues() }; },
  async setIssueField({ issueKey, field, value }) {
    state.localEdits[issueKey] = { ...(state.localEdits[issueKey] || {}), [field]: { value, editedAt: Date.now() } };
    return { ok: true };
  },
  async resolveConflict({ issueKey, field }) {
    state.conflicts = state.conflicts.filter(c => !(c.issueKey === issueKey && c.field === field));
    return { conflicts: state.conflicts };
  },
  async uploadArtifact({ filename, dataUrl }) {
    const id = 'a' + Date.now();
    state.artifacts.push({ id, name: filename.replace(/\.[^.]+$/, ''), component: '', imageRef: { kind: 'upload' }, imageUrl: dataUrl, regions: [] });
    seed.issuesByArtifact[id] = [];
    return { artifacts: state.artifacts, selectedId: id };
  },
  async renameArtifact({ id, name }) {
    state.artifacts = state.artifacts.map(a => (a.id === id ? { ...a, name } : a));
    return { artifacts: state.artifacts };
  },
  async deleteArtifact({ id }) {
    if (state.artifacts.length <= 1) throw new Error('The last remaining artifact cannot be deleted.');
    state.artifacts = state.artifacts.filter(a => a.id !== id);
    return { artifacts: state.artifacts, fallbackId: state.artifacts[0].id };
  },
  async setArtifactComponent({ id, component }) {
    state.artifacts = state.artifacts.map(a => (a.id === id ? { ...a, component } : a));
    return { artifacts: state.artifacts };
  },
  async createRegion({ artifactId, name, points }) {
    const a = state.artifacts.find(x => x.id === artifactId);
    if (!a.component) throw new Error('Assign a Jira component to this artifact before drawing a Component-Aspect on it.');
    if (a.regions.some(r => r.name.toLowerCase() === name.toLowerCase())) throw new Error('A Component-Aspect with that name already exists on this artifact.');
    const region = { id: 'r' + Date.now(), name, points };
    a.regions.push(region);
    return { artifacts: state.artifacts, regionId: region.id };
  },
  async renameRegion({ artifactId, regionId, name }) {
    const a = state.artifacts.find(x => x.id === artifactId);
    a.regions = a.regions.map(r => (r.id === regionId ? { ...r, name } : r));
    return { artifacts: state.artifacts };
  },
  async deleteRegion({ artifactId, regionId }) {
    const a = state.artifacts.find(x => x.id === artifactId);
    a.regions = a.regions.filter(r => r.id !== regionId);
    return { artifacts: state.artifacts };
  },
  async updateRegionPoints({ artifactId, regionId, points }) {
    const a = state.artifacts.find(x => x.id === artifactId);
    a.regions = a.regions.map(r => (r.id === regionId ? { ...r, points } : r));
    return { artifacts: state.artifacts };
  },
  async getMembers() { return { members: state.members }; },
  async setMemberRole({ accountId, role, displayName }) {
    const idx = state.members.findIndex(m => m.accountId === accountId);
    if (idx === -1) state.members.push({ accountId, role, displayName });
    else state.members[idx] = { ...state.members[idx], role, displayName };
    return { members: state.members };
  }
};

export async function invoke(name, payload) {
  const fn = handlers[name];
  if (!fn) throw new Error(`devBackend: no handler for "${name}"`);
  await new Promise(r => setTimeout(r, 40)); // rough network-latency feel
  return fn(payload || {});
}
