import React from 'react';
import { useAtlas } from '../state/AtlasContext';

export default function ArtifactLibrary({ onUploadClick }) {
  const { ui, patch, server, actions } = useAtlas();
  const canEdit = server.user && server.user.role === 'editor';

  const rows = server.artifacts.slice().sort((a, b) => {
    const ca = a.component || '￿', cb = b.component || '￿';
    const c = ca.localeCompare(cb, undefined, { sensitivity: 'base' });
    return c !== 0 ? c : (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' });
  });

  return (
    <div style={{ position: 'absolute', top: 44, right: 14, zIndex: 30, width: 'max-content', minWidth: 320, maxWidth: 'min(620px, calc(100% - 28px))', maxHeight: 'calc(100% - 60px)', overflow: 'auto', background: '#13161b', border: '1px solid #23272f', borderRadius: 12, boxShadow: '0 20px 50px -15px rgba(0,0,0,.6)', padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <span style={{ fontSize: 12.5, fontWeight: 600, color: '#e7e9ee' }}>All Artifacts</span>
        <button type="button" aria-label="Close artifact list" onClick={() => patch({ importOpen: false })} style={{ background: '#14171d', border: '1px solid #23272f', color: '#9aa0ab', width: 22, height: 22, borderRadius: 6, cursor: 'pointer', fontSize: 13 }}>×</button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 10px 4px', fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, letterSpacing: '.5px', textTransform: 'uppercase', color: '#8b93a1', borderBottom: '1px solid #1c2027', whiteSpace: 'nowrap' }}>
          <span style={{ width: 6, flex: 'none' }} />
          <span style={{ width: 150, flex: 'none' }}>Component</span>
          <span style={{ flex: 1 }}>Artifact</span>
        </div>
        {rows.map(row => {
          const active = row.id === ui.selectedArtifactId;
          return (
            <div
              key={row.id}
              onClick={() => patch({ selectedArtifactId: row.id, sel: null, importOpen: false, drawMode: false, editShapeId: null })}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 8, cursor: 'pointer', whiteSpace: 'nowrap', fontSize: 12.5, border: `1px solid ${active ? '#2c4a86' : 'transparent'}`, background: active ? 'rgba(76,141,255,.1)' : '#0d0f13', color: active ? '#e7e9ee' : '#9aa0ab' }}
            >
              <span style={{ width: 6, height: 6, borderRadius: '50%', flex: 'none', background: active ? '#4c8dff' : '#3a4150' }} />
              <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, flex: 'none', width: 150, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: row.component ? 400 : 600, color: row.component ? '#c7cbd3' : '#ff5a4c' }}>
                {row.component || 'Pending'}
              </span>
              <span style={{ flex: 1, whiteSpace: 'nowrap' }}>{row.name}</span>
              {canEdit && (
                <button
                  type="button"
                  onClick={e => { e.stopPropagation(); patch({ renameOpen: true, renameTargetId: row.id, renameValue: row.name }); }}
                  style={{ background: '#14171d', border: '1px solid #23272f', color: '#9aa0ab', fontSize: 11, padding: '3px 7px', borderRadius: 5, cursor: 'pointer', flex: 'none' }}
                >
                  Rename
                </button>
              )}
              {canEdit && rows.length > 1 && (
                <button
                  type="button"
                  onClick={e => { e.stopPropagation(); patch({ confirmOpen: true, confirmTitle: `Delete "${row.name}"? Its drawn Component-Aspects will be lost.`, confirmKind: 'deleteArtifact', confirmPayload: row.id }); }}
                  style={{ background: '#1c1416', border: '1px solid #3a2528', color: '#e08a82', fontSize: 11, padding: '3px 7px', borderRadius: 5, cursor: 'pointer', flex: 'none' }}
                >
                  Delete
                </button>
              )}
            </div>
          );
        })}
      </div>

      {canEdit && (
        <div style={{ borderTop: '1px solid #1c2027', paddingTop: 12 }}>
          <button type="button" onClick={onUploadClick} style={{ width: '100%', border: '1px dashed #2c333e', color: '#fff', fontSize: 12, padding: 14, borderRadius: 8, cursor: 'pointer', marginBottom: 12, background: '#0055FF' }}>
            Upload a UI page or system diagram
          </button>
        </div>
      )}

      {!server.scope.space && (
        <div style={{ fontSize: 11.5, color: '#7a818d', lineHeight: 1.5 }}>Select a space and fix version to manage artifacts.</div>
      )}
    </div>
  );
}
