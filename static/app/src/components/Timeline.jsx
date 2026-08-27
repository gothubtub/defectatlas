import React, { useEffect } from 'react';
import { useAtlas } from '../state/AtlasContext';

export default function Timeline() {
  const { ui, patch, view } = useAtlas();
  useEffect(() => {
    if (!ui.playing) return undefined;
    const iv = setInterval(() => {
      patch({ t: Math.min(1, ui.t + 0.006) });
      if (ui.t + 0.006 >= 1) patch({ playing: false });
    }, 55);
    return () => clearInterval(iv);
  }, [ui.playing, ui.t]); // eslint-disable-line react-hooks/exhaustive-deps

  function togglePlay() {
    if (ui.playing) { patch({ playing: false }); return; }
    patch({ t: ui.t >= 0.999 ? 0 : ui.t, playing: true });
  }

  return (
    <div style={{ flex: 'none', height: 158, borderTop: '1px solid #1a1d23', background: '#0d0e12', display: 'flex', alignItems: 'stretch', padding: '0 20px', gap: 22 }}>
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 10, width: 210, flex: 'none', padding: '16px 0' }}>
        <button type="button" onClick={togglePlay} style={{ display: 'flex', alignItems: 'center', gap: 9, background: '#14171d', border: '1px solid #23272f', color: '#e7e9ee', borderRadius: 9, padding: '8px 14px', cursor: 'pointer', fontSize: 13, fontWeight: 500, width: 'fit-content' }}>
          <span style={{ fontSize: 12, color: '#34d3a6' }}>{ui.playing ? '❚❚' : '▶'}</span>{ui.playing ? 'Pause' : 'Play history'}
        </button>
        <div>
          <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 17, fontWeight: 600, letterSpacing: '.3px' }}>{view.dateLabel}</div>
          <div style={{ fontSize: 11, color: '#8b93a1', marginTop: 2 }}>drag the timeline to travel through history</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 11, color: '#8b93a1', width: 32, fontFamily: "'IBM Plex Mono',monospace" }}>Start</span>
            <input type="date" value={ui.viewStartDate} onChange={e => e.target.value && patch({ viewStartDate: e.target.value })} style={{ background: '#14171d', border: '1px solid #23272f', color: '#c7cbd3', fontSize: 11, borderRadius: 6, padding: '3px 6px', fontFamily: "'IBM Plex Mono',monospace" }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 11, color: '#8b93a1', width: 32, fontFamily: "'IBM Plex Mono',monospace" }}>End</span>
            <span style={{ fontSize: 11, color: '#7a818d', fontFamily: "'IBM Plex Mono',monospace" }}>{view.viewEndLabel} (last sync)</span>
          </div>
        </div>
      </div>

      <div style={{ flex: 1, position: 'relative', padding: '18px 0 26px' }}>
        <svg viewBox="0 0 1000 118" preserveAspectRatio="none" width="100%" height="84" style={{ display: 'block', position: 'absolute', left: 0, top: 14 }}>
          <defs><linearGradient id="ar" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#34d3a6" stopOpacity="0.28" /><stop offset="1" stopColor="#34d3a6" stopOpacity="0.02" /></linearGradient></defs>
          <path d={view.areaPath} fill="url(#ar)" />
          <path d={view.linePath} fill="none" stroke="#34d3a6" strokeWidth="1.6" vectorEffect="non-scaling-stroke" />
        </svg>
        <div style={{ position: 'absolute', top: 8, bottom: 18, left: `${(ui.t * 100).toFixed(2)}%`, width: 0, zIndex: 4, pointerEvents: 'none' }}>
          <div style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: 2, background: '#e7e9ee', transform: 'translateX(-1px)', boxShadow: '0 0 8px rgba(231,233,238,.4)' }} />
          <div style={{ position: 'absolute', top: -4, left: 0, transform: 'translateX(-50%)', width: 12, height: 12, borderRadius: '50%', background: '#fff', boxShadow: '0 0 0 3px #0d0e12,0 0 10px rgba(255,255,255,.5)' }} />
        </div>
        <input
          className="scrub" type="range" min="0" max="1" step="0.0015" value={ui.t}
          onChange={e => patch({ t: parseFloat(e.target.value), playing: false })}
          onInput={e => patch({ t: parseFloat(e.target.value), playing: false })}
          style={{ position: 'absolute', left: 0, top: 8, width: '100%', height: 84, cursor: 'ew-resize', zIndex: 5 }}
          aria-label="Scrub timeline"
        />
        <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 18 }}>
          {view.ticks.map((tk, i) => (
            <div key={i} style={{ position: 'absolute', left: tk.left, transform: 'translateX(-50%)', fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, color: '#8b93a1', whiteSpace: 'nowrap' }}>{tk.label}</div>
          ))}
        </div>
      </div>
    </div>
  );
}
