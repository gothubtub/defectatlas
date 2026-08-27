import React, { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useState } from 'react';
import { invoke } from '../lib/api';
import { initialUiState, uiReducer } from './reducer';
import { computeAtlasView } from '../lib/compute';

const AtlasCtx = createContext(null);

const emptyServer = {
  user: null, spaces: [], fixVersions: [], scope: { space: '', fixVersion: '' },
  jql: '', lastSync: null, conflicts: [], components: [], artifacts: [], members: [], issues: []
};

export function AtlasProvider({ children }) {
  const [ui, dispatch] = useReducer(uiReducer, initialUiState);
  const [server, setServer] = useState(emptyServer);
  const [loading, setLoading] = useState(true);

  const patch = useCallback(p => dispatch({ type: 'patch', patch: p }), []);
  const setServerPatch = useCallback(p => setServer(s => ({ ...s, ...p })), []);

  const guarded = useCallback(fn => async (...args) => {
    try {
      return await fn(...args);
    } catch (err) {
      patch({ error: err.message || String(err) });
      throw err;
    }
  }, [patch]);

  useEffect(() => {
    (async () => {
      try {
        const boot = await invoke('bootstrap');
        setServer(s => ({ ...s, ...boot }));
        if (boot.scope && boot.scope.space && boot.artifacts && boot.artifacts.length) {
          patch({ selectedArtifactId: boot.artifacts[0].id });
        }
        if (boot.lastSync) {
          const { issues } = await invoke('getIssues');
          setServerPatch({ issues });
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const actions = useMemo(() => ({
    setScope: guarded(async (space, fixVersion) => {
      const res = await invoke('setScope', { space, fixVersion });
      setServerPatch({ scope: res.scope, fixVersions: res.fixVersions, jql: res.jql, artifacts: res.artifacts, components: res.components, issues: [], lastSync: null, conflicts: [] });
      patch({ selectedArtifactId: res.artifacts[0] ? res.artifacts[0].id : null, sel: null });
    }),
    setJql: guarded(async jql => {
      await invoke('setJql', { jql });
      setServerPatch({ jql });
    }),
    sync: guarded(async () => {
      const res = await invoke('sync');
      setServerPatch({ lastSync: res.lastSync, conflicts: res.conflicts, issues: res.issues });
    }),
    setIssueField: guarded(async (issueKey, field, value) => {
      await invoke('setIssueField', { issueKey, field, value });
      setServer(s => ({ ...s, issues: s.issues.map(i => (i.key === issueKey ? { ...i, [field]: value } : i)) }));
    }),
    resolveConflict: guarded(async (issueKey, field, choice) => {
      const res = await invoke('resolveConflict', { issueKey, field, choice });
      setServerPatch({ conflicts: res.conflicts });
    }),
    uploadArtifact: guarded(async file => {
      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const res = await invoke('uploadArtifact', { filename: file.name, dataUrl });
      setServerPatch({ artifacts: res.artifacts });
      patch({ selectedArtifactId: res.selectedId, sel: null, importOpen: false });
    }),
    renameArtifact: guarded(async (id, name) => {
      const res = await invoke('renameArtifact', { id, name });
      setServerPatch({ artifacts: res.artifacts });
    }),
    deleteArtifact: guarded(async id => {
      const res = await invoke('deleteArtifact', { id });
      setServerPatch({ artifacts: res.artifacts });
      patch({ selectedArtifactId: res.fallbackId, sel: null });
    }),
    setArtifactComponent: guarded(async (id, component) => {
      const res = await invoke('setArtifactComponent', { id, component });
      setServerPatch({ artifacts: res.artifacts });
    }),
    createRegion: guarded(async (artifactId, name, points) => {
      const res = await invoke('createRegion', { artifactId, name, points });
      setServerPatch({ artifacts: res.artifacts });
      patch({ sel: res.regionId });
      return res;
    }),
    renameRegion: guarded(async (artifactId, regionId, name) => {
      const res = await invoke('renameRegion', { artifactId, regionId, name });
      setServerPatch({ artifacts: res.artifacts });
    }),
    deleteRegion: guarded(async (artifactId, regionId) => {
      const res = await invoke('deleteRegion', { artifactId, regionId });
      setServerPatch({ artifacts: res.artifacts });
    }),
    updateRegionPoints: guarded(async (artifactId, regionId, points) => {
      const res = await invoke('updateRegionPoints', { artifactId, regionId, points });
      setServerPatch({ artifacts: res.artifacts });
    }),
    loadMembers: guarded(async () => {
      const res = await invoke('getMembers');
      setServerPatch({ members: res.members });
    }),
    setMemberRole: guarded(async (accountId, role, displayName) => {
      const res = await invoke('setMemberRole', { accountId, role, displayName });
      setServerPatch({ members: res.members });
    })
  }), [guarded, patch, setServerPatch]);

  const artifact = server.artifacts.find(a => a.id === ui.selectedArtifactId) || server.artifacts[0] || null;
  const view = useMemo(() => computeAtlasView({
    artifact,
    issues: server.issues,
    filters: { sev: ui.sev, status: ui.status, cause: ui.cause },
    t: ui.t,
    viewStartDate: ui.viewStartDate,
    lastSync: server.lastSync,
    sel: ui.sel
  }), [artifact, server.issues, ui.sev, ui.status, ui.cause, ui.t, ui.viewStartDate, server.lastSync, ui.sel]);

  const value = { ui, dispatch, patch, server, actions, artifact, view, loading };
  return <AtlasCtx.Provider value={value}>{children}</AtlasCtx.Provider>;
}

export function useAtlas() {
  const ctx = useContext(AtlasCtx);
  if (!ctx) throw new Error('useAtlas must be used within AtlasProvider');
  return ctx;
}
