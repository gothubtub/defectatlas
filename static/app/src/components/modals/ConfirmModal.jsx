import React from 'react';
import { useAtlas } from '../../state/AtlasContext';

export default function ConfirmModal() {
  const { ui, patch, actions, artifact } = useAtlas();
  if (!ui.confirmOpen) return null;

  function cancel() { patch({ confirmOpen: false, confirmTitle: '', confirmKind: null, confirmPayload: null }); }
  function ok() {
    if (ui.confirmKind === 'deleteRegion') {
      actions.deleteRegion(artifact.id, ui.confirmPayload);
      patch({ sel: null, editShapeId: null });
    } else if (ui.confirmKind === 'deleteArtifact') {
      actions.deleteArtifact(ui.confirmPayload);
    }
    cancel();
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 40, background: 'rgba(0,0,0,.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 300, background: '#13161b', border: '1px solid #23272f', borderRadius: 12, boxShadow: '0 20px 50px -15px rgba(0,0,0,.6)', padding: 18 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#e7e9ee', marginBottom: 16 }}>{ui.confirmTitle}</div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button type="button" onClick={cancel} style={{ background: 'transparent', border: '1px solid #23272f', color: '#9aa0ab', fontSize: 12.5, padding: '7px 14px', borderRadius: 7, cursor: 'pointer' }}>Cancel</button>
          <button type="button" onClick={ok} style={{ background: '#e5484d', border: 'none', color: '#1a0505', fontWeight: 600, fontSize: 12.5, padding: '7px 14px', borderRadius: 7, cursor: 'pointer' }}>Delete</button>
        </div>
      </div>
    </div>
  );
}
