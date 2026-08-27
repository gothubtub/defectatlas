// Mocked Jira layer. Chosen so this app is fully interactive without a
// live site (see the build-scope decision recorded in README.md). Every
// function here has a same-shaped counterpart in realClient.js that makes
// actual Forge `requestJira` calls — src/resolvers/jira/index.js is the
// single switch point between them.
const { mulberry32 } = require('../domain/rng');
const {
  SPACES,
  COMPONENTS,
  STATUS_MAPPING,
  DEFAULT_ARTIFACTS,
  generateIssues,
  jqlFor
} = require('../domain/sampleData');

let ISSUES = null;
function allIssues() {
  if (!ISSUES) ISSUES = generateIssues();
  return ISSUES;
}

function toAtlasStatus(rawStatus) {
  return STATUS_MAPPING[rawStatus] || 'excluded';
}

async function listSpaces() {
  return SPACES.map(s => ({ key: s.key, name: s.name }));
}

async function listComponents() {
  return COMPONENTS.slice();
}

async function listFixVersions(spaceName) {
  const s = SPACES.find(x => x.name === spaceName);
  return s ? s.versions.slice() : [];
}

async function defaultJql(spaceName, fixVersion) {
  const s = SPACES.find(x => x.name === spaceName);
  return jqlFor(s ? s.key : '', fixVersion);
}

// Deterministic "what changed on the server since last sync" simulation,
// so re-running Sync produces stable, explainable conflicts (UC-02/UC-03)
// instead of random churn on every click.
function serverDrift(issueKey, syncCount) {
  const seed = Array.from(issueKey).reduce((a, c) => a + c.charCodeAt(0), 0) + syncCount * 7919;
  const rnd = mulberry32(seed);
  return rnd() < 0.05;
}

/**
 * @param {{space:string, fixVersion:string, jql:string, syncCount:number, localEdits: Record<string,{status?:{value,editedAt},severity?:{value,editedAt}}>}} params
 * @returns {{issues: Array, conflicts: Array}}
 */
async function searchIssues({ space, fixVersion, syncCount, localEdits }) {
  const scoped = allIssues().filter(i => i.space === space && i.fixVersion === fixVersion);
  const conflicts = [];
  const issues = [];
  for (const raw of scoped) {
    let status = toAtlasStatus(raw.rawStatus);
    let severity = raw.severity;
    if (status === 'excluded') continue; // rejected resolutions never surface, per BRD

    const edits = (localEdits && localEdits[raw.key]) || {};
    const conflictFields = [];
    for (const field of ['status', 'severity']) {
      const edit = edits[field];
      if (!edit) continue;
      const jiraValue = field === 'status' ? status : severity;
      // Same field changed on both sides since last sync: don't choose,
      // flag it and keep both values (BRD §6 Conflicts, UC-03).
      if (serverDrift(raw.key + ':' + field, syncCount || 0)) {
        conflictFields.push(field);
        conflicts.push({ issueKey: raw.key, field, atlasValue: edit.value, jiraValue, atlasChangedAt: edit.editedAt, jiraChangedAt: raw.updatedAt });
      } else if (field === 'status') status = edit.value;
      else severity = edit.value;
    }

    issues.push({
      key: raw.key,
      component: raw.component,
      componentAspect: raw.componentAspect,
      severity,
      status,
      rootCause: raw.rootCause,
      title: raw.title,
      reporter: raw.reporter,
      createdAt: raw.createdAt,
      resolvedAt: status === 'closed' ? raw.resolvedAt || raw.updatedAt : null,
      conflictFields
    });
  }
  return { issues, conflicts };
}

async function updateIssue(issueKey, fields) {
  // Real client PUTs to /rest/api/3/issue/{key}; the mock just accepts.
  return { ok: true, issueKey, fields };
}

async function findDefaultArtifactsForSpace() {
  return DEFAULT_ARTIFACTS;
}

module.exports = {
  mode: 'mock',
  listSpaces,
  listComponents,
  listFixVersions,
  defaultJql,
  searchIssues,
  updateIssue,
  findDefaultArtifactsForSpace
};
