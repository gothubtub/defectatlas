import React, { useState } from 'react';
import { useAtlas } from '../../state/AtlasContext';
import { ago } from '../../lib/format';

export default function SpaceSyncModal() {
  const { ui, patch, server, actions } = useAtlas();
  const [syncing, setSyncing] = useState(false);
  if (!ui.modalOpen) return null;

  const canEdit = server.user && server.user.role === 'editor';
  const scopeReady = !!(server.scope.space && server.scope.fixVersion);
  const connected = !!server.lastSync;
  const close = () => patch({ modalOpen: false });

  async function doSync() {
    setSyncing(true);
    try { await actions.sync(); } finally { setSyncing(false); }
  }

  return (
    <div onClick={close} style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(6,7,9,.62)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: "'IBM Plex Sans',sans-serif" }}>
      <div onClick={e => e.stopPropagation()} style={{ width: 470, maxWidth: '100%', maxHeight: '92vh', overflow: 'auto', background: '#111419', border: '1px solid #23272f', borderRadius: 16, boxShadow: '0 30px 80px -20px rgba(0,0,0,.75)', color: '#e7e9ee' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '18px 22px', borderBottom: '1px solid #1c2027' }}>
          <div style={{ width: 34, height: 34, borderRadius: 9, background: 'rgba(76,141,255,.14)', border: '1px solid #2c4a86', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4c8dff', fontWeight: 700, fontSize: 16, flex: 'none' }}>J</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 600 }}>Space sync</div>
            <div style={{ fontSize: 11, color: '#7a818d', fontFamily: "'IBM Plex Mono',monospace" }}>Forge app · connected to this Jira instance</div>
          </div>
          <button type="button" aria-label="Close Jira settings" onClick={close} style={{ background: '#14171d', border: '1px solid #23272f', color: '#9aa0ab', width: 28, height: 28, borderRadius: 8, cursor: 'pointer', fontSize: 15, flex: 'none' }}>×</button>
        </div>

        <div style={{ padding: '20px 22px' }}>
          {connected && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, background: 'rgba(63,185,80,.1)', border: '1px solid rgba(63,185,80,.3)', borderRadius: 9, padding: '10px 12px', marginBottom: 18 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#3fb950', flex: 'none' }} />
              <span style={{ fontSize: 12.5, color: '#cfe9d6' }}>Connected · synced {ago(server.lastSync)}</span>
            </div>
          )}

          {!canEdit && (
            <div style={{ fontSize: 11.5, color: '#8b919c', marginBottom: 14, background: '#0d0f13', border: '1px solid #1e222a', borderRadius: 8, padding: '9px 11px' }}>
              You have Viewer access — scope, sync and Jira configuration changes are made by an Editor.
            </div>
          )}

          <div style={{ display: 'flex', gap: 12, marginBottom: 6 }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: 11.5, color: '#9aa0ab', marginBottom: 6, fontWeight: 500 }}>Jira Space <span style={{ color: '#ff5a4c' }}>*</span></label>
              <select
                value={server.scope.space}
                disabled={!canEdit}
                onChange={e => actions.setScope(e.target.value, '')}
                style={{ width: '100%', background: '#0d0f13', border: `1px solid ${server.scope.space ? '#23272f' : '#4a2b2b'}`, borderRadius: 8, padding: '9px 11px', color: '#e7e9ee', fontSize: 13, fontFamily: 'inherit', outline: 'none', cursor: canEdit ? 'pointer' : 'default' }}
              >
                <option value="">— select a space —</option>
                {server.spaces.map(s => <option key={s.key} value={s.name}>{s.name}</option>)}
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: 11.5, color: '#9aa0ab', marginBottom: 6, fontWeight: 500 }}>Fix Version <span style={{ color: '#ff5a4c' }}>*</span></label>
              <select
                value={server.scope.fixVersion}
                disabled={!canEdit || !server.scope.space}
                onChange={e => actions.setScope(server.scope.space, e.target.value)}
                style={{ width: '100%', background: '#0d0f13', border: `1px solid ${server.scope.fixVersion ? '#23272f' : '#4a2b2b'}`, borderRadius: 8, padding: '9px 11px', color: server.scope.space ? '#e7e9ee' : '#8b93a1', fontSize: 13, fontFamily: "'IBM Plex Mono',monospace", outline: 'none', cursor: canEdit ? 'pointer' : 'default' }}
              >
                <option value="">— select a version —</option>
                {server.fixVersions.map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
          </div>
          <div style={{ fontSize: 11, color: '#7a818d', marginBottom: 14, lineHeight: 1.5 }}>This view — its artifacts, components and Component-Aspects — is scoped to the selected space and fix version. Both are required to sync.</div>

          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 11.5, color: '#9aa0ab', marginBottom: 6, fontWeight: 500 }}>Issue query (JQL)</label>
            <textarea
              value={server.jql}
              disabled={!canEdit}
              onChange={e => actions.setJql(e.target.value)}
              rows={3}
              style={{ width: '100%', background: '#0d0f13', border: '1px solid #23272f', borderRadius: 8, padding: '9px 11px', color: '#cbd5e6', fontSize: 12, fontFamily: "'IBM Plex Mono',monospace", outline: 'none', resize: 'vertical', lineHeight: 1.5, boxSizing: 'border-box' }}
            />
          </div>

          <div style={{ marginBottom: 16, fontSize: 12, color: '#8b919c', lineHeight: 1.6 }}>Jira issues will be associated to Artifact annotations using field Component-Aspect</div>

          <div style={{ background: '#0d0f13', border: '1px solid #1e222a', borderRadius: 9, padding: '11px 13px', fontSize: 11.5, color: '#8b919c', lineHeight: 1.6, marginBottom: server.conflicts.length ? 16 : 0 }}>
            <div style={{ color: '#9aa0ab', fontWeight: 500, marginBottom: 4 }}>Status mapping</div>
            <span style={{ color: '#34d3a6' }}>Open</span> ← To Do, In Progress &nbsp;·&nbsp; <span style={{ color: '#5fd0a0' }}>Closed</span> ← Done<br />
            Excluded: Won't Do, Duplicate, Cannot Reproduce (resolution = rejected)
          </div>

          {server.conflicts.length > 0 && (
            <div>
              <div style={{ fontSize: 11.5, fontWeight: 600, color: '#f6b13c', marginBottom: 8 }}>{server.conflicts.length} conflict{server.conflicts.length === 1 ? '' : 's'} — same field changed in both systems</div>
              {server.conflicts.map(c => (
                <div key={c.issueKey + c.field} style={{ border: '1px solid #3a2f1c', background: 'rgba(246,177,60,.06)', borderRadius: 8, padding: '10px 12px', marginBottom: 8, fontSize: 12 }}>
                  <div style={{ marginBottom: 6 }}>
                    <span style={{ fontFamily: "'IBM Plex Mono',monospace", color: '#9cc0ff' }}>{c.issueKey}</span>
                    <span style={{ color: '#8b93a1' }}> · {c.field}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button type="button" disabled={!canEdit} onClick={() => actions.resolveConflict(c.issueKey, c.field, 'atlas')} style={{ flex: 1, background: '#14171d', border: '1px solid #23272f', color: '#c7cbd3', fontSize: 11.5, padding: '6px 8px', borderRadius: 6, cursor: canEdit ? 'pointer' : 'not-allowed' }}>
                      Use atlas: <strong>{String(c.atlasValue)}</strong>
                    </button>
                    <button type="button" disabled={!canEdit} onClick={() => actions.resolveConflict(c.issueKey, c.field, 'jira')} style={{ flex: 1, background: '#14171d', border: '1px solid #23272f', color: '#c7cbd3', fontSize: 11.5, padding: '6px 8px', borderRadius: 6, cursor: canEdit ? 'pointer' : 'not-allowed' }}>
                      Use Jira: <strong>{String(c.jiraValue)}</strong>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '16px 22px', borderTop: '1px solid #1c2027' }}>
          <div style={{ flex: 1 }} />
          <button type="button" onClick={close} style={{ background: '#14171d', border: '1px solid #23272f', color: '#9aa0ab', fontSize: 12.5, fontWeight: 500, padding: '9px 16px', borderRadius: 8, cursor: 'pointer' }}>Cancel</button>
          <button
            type="button"
            disabled={!canEdit || !scopeReady || syncing}
            title={scopeReady ? `Sync issues for ${server.scope.space} · ${server.scope.fixVersion}` : 'Select a Jira Space and Fix Version first'}
            onClick={doSync}
            style={{ border: 'none', fontSize: 12.5, fontWeight: 600, padding: '9px 18px', borderRadius: 8, background: canEdit && scopeReady ? '#4c8dff' : '#1b1f27', color: canEdit && scopeReady ? '#06122b' : '#8b93a1', cursor: canEdit && scopeReady && !syncing ? 'pointer' : 'not-allowed' }}
          >
            {syncing ? 'Syncing…' : connected ? 'Re-sync now' : 'Sync space'}
          </button>
        </div>
      </div>
    </div>
  );
}
