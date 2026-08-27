const Resolver = require('@forge/resolver').default;
const jira = require('./jira');
const store = require('./store');
const roles = require('./store/roles');
const scopeStore = require('./store/scope');

const resolver = new Resolver();

function requireRole(role, allowed) {
  if (!allowed.includes(role)) {
    throw new Error(`This action requires ${allowed.join(' or ')} — you are ${role}.`);
  }
}

const MIN_REGION_SIZE = 8; // logical px on the 1120x680 canvas, mirrors the prototype's drag-too-small discard

function clampPoint([x, y]) {
  return [Math.max(0, Math.min(1120, x)), Math.max(0, Math.min(680, y))];
}

function rectFromPoints(points) {
  const [p1, p2] = points;
  const x = Math.min(p1[0], p2[0]), y = Math.min(p1[1], p2[1]);
  return { x, y, w: Math.abs(p2[0] - p1[0]), h: Math.abs(p2[1] - p1[1]) };
}

async function currentUser(ctx) {
  const accountId = ctx.accountId || (ctx.principal && ctx.principal.accountId) || 'anonymous';
  const role = await roles.getRole(accountId);
  const isAdmin = await roles.isSiteAdmin(accountId);
  return { accountId, role, isAdmin };
}

async function loadWorkspace(space) {
  return store.getWorkspaceDoc(space);
}
async function saveWorkspace(space, doc) {
  return store.setWorkspaceDoc(space, doc);
}

function artifactsForResponse(doc) {
  return doc.artifacts.map(a => ({ ...a, imageUrl: store.resolveImageUrl(a.imageRef) }));
}

resolver.define('bootstrap', async ({ context }) => {
  const user = await currentUser(context);
  const spaces = await jira.listSpaces();
  const scope = await scopeStore.getScope();
  const fixVersions = scope.space ? await jira.listFixVersions(scope.space) : [];
  const doc = await loadWorkspace(scope.space);
  const members = user.isAdmin ? await roles.getMembers() : [];

  return {
    user,
    spaces,
    fixVersions,
    scope,
    jql: doc.connection.jql || (scope.space ? await jira.defaultJql(scope.space, scope.fixVersion) : ''),
    lastSync: doc.connection.lastSync,
    conflicts: doc.connection.conflicts || [],
    components: doc.components,
    artifacts: artifactsForResponse(doc),
    members
  };
});

resolver.define('setScope', async ({ context, payload }) => {
  const user = await currentUser(context);
  requireRole(user.role, ['editor']);
  const { space, fixVersion } = payload;
  const scope = await scopeStore.setScope({ space: space || '', fixVersion: space ? fixVersion || '' : '' });
  const doc = await loadWorkspace(scope.space);
  if (scope.space && !doc.connection.jql) {
    doc.connection.jql = await jira.defaultJql(scope.space, scope.fixVersion);
    await saveWorkspace(scope.space, doc);
  }
  // Space changed: regenerate JQL and drop the fix-version-specific override,
  // matching the prototype's setJira() rule.
  const fixVersions = scope.space ? await jira.listFixVersions(scope.space) : [];
  return { scope, fixVersions, jql: doc.connection.jql, artifacts: artifactsForResponse(doc), components: doc.components };
});

resolver.define('setJql', async ({ context, payload }) => {
  const user = await currentUser(context);
  requireRole(user.role, ['editor']);
  const scope = await scopeStore.getScope();
  if (!scope.space) throw new Error('Select a space first.');
  const doc = await loadWorkspace(scope.space);
  doc.connection.jql = payload.jql;
  await saveWorkspace(scope.space, doc);
  return { jql: doc.connection.jql };
});

resolver.define('sync', async ({ context }) => {
  const user = await currentUser(context);
  requireRole(user.role, ['editor']);
  const scope = await scopeStore.getScope();
  if (!scope.space || !scope.fixVersion) throw new Error('Space and Fix Version are both required to sync.');
  const doc = await loadWorkspace(scope.space);
  const conn = doc.connection;
  conn.syncCount = (conn.syncCount || 0) + 1;

  let result;
  try {
    result = await jira.searchIssues({ space: scope.space, fixVersion: scope.fixVersion, jql: conn.jql, syncCount: conn.syncCount, localEdits: conn.localEdits || {} });
  } catch (err) {
    // BRD §6 Failure handling: prior data + prior lastSync stay untouched.
    throw new Error(`Sync failed, previous data kept: ${err.message}`);
  }

  // Push every local edit that did NOT collide this round, then drop it
  // from the pending set; edits that collided stay pending until resolved.
  const stillPending = {};
  const conflictedKeys = new Set(result.conflicts.map(c => c.issueKey + ':' + c.field));
  for (const [issueKey, fields] of Object.entries(conn.localEdits || {})) {
    const kept = {};
    for (const [field, edit] of Object.entries(fields)) {
      if (conflictedKeys.has(issueKey + ':' + field)) { kept[field] = edit; continue; }
      await jira.updateIssue(issueKey, { [field]: edit.value });
    }
    if (Object.keys(kept).length) stillPending[issueKey] = kept;
  }

  conn.localEdits = stillPending;
  conn.conflicts = result.conflicts;
  conn.lastSync = Date.now();
  doc.issuesCache = result.issues; // last synced snapshot, used to render without re-hitting Jira on every filter change
  await saveWorkspace(scope.space, doc);

  return { lastSync: conn.lastSync, conflicts: conn.conflicts, issues: result.issues };
});

