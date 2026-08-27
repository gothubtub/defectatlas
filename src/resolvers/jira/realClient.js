// Real Jira client — talks to the actual site through Forge's asApp()
// bridge. Not exercised by the mocked build (see README), written so the
// switch in ./index.js is a one-line flip once a real site is available:
// set the environment variable DEFECT_ATLAS_MOCK=false in the Forge
// environment.
//
// "Space" is modelled as a real Jira project: the UI shows spaces as
// "KEY — Name" (chat5's explicit request), which is exactly how Jira's
// own project picker renders a project — so RB/PP/DC are project keys.
// That also settles where artifact/Component-Aspect data lives: as
// entity properties on that same project (see ../store/realStore.js),
// which is what "space and fix version" scoping was pointing at all
// along.
//
// The `spaceJira` JQL clause and the `Component-Aspect` field are both
// custom fields a Jira admin must create on the site before sync will
// return anything real — see BRD §7 Assumptions.
const api = require('@forge/api');

async function reqJson(route, init) {
  const res = await api.asApp().requestJira(route, init);
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Jira request failed (${res.status} ${res.status < 500 ? 'client' : 'server'} error) ${route}: ${body}`);
  }
  return res.json();
}

async function listSpaces() {
  const data = await reqJson(api.route`/rest/api/3/project/search?maxResults=50`);
  return (data.values || []).map(p => ({ key: p.key, name: `${p.key} — ${p.name}` }));
}

async function listFixVersions(spaceName) {
  const key = (spaceName || '').split(' — ')[0].trim();
  if (!key) return [];
  const data = await reqJson(api.route`/rest/api/3/project/${key}/versions`);
  return (data || []).filter(v => !v.archived).map(v => v.name);
}

async function defaultJql(spaceName, fixVersion) {
  const key = (spaceName || '').split(' — ')[0].trim();
  return `spaceJira = ${key || '?'} AND fixVersion = "${fixVersion || '?'}" AND issuetype = Bug AND resolution not in ("Won't Do", Duplicate, "Cannot Reproduce")`;
}

const STATUS_MAP = { 'To Do': 'open', 'In Progress': 'open', Done: 'closed' };
const COMPONENT_ASPECT_FIELD_NAME = 'Component-Aspect';

let cachedFieldId = null;
async function componentAspectFieldId() {
  if (cachedFieldId) return cachedFieldId;
  const fields = await reqJson(api.route`/rest/api/3/field`);
  const match = fields.find(f => f.name === COMPONENT_ASPECT_FIELD_NAME);
  if (!match) throw new Error(`No "${COMPONENT_ASPECT_FIELD_NAME}" field found on this site — create one from Jira admin ▸ Issue fields using the type this app provides, then add it to the Bug screen.`);
  cachedFieldId = match.id;
  return cachedFieldId;
}

async function searchIssues({ jql, localEdits }) {
  const aspectField = await componentAspectFieldId();
  const fields = ['summary', 'status', 'priority', 'resolution', 'created', 'resolutiondate', 'reporter', 'components', aspectField];
  let startAt = 0;
  const all = [];
  // NB: capped to 500 issues per BRD assumption ("hundreds, not
  // hundred-thousands"); paginate further if that assumption changes.
  while (startAt < 500) {
    const page = await reqJson(api.route`/rest/api/3/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jql, fields, startAt, maxResults: 100 })
    });
    all.push(...page.issues);
    startAt += page.issues.length;
    if (page.issues.length < 100 || startAt >= page.total) break;
  }

  const conflicts = [];
  const issues = all.map(raw => {
    let status = STATUS_MAP[raw.fields.status && raw.fields.status.name] || 'excluded';
    let severity = ((raw.fields.priority && raw.fields.priority.name) || 'Major').toLowerCase();
    const edits = (localEdits && localEdits[raw.key]) || {};
    const conflictFields = [];
    for (const field of ['status', 'severity']) {
      const edit = edits[field];
      if (!edit) continue;
      const jiraValue = field === 'status' ? status : severity;
      if (jiraValue !== edit.value) {
        conflictFields.push(field);
        conflicts.push({ issueKey: raw.key, field, atlasValue: edit.value, jiraValue, atlasChangedAt: edit.editedAt, jiraChangedAt: Date.parse(raw.fields.updated || raw.fields.created) });
      } else if (field === 'status') status = edit.value;
      else severity = edit.value;
    }
    return {
      key: raw.key,
      component: (raw.fields.components && raw.fields.components[0] && raw.fields.components[0].name) || '',
      componentAspect: raw.fields[aspectField] || '',
      severity,
      status,
      rootCause: null, // no BRD-specified source field; left for a future custom field
      title: raw.fields.summary,
      reporter: raw.fields.reporter && raw.fields.reporter.displayName,
      createdAt: Date.parse(raw.fields.created),
      resolvedAt: raw.fields.resolutiondate ? Date.parse(raw.fields.resolutiondate) : null,
      conflictFields
    };
  }).filter(i => i.status !== 'excluded');

  return { issues, conflicts };
}

async function updateIssue(issueKey, fields) {
  if (fields.status) {
    const transitions = await reqJson(api.route`/rest/api/3/issue/${issueKey}/transitions`);
    const target = (transitions.transitions || []).find(t => t.to.name.toLowerCase() === (fields.status === 'closed' ? 'done' : 'in progress'));
    if (target) {
      await api.asApp().requestJira(api.route`/rest/api/3/issue/${issueKey}/transitions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transition: { id: target.id } })
      });
    }
  }
  if (fields.severity) {
    await api.asApp().requestJira(api.route`/rest/api/3/issue/${issueKey}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields: { priority: { name: fields.severity[0].toUpperCase() + fields.severity.slice(1) } } })
    });
  }
  return { ok: true, issueKey, fields };
}

async function findDefaultArtifactsForSpace() {
  return []; // real sites start with an empty library; UC-04 covers upload
}

module.exports = {
  mode: 'real',
  listSpaces,
  listComponents: async () => [],
  listFixVersions,
  defaultJql,
  searchIssues,
  updateIssue,
  findDefaultArtifactsForSpace
};
