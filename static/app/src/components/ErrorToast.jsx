import React from 'react';
import { useAtlas } from '../state/AtlasContext';

export default function ErrorToast() {
  const { ui, patch } = useAtlas();
  if (!ui.error) return null;
  return (
    <div role="alert" style={{ position: 'fixed', left: '50%', bottom: 24, transform: 'translateX(-50%)', zIndex: 60, display: 'flex', alignItems: 'center', gap: 12, background: '#1c1416', border: '1px solid #3a2528', color: '#e08a82', borderRadius: 10, padding: '10px 16px', fontSize: 12.5, boxShadow: '0 20px 50px -15px rgba(0,0,0,.6)', maxWidth: 480 }}>
      <span>{ui.error}</span>
      <button type="button" aria-label="Dismiss error" onClick={() => patch({ error: null })} style={{ background: 'transparent', border: 'none', color: '#e08a82', fontSize: 14, cursor: 'pointer', lineHeight: 1 }}>×</button>
    </div>
  );
}