resolver.define('getIssues', async ({ context }) => {
  const scope = await scopeStore.getScope();
  if (!scope.space) return { issues: [] };
  const doc = await loadWorkspace(scope.space);
  return { issues: doc.issuesCache || [] };
});

resolver.define('setIssueField', async ({ context, payload }) => {
  const user = await currentUser(context);
  requireRole(user.role, ['editor']);
  const { issueKey, field, value } = payload;
  if (field !== 'status' && field !== 'severity') throw new Error('field must be "status" or "severity"');
  const scope = await scopeStore.getScope();
  const doc = await loadWorkspace(scope.space);
  const conflict = (doc.connection.conflicts || []).find(c => c.issueKey === issueKey && c.field === field);
  if (conflict) throw new Error('This field is conflicted — resolve the conflict before editing it.');
  doc.connection.localEdits = doc.connection.localEdits || {};
  doc.connection.localEdits[issueKey] = { ...(doc.connection.localEdits[issueKey] || {}), [field]: { value, editedAt: Date.now() } };
  // Reflect the pending edit immediately in the cached issue list so the
  // UI updates without waiting for the next sync.
  if (doc.issuesCache) {
    doc.issuesCache = doc.issuesCache.map(i => (i.key === issueKey ? { ...i, [field]: value } : i));
  }
  await saveWorkspace(scope.space, doc);
  return { ok: true };
});

resolver.define('resolveConflict', async ({ context, payload }) => {
  const user = await currentUser(context);
  requireRole(user.role, ['editor']);
  const { issueKey, field, choice } = payload; // choice: 'atlas' | 'jira'
  const scope = await scopeStore.getScope();
  const doc = await loadWorkspace(scope.space);
  const conflict = (doc.connection.conflicts || []).find(c => c.issueKey === issueKey && c.field === field);
  if (!conflict) throw new Error('No such conflict.');

  if (choice === 'atlas') {
    await jira.updateIssue(issueKey, { [field]: conflict.atlasValue });
  } else if (doc.issuesCache) {
    doc.issuesCache = doc.issuesCache.map(i => (i.key === issueKey ? { ...i, [field]: conflict.jiraValue } : i));
  }
  if (doc.connection.localEdits && doc.connection.localEdits[issueKey]) {
    delete doc.connection.localEdits[issueKey][field];
    if (Object.keys(doc.connection.localEdits[issueKey]).length === 0) delete doc.connection.localEdits[issueKey];
  }
  doc.connection.conflicts = doc.connection.conflicts.filter(c => !(c.issueKey === issueKey && c.field === field));
  doc.connection.conflictResolutions = doc.connection.conflictResolutions || [];
  doc.connection.conflictResolutions.push({ issueKey, field, choice, resolvedBy: user.accountId, resolvedAt: Date.now() });
  await saveWorkspace(scope.space, doc);
  return { conflicts: doc.connection.conflicts };
});

resolver.define('uploadArtifact', async ({ context, payload }) => {
  const user = await currentUser(context);
  requireRole(user.role, ['editor']);
  const scope = await scopeStore.getScope();
  if (!scope.space) throw new Error('Select a space first.');
  const { filename, dataUrl } = payload;
  const doc = await loadWorkspace(scope.space);

  const base = filename.replace(/\.[^.]+$/, '');
  let name = base, n = 2;
  while (doc.artifacts.some(a => a.name === name)) name = `${base} (${n++})`;

  const imageRef = await store.uploadArtifactImage(scope.space, 'a' + Date.now(), filename, dataUrl);
  const artifact = { id: 'a' + Date.now(), name, component: '', imageRef, regions: [], uploadedBy: user.accountId, uploadedAt: Date.now() };
  doc.artifacts.push(artifact);
  await saveWorkspace(scope.space, doc);
  return { artifacts: artifactsForResponse(doc), selectedId: artifact.id };
});

resolver.define('renameArtifact', async ({ context, payload }) => {
  const user = await currentUser(context);
  requireRole(user.role, ['editor']);
  const scope = await scopeStore.getScope();
  const doc = await loadWorkspace(scope.space);
  const name = (payload.name || '').trim();
  if (!name) throw new Error('Name cannot be empty.');
  doc.artifacts = doc.artifacts.map(a => (a.id === payload.id ? { ...a, name } : a));
  await saveWorkspace(scope.space, doc);
  return { artifacts: artifactsForResponse(doc) };
});

