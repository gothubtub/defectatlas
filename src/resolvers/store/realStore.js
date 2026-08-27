// Durable store for a real site: workspace metadata (components vocabulary,
// connection scope, artifact list, Component-Aspect regions) lives as a
// Jira *project* entity property — one JSON document per space, since a
// space is a Jira project (see ../jira/realClient.js). Only the artifact
// *images* need somewhere binary to live; Jira has no attachment concept
// outside issues, so each artifact gets a small carrier issue that exists
// purely to hold its image as an attachment. Nothing here uses Forge's own
// Storage API — see README "Storage approach" for why, and roles.js for
// the one deliberate exception (workspace membership).
const api = require('@forge/api');
const { COMPONENTS } = require('../domain/sampleData');

const PROPERTY_KEY = 'defect-atlas.workspace';
const CARRIER_LABEL = 'defect-atlas-artifact';

function emptyDoc() {
  return { components: COMPONENTS.slice(), connection: { jql: null, lastSync: null, syncCount: 0, localEdits: {}, conflicts: [] }, artifacts: [] };
}

function projectKeyFor(spaceName) {
  return (spaceName || '').split(' — ')[0].trim();
}

async function getWorkspaceDoc(spaceName) {
  const key = projectKeyFor(spaceName);
  if (!key) return emptyDoc();
  const res = await api.asApp().requestJira(api.route`/rest/api/3/project/${key}/properties/${PROPERTY_KEY}`);
  if (res.status === 404) return emptyDoc();
  if (!res.ok) throw new Error(`Failed to read workspace doc for ${spaceName}: ${res.status}`);
  const body = await res.json();
  return body.value;
}

async function setWorkspaceDoc(spaceName, doc) {
  const key = projectKeyFor(spaceName);
  const json = JSON.stringify(doc);
  if (json.length > 32000) {
    throw new Error('Workspace document exceeds the 32KB Jira entity property limit — this should only happen with an unusually large number of artifacts/regions.');
  }
  const res = await api.asApp().requestJira(api.route`/rest/api/3/project/${key}/properties/${PROPERTY_KEY}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: json
  });
  if (!res.ok) throw new Error(`Failed to write workspace doc for ${spaceName}: ${res.status}`);
  return doc;
}

// Creates (once) a small carrier issue per artifact whose sole purpose is
// to hold the snapshot image as a Jira attachment, then uploads to it.
// TODO(production hardening): 'Task' is assumed to be a valid issue type
// name on the target project; fall back to the project's first
// non-subtask type from /issue/createmeta if that assumption doesn't hold.
async function uploadArtifactImage(spaceName, artifactId, filename, base64Data, existingIssueKey) {
  const spaceKey = projectKeyFor(spaceName);
  let issueKey = existingIssueKey;
  if (!issueKey) {
    const created = await api.asApp().requestJira(api.route`/rest/api/3/issue`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fields: {
          project: { key: spaceKey },
          summary: `[Defect Atlas] artifact carrier — ${artifactId}`,
          issuetype: { name: 'Task' },
          labels: [CARRIER_LABEL]
        }
      })
    });
    if (!created.ok) throw new Error(`Failed to create artifact carrier issue: ${created.status}`);
    issueKey = (await created.json()).key;
  }

  const buf = Buffer.from(base64Data.split(',').pop(), 'base64');
  const form = new FormData();
  form.append('file', new Blob([buf]), filename);
  const uploaded = await api.asApp().requestJira(api.route`/rest/api/3/issue/${issueKey}/attachments`, {
    method: 'POST',
    headers: { 'X-Atlassian-Token': 'no-check' },
    body: form
  });
  if (!uploaded.ok) throw new Error(`Failed to attach artifact image: ${uploaded.status}`);
  const [attachment] = await uploaded.json();
  return { kind: 'attachment', issueKey, attachmentId: attachment.id, filename };
}

function resolveImageUrl(imageRef) {
  if (!imageRef) return '';
  if (imageRef.kind === 'attachment') return `/rest/api/3/attachment/content/${imageRef.attachmentId}`;
  if (imageRef.kind === 'demo') return imageRef.path;
  return '';
}

module.exports = { mode: 'real', getWorkspaceDoc, setWorkspaceDoc, uploadArtifactImage, resolveImageUrl };
