import React from 'react';
import { useAtlas } from '../state/AtlasContext';
import { ago } from '../lib/format';

const seg = on => ({
  padding: '5px 11px', fontSize: 12, fontWeight: 500, cursor: 'pointer', borderRadius: 6, border: 'none',
  fontFamily: 'inherit', whiteSpace: 'nowrap', transition: '.12s',
  background: on ? '#34d3a6' : 'transparent', color: on ? '#06120d' : '#9aa0ab'
});

export default function Header() {
  const { ui, patch, server } = useAtlas();
  const { scope, lastSync } = server;
  const connected = !!lastSync;
  const scopeReady = !!(scope.space && scope.fixVersion);

  const dotColor = !connected ? '#4c8dff' : scopeReady ? '#3fb950' : '#ff5a4c';
  const jiraLabel = connected ? 'Space sync' : 'Set up space sync';

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, height: 56, flex: 'none', padding: '0 14px', borderBottom: '1px solid #1a1d23', background: '#0d0e12', position: 'relative' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 11, flex: 'none' }}>
        <div style={{ width: 26, height: 26, borderRadius: 7, background: 'linear-gradient(135deg,#34d3a6,#1f8f74)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: '#06120d', fontWeight: 700 }}>◆</div>
        <span style={{ fontWeight: 600, fontSize: 19, letterSpacing: '.2px', whiteSpace: 'nowrap' }}>Defect Atlas</span>
      </div>

      <div style={{ width: 1, height: 26, background: '#1f232b' }} />

      <button
        type="button"
        onClick={() => patch({ modalOpen: true })}
        style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '5px 11px', borderRadius: 9, cursor: 'pointer',
          fontWeight: 500, flex: 'none', whiteSpace: 'nowrap', transition: '.12s',
          border: `1px solid ${connected ? '#23272f' : '#2c4a86'}`,
          background: connected ? '#13161b' : 'rgba(76,141,255,.12)', color: '#e7e9ee'
        }}
      >
        <span style={{ width: 8, height: 8, borderRadius: '50%', flex: 'none', background: dotColor, animation: connected && !scopeReady ? undefined : undefined }} />
        <span style={{ fontSize: 12.5, whiteSpace: 'nowrap' }}>{jiraLabel}</span>
      </button>

      <div style={{ display: 'flex', alignItems: 'center', gap: 14, flex: 'none' }}>
        <Field label="Space" value={scope.space || '—'} mono={false} />
        <Field label="Fix Version" value={scope.fixVersion || '—'} mono />
        <Field label="Last Sync" value={ago(lastSync)} mono />
      </div>

      <div style={{ flex: 1 }} />

      <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,.02)', border: '1px solid #1c2027', borderRadius: 8, padding: '5px 9px', flex: 'none' }}>
        <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, color: '#8b93a1', textTransform: 'uppercase', letterSpacing: '.3px' }}>Stories in progress</span>
        <LegendDot color="#f6b13c" label="requirements" />
        <LegendDot color="#38bdf8" label="code" />
        <LegendDot color="#ff5a4c" label="both" />
      </div>

      {server.user && server.user.isAdmin && (
        <button type="button" onClick={() => patch({ membersOpen: true })} style={{ background: '#14171d', border: '1px solid #23272f', color: '#9aa0ab', fontSize: 11.5, padding: '5px 10px', borderRadius: 7, cursor: 'pointer', flex: 'none' }}>
          Members
        </button>
      )}
      {server.user && (
        <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, color: '#8b93a1', textTransform: 'uppercase', letterSpacing: '.4px', flex: 'none' }}>{server.user.role}</span>
      )}

      <div style={{ display: 'flex', gap: 2, background: '#14171d', padding: 3, borderRadius: 9, border: '1px solid #1f232b', flex: 'none' }}>
        <button type="button" aria-pressed={ui.view === 'annotations'} style={seg(ui.view === 'annotations')} onClick={() => patch({ view: 'annotations' })}>Annotations</button>
        <button
          type="button"
          aria-pressed={ui.view === 'off'}
          style={seg(ui.view === 'off')}
          onClick={() => patch({ view: 'off', drawMode: false, drawStart: null, drawCurrent: null, editShapeId: null })}
        >
          Off
        </button>
      </div>
    </div>
  );
}

function Field({ label, value, mono }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.2, flex: 'none' }}>
      <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, letterSpacing: '.5px', textTransform: 'uppercase', color: '#8b93a1' }}>{label}</span>
      <span style={{ fontFamily: mono ? "'IBM Plex Mono',monospace" : undefined, fontSize: 12, color: '#c7cbd3', whiteSpace: 'nowrap' }}>{value}</span>
    </div>
  );
}

function LegendDot({ color, label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <span style={{ width: 16, height: 0, borderTop: `2px dotted ${color}` }} />
      <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 12, color: '#7a818d' }}>{label}</span>
    </div>
  );
}