resolver.define('deleteArtifact', async ({ context, payload }) => {
  const user = await currentUser(context);
  requireRole(user.role, ['editor']);
  const scope = await scopeStore.getScope();
  const doc = await loadWorkspace(scope.space);
  if (doc.artifacts.length <= 1) throw new Error('The last remaining artifact cannot be deleted.');
  doc.artifacts = doc.artifacts.filter(a => a.id !== payload.id);
  await saveWorkspace(scope.space, doc);
  return { artifacts: artifactsForResponse(doc), fallbackId: doc.artifacts[0].id };
});

resolver.define('setArtifactComponent', async ({ context, payload }) => {
  const user = await currentUser(context);
  requireRole(user.role, ['editor']);
  const scope = await scopeStore.getScope();
  const doc = await loadWorkspace(scope.space);
  doc.artifacts = doc.artifacts.map(a => (a.id === payload.id ? { ...a, component: payload.component } : a));
  await saveWorkspace(scope.space, doc);
  return { artifacts: artifactsForResponse(doc) };
});

resolver.define('createRegion', async ({ context, payload }) => {
  const user = await currentUser(context);
  requireRole(user.role, ['editor']);
  const scope = await scopeStore.getScope();
  const doc = await loadWorkspace(scope.space);
  const artifact = doc.artifacts.find(a => a.id === payload.artifactId);
  if (!artifact) throw new Error('No such artifact.');
  if (!artifact.component) throw new Error('Assign a Jira component to this artifact before drawing a Component-Aspect on it.');
  const points = payload.points.map(clampPoint);
  const b = rectFromPoints(points);
  if (b.w < MIN_REGION_SIZE || b.h < MIN_REGION_SIZE) throw new Error('That rectangle is too small to keep.');
  const name = (payload.name || '').trim();
  if (!name) throw new Error('Name is required.');
  if (artifact.regions.some(r => r.name.toLowerCase() === name.toLowerCase())) throw new Error('A Component-Aspect with that name already exists on this artifact.');
  const region = { id: 'r' + Date.now(), name, points, createdBy: user.accountId, updatedAt: Date.now() };
  artifact.regions.push(region);
  await saveWorkspace(scope.space, doc);
  return { artifacts: artifactsForResponse(doc), regionId: region.id };
});

resolver.define('renameRegion', async ({ context, payload }) => {
  const user = await currentUser(context);
  requireRole(user.role, ['editor']);
  const scope = await scopeStore.getScope();
  const doc = await loadWorkspace(scope.space);
  const artifact = doc.artifacts.find(a => a.id === payload.artifactId);
  if (!artifact) throw new Error('No such artifact.');
  const name = (payload.name || '').trim();
  if (!name) throw new Error('Name is required.');
  if (artifact.regions.some(r => r.id !== payload.regionId && r.name.toLowerCase() === name.toLowerCase())) throw new Error('A Component-Aspect with that name already exists on this artifact.');
  artifact.regions = artifact.regions.map(r => (r.id === payload.regionId ? { ...r, name, updatedAt: Date.now() } : r));
  await saveWorkspace(scope.space, doc);
  return { artifacts: artifactsForResponse(doc) };
});

resolver.define('deleteRegion', async ({ context, payload }) => {
  const user = await currentUser(context);
  requireRole(user.role, ['editor']);
  const scope = await scopeStore.getScope();
  const doc = await loadWorkspace(scope.space);
  const artifact = doc.artifacts.find(a => a.id === payload.artifactId);
  if (!artifact) throw new Error('No such artifact.');
  artifact.regions = artifact.regions.filter(r => r.id !== payload.regionId);
  await saveWorkspace(scope.space, doc);
  return { artifacts: artifactsForResponse(doc) };
});

resolver.define('updateRegionPoints', async ({ context, payload }) => {
  const user = await currentUser(context);
  requireRole(user.role, ['editor']);
  const scope = await scopeStore.getScope();
  const doc = await loadWorkspace(scope.space);
  const artifact = doc.artifacts.find(a => a.id === payload.artifactId);
  if (!artifact) throw new Error('No such artifact.');
  const points = payload.points.map(clampPoint);
  artifact.regions = artifact.regions.map(r => (r.id === payload.regionId ? { ...r, points, updatedAt: Date.now() } : r));
  await saveWorkspace(scope.space, doc);
  return { artifacts: artifactsForResponse(doc) };
});

resolver.define('getMembers', async ({ context }) => {
  const user = await currentUser(context);
  if (!user.isAdmin) return { members: [] };
  return { members: await roles.getMembers() };
});

resolver.define('setMemberRole', async ({ context, payload }) => {
  const user = await currentUser(context);
  if (!user.isAdmin) throw new Error('Only a Jira site administrator can manage workspace membership.');
  const members = await roles.setRole(payload.accountId, payload.role, payload.displayName);
  return { members };
});

exports.handler = resolver.getDefinitions();
