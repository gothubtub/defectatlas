import React from 'react';
import { useAtlas } from '../../state/AtlasContext';

export default function RenameModal() {
  const { ui, patch, actions } = useAtlas();
  if (!ui.renameOpen) return null;

  function cancel() { patch({ renameOpen: false, renameTargetId: null, renameValue: '' }); }
  function ok() {
    const name = (ui.renameValue || '').trim();
    if (!name) { cancel(); return; }
    actions.renameArtifact(ui.renameTargetId, name);
    patch({ renameOpen: false, renameTargetId: null, renameValue: '' });
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 40, background: 'rgba(0,0,0,.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 320, background: '#13161b', border: '1px solid #23272f', borderRadius: 12, boxShadow: '0 20px 50px -15px rgba(0,0,0,.6)', padding: 18 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#e7e9ee', marginBottom: 12 }}>Rename</div>
        <input
          value={ui.renameValue}
          onChange={e => patch({ renameValue: e.target.value })}
          autoFocus
          onKeyDown={e => { if (e.key === 'Enter') ok(); if (e.key === 'Escape') cancel(); }}
          style={{ width: '100%', background: '#0d0f13', border: '1px solid #23272f', borderRadius: 7, padding: '8px 10px', color: '#e7e9ee', fontSize: 13, outline: 'none', marginBottom: 14, boxSizing: 'border-box' }}
        />
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button type="button" onClick={cancel} style={{ background: 'transparent', border: '1px solid #23272f', color: '#9aa0ab', fontSize: 12.5, padding: '7px 14px', borderRadius: 7, cursor: 'pointer' }}>Cancel</button>
          <button type="button" onClick={ok} style={{ background: '#4c8dff', border: 'none', color: '#06122b', fontWeight: 600, fontSize: 12.5, padding: '7px 14px', borderRadius: 7, cursor: 'pointer' }}>OK</button>
        </div>
      </div>
    </div>
  );
}
