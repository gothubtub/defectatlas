// In-memory workspace store for the mocked build. Lives for as long as the
// Lambda execution environment stays warm — fine for exercising every flow
// in this pass, but it is not durable; realStore.js is the durable,
// Jira-entity-backed counterpart (see README "Storage approach").
const { DEFAULT_ARTIFACTS, COMPONENTS } = require('../domain/sampleData');

const docs = new Map();

function seedFor(spaceName) {
  const artifacts = DEFAULT_ARTIFACTS.filter(a => a.space === spaceName).map(a => ({
    id: a.id,
    name: a.name,
    component: a.component,
    imageRef: { kind: 'demo', path: a.image },
    regions: a.regions.map(r => ({
      id: r.id,
      name: r.name,
      points: [[r.x, r.y], [r.x + r.w, r.y + r.h]],
      createdBy: 'seed',
      updatedAt: Date.now()
    })),
    uploadedBy: 'seed',
    uploadedAt: Date.now()
  }));
  return {
    components: COMPONENTS.slice(),
    connection: { jql: null, lastSync: null, syncCount: 0, localEdits: {}, conflicts: [] },
    artifacts
  };
}

function getWorkspaceDoc(spaceName) {
  if (!spaceName) return { components: COMPONENTS.slice(), connection: { jql: null, lastSync: null, syncCount: 0, localEdits: {}, conflicts: [] }, artifacts: [] };
  if (!docs.has(spaceName)) docs.set(spaceName, seedFor(spaceName));
  return docs.get(spaceName);
}

function setWorkspaceDoc(spaceName, doc) {
  docs.set(spaceName, doc);
  return doc;
}

async function uploadArtifactImage(spaceName, artifactId, filename, dataUrl) {
  // The data URL itself *is* the storage in mock mode.
  return { kind: 'upload', dataUrl, filename };
}

function resolveImageUrl(imageRef) {
  if (!imageRef) return '';
  if (imageRef.kind === 'demo') return imageRef.path;
  if (imageRef.kind === 'upload') return imageRef.dataUrl;
  return '';
}

module.exports = { mode: 'mock', getWorkspaceDoc, setWorkspaceDoc, uploadArtifactImage, resolveImageUrl };
