// Workspace membership (BRD §5 Workspace.members[]: user + Editor/Viewer
// role). This is the one piece of app state kept in Forge's own Storage
// API rather than as a Jira entity — there's no natural Jira home for
// "who administers this app," and the build-scope answer explicitly
// carved out membership as an exception to "Jira entities only."
//
// The BRD defines Editor and Viewer but is silent on who *grants* those
// roles (Editor is explicitly barred from managing membership). This
// implementation makes an interpretive call: Jira site administrators
// (the global ADMINISTER permission) manage membership, since the BRD
// only restricts Editor and doesn't introduce a third role.
const { storage } = require('@forge/storage');
const api = require('@forge/api');

const MEMBERS_KEY = 'defect-atlas:members';
const isMock = (process.env.DEFECT_ATLAS_MOCK || 'true') !== 'false';

async function getMembers() {
  return (await storage.get(MEMBERS_KEY)) || [];
}

async function setMembers(members) {
  await storage.set(MEMBERS_KEY, members);
  return members;
}

async function getRole(accountId) {
  const members = await getMembers();
  const found = members.find(m => m.accountId === accountId);
  if (found) return found.role;
  // First-ever user bootstraps as Editor; everyone after defaults to Viewer
  // until an admin promotes them (UC-05 "Viewer may select only").
  const role = members.length === 0 ? 'editor' : 'viewer';
  const next = [...members, { accountId, role, joinedAt: Date.now() }];
  await setMembers(next);
  return role;
}

async function setRole(accountId, role, displayName) {
  if (role !== 'editor' && role !== 'viewer') throw new Error('role must be "editor" or "viewer"');
  const members = await getMembers();
  const idx = members.findIndex(m => m.accountId === accountId);
  const next = members.slice();
  if (idx === -1) next.push({ accountId, role, displayName, joinedAt: Date.now() });
  else next[idx] = { ...next[idx], role, displayName: displayName || next[idx].displayName };
  await setMembers(next);
  return next;
}

async function isSiteAdmin(accountId) {
  if (isMock) return true; // no live site to check against in the mocked build
  const res = await api.asUser().requestJira(api.route`/rest/api/3/mypermissions?permissions=ADMINISTER`);
  if (!res.ok) return false;
  const body = await res.json();
  return !!(body.permissions && body.permissions.ADMINISTER && body.permissions.ADMINISTER.havePermission);
}

module.exports = { getMembers, setMembers, getRole, setRole, isSiteAdmin };
