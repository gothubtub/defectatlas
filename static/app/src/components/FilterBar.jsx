import React from 'react';
import { useAtlas } from '../state/AtlasContext';
import { SEVERITY_META, STATUS_META, CAUSE_META, rgba } from '../lib/color';

function chipStyle(on, col) {
  return {
    display: 'flex', alignItems: 'center', gap: 6, padding: '4px 9px', borderRadius: 8, cursor: 'pointer',
    fontSize: 12, fontWeight: 500, whiteSpace: 'nowrap', transition: '.12s',
    border: `1px solid ${on ? col : '#23272f'}`,
    background: on ? rgba(col, 0.14) : 'transparent',
    color: on ? '#eef0f4' : '#8b93a1'
  };
}

function Group({ label, meta, on, counts, onToggle }) {
  return (
    <>
      <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, color: '#8b93a1', letterSpacing: '.4px', textTransform: 'uppercase', flex: 'none' }}>{label}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 'none' }}>
        {meta.map(([key, text, col]) => (
          <button
            key={key}
            type="button"
            aria-pressed={on[key]}
            style={chipStyle(on[key], col)}
            onClick={() => onToggle(key)}
          >
            <span style={{ width: 8, height: 8, borderRadius: '50%', flex: 'none', background: on[key] ? col : '#3a4150' }} />
            <span>{text}</span>
            <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, opacity: 0.7 }}>{counts[key] || 0}</span>
          </button>
        ))}
      </div>
    </>
  );
}

export default function FilterBar() {
  const { ui, dispatch, view } = useAtlas();
  const counts = view.chipCounts;

  return (
    <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px 10px', minHeight: 42, flex: 'none', padding: '8px 16px', borderBottom: '1px solid #1a1d23', background: '#0d0e12' }}>
      <Group label="Severity" meta={SEVERITY_META} on={ui.sev} counts={counts.sev} onToggle={key => dispatch({ type: 'toggleSeverity', key })} />
      <div style={{ width: 1, height: 22, background: '#1f232b', flex: 'none' }} />
      <Group label="Status" meta={STATUS_META} on={ui.status} counts={counts.status} onToggle={key => dispatch({ type: 'toggleStatus', key })} />
      <div style={{ width: 1, height: 22, background: '#1f232b', flex: 'none' }} />
      <Group label="Root cause" meta={CAUSE_META} on={ui.cause} counts={counts.cause} onToggle={key => dispatch({ type: 'toggleCause', key })} />
    </div>
  );
}
