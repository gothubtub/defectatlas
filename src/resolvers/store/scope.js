// The currently-selected Space + Fix Version is shared across the team
// (BRD: workspace is "Shared + roles and permissions"), so it can't live
// in browser localStorage the way the prototype had it. It's not really
// workspace *domain* data either (it doesn't belong to a single space —
// it picks which space's data to look at), so like membership it's kept
// as a tiny Forge Storage pointer rather than a Jira entity property.
const { storage } = require('@forge/storage');

const SCOPE_KEY = 'defect-atlas:currentScope';

async function getScope() {
  return (await storage.get(SCOPE_KEY)) || { space: '', fixVersion: '' };
}

async function setScope(scope) {
  await storage.set(SCOPE_KEY, scope);
  return scope;
}

module.exports = { getScope, setScope };
