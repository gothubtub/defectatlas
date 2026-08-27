import React, { useEffect, useState } from 'react';
import { useAtlas } from '../../state/AtlasContext';

export default function MembersModal() {
  const { ui, patch, server, actions } = useAtlas();
  const [newAccountId, setNewAccountId] = useState('');
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState('viewer');

  useEffect(() => {
    if (ui.membersOpen) actions.loadMembers();
  }, [ui.membersOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!ui.membersOpen) return null;
  const close = () => patch({ membersOpen: false });

  return (
    <div onClick={close} style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(6,7,9,.62)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: "'IBM Plex Sans',sans-serif" }}>
      <div onClick={e => e.stopPropagation()} style={{ width: 440, maxWidth: '100%', maxHeight: '80vh', overflow: 'auto', background: '#111419', border: '1px solid #23272f', borderRadius: 16, boxShadow: '0 30px 80px -20px rgba(0,0,0,.75)', color: '#e7e9ee' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '18px 22px', borderBottom: '1px solid #1c2027' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 600 }}>Workspace membership</div>
            <div style={{ fontSize: 11, color: '#7a818d', fontFamily: "'IBM Plex Mono',monospace" }}>Editor / Viewer — managed by Jira site administrators</div>
          </div>
          <button type="button" aria-label="Close membership" onClick={close} style={{ background: '#14171d', border: '1px solid #23272f', color: '#9aa0ab', width: 28, height: 28, borderRadius: 8, cursor: 'pointer', fontSize: 15, flex: 'none' }}>×</button>
        </div>

        <div style={{ padding: '18px 22px' }}>
          {server.members.length === 0 && <div style={{ fontSize: 12.5, color: '#7a818d' }}>No members yet — the first person to open Defect Atlas becomes Editor automatically.</div>}
          {server.members.map(m => (
            <div key={m.accountId} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderBottom: '1px solid #1a1d23' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.displayName || m.accountId}</div>
                <div style={{ fontSize: 11, color: '#8b93a1', fontFamily: "'IBM Plex Mono',monospace" }}>{m.accountId}</div>
              </div>
              <select
                value={m.role}
                onChange={e => actions.setMemberRole(m.accountId, e.target.value, m.displayName)}
                style={{ background: '#0d0f13', border: '1px solid #23272f', borderRadius: 6, padding: '5px 8px', color: '#c7cbd3', fontSize: 12, cursor: 'pointer' }}
              >
                <option value="editor">Editor</option>
                <option value="viewer">Viewer</option>
              </select>
            </div>
          ))}
        </div>

        <div style={{ padding: '14px 22px 20px', borderTop: '1px solid #1c2027' }}>
          <div style={{ fontSize: 11.5, color: '#9aa0ab', marginBottom: 8, fontWeight: 500 }}>Add or update a member by account ID</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input placeholder="Jira account ID" value={newAccountId} onChange={e => setNewAccountId(e.target.value)} style={{ flex: 1, background: '#0d0f13', border: '1px solid #23272f', borderRadius: 7, padding: '7px 9px', color: '#e7e9ee', fontSize: 12 }} />
            <input placeholder="Display name" value={newName} onChange={e => setNewName(e.target.value)} style={{ flex: 1, background: '#0d0f13', border: '1px solid #23272f', borderRadius: 7, padding: '7px 9px', color: '#e7e9ee', fontSize: 12 }} />
            <select value={newRole} onChange={e => setNewRole(e.target.value)} style={{ background: '#0d0f13', border: '1px solid #23272f', borderRadius: 7, padding: '7px 9px', color: '#c7cbd3', fontSize: 12 }}>
              <option value="viewer">Viewer</option>
              <option value="editor">Editor</option>
            </select>
            <button
              type="button"
              onClick={() => { if (newAccountId.trim()) { actions.setMemberRole(newAccountId.trim(), newRole, newName.trim()); setNewAccountId(''); setNewName(''); } }}
              style={{ background: '#4c8dff', border: 'none', color: '#06122b', fontWeight: 600, fontSize: 12, padding: '7px 12px', borderRadius: 7, cursor: 'pointer' }}
            >
              Add
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
