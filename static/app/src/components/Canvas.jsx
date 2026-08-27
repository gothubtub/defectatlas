import React, { useEffect, useRef, useState } from 'react';
import { useAtlas } from '../state/AtlasContext';
import { rectBounds, rectCorners, toLocal, CANVAS_W, CANVAS_H } from '../lib/geometry';
import { rgba } from '../lib/color';
import ArtifactLibrary from './ArtifactLibrary';

const CAUSE_OUTLINE = { requirements: '#f6b13c', code: '#38bdf8', both: '#ff5a4c' };

function regionVisuals(region, selected) {
  const both = region.reqOpen > 0 && region.codeOpen > 0;
  const causeColor = both ? CAUSE_OUTLINE.both : region.reqOpen > 0 ? CAUSE_OUTLINE.requirements : region.codeOpen > 0 ? CAUSE_OUTLINE.code : null;
  const stroke = selected ? (causeColor || '#7a818d') : (causeColor || '#8b93a1');
  const fill = selected ? (causeColor ? rgba(causeColor, 0.14) : 'rgba(255,255,255,.08)') : (causeColor ? rgba(causeColor, 0.06) : 'rgba(255,255,255,.02)');
  return { stroke, fill };
}

export default function Canvas() {
  const { ui, patch, server, actions, artifact, view } = useAtlas();
  const scrollyRef = useRef(null);
  const canvasRef = useRef(null);
  const draggingRef = useRef(false);
  const draggingVertexRef = useRef(null);
  const fileInputRef = useRef(null);
  // Vertex drags are applied to the server on release only (not per
  // pointermove — that would flood the resolver with a request per pixel).
  // While dragging, the edited region's on-screen bounds come from this
  // local override instead of the server-derived `view.regions` entry.
  const [vertexDrag, setVertexDrag] = useState(null);

  const connected = !!server.lastSync;
  const canEdit = server.user && server.user.role === 'editor';
  const hasComponent = !!(artifact && artifact.component);
  const canDraw = canEdit && hasComponent;
  const drawing = ui.drawMode;

  useEffect(() => {
    const el = scrollyRef.current;
    if (!el) return;
    const update = () => {
      const availW = el.clientWidth - 56, availH = el.clientHeight - 96;
      const scale = Math.max(0.2, Math.min(2.5, availW / CANVAS_W, availH / (CANVAS_H + 42)));
      patch({ canvasScale: scale });
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape' && ui.drawMode) cancelDraw();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }); // eslint-disable-line react-hooks/exhaustive-deps

  function startDraw() {
    if (!canDraw) return;
    patch({ drawMode: true, drawStart: null, drawCurrent: null, sel: null, editShapeId: null });
  }
  function cancelDraw() {
    draggingRef.current = false;
    patch({ drawMode: false, drawStart: null, drawCurrent: null });
  }
  function onDrawStart(e) {
    if (!drawing) return;
    const pt = toLocal(e, canvasRef.current);
    draggingRef.current = true;
    patch({ drawStart: pt, drawCurrent: pt });
  }
  function onDrawMove(e) {
    if (!draggingRef.current) return;
    patch({ drawCurrent: toLocal(e, canvasRef.current) });
  }
  async function onDrawEnd() {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    const { drawStart, drawCurrent } = ui;
    if (!drawStart || !drawCurrent || Math.hypot(drawCurrent[0] - drawStart[0], drawCurrent[1] - drawStart[1]) < 6) {
      patch({ drawStart: null, drawCurrent: null });
      return;
    }
    patch({ promptOpen: true, promptTitle: 'Name this Component-Aspect', promptValue: '', promptKind: 'newRegion', promptPoints: [drawStart, drawCurrent] });
  }
  function onVertexDown(e, regionId, idx) {
    e.stopPropagation();
    e.target.setPointerCapture(e.pointerId);
    const region = artifact.regions.find(r => r.id === regionId);
    draggingVertexRef.current = { regionId, idx };
    setVertexDrag({ regionId, points: region.points });
  }
  function onVertexMove(e) {
    if (!draggingVertexRef.current) return;
    const { regionId, idx } = draggingVertexRef.current;
    const pt = toLocal(e, canvasRef.current);
    const region = artifact.regions.find(r => r.id === regionId);
    if (!region) return;
    // Corners 0/1 are the two drag-defined points; dragging a derived
    // corner (2 or 3) adjusts whichever primary point shares its
    // coordinate, so the rectangle keeps four consistent corners.
    const bounds = rectBounds(region.points);
    const corners = rectCorners(bounds).map((c, i) => (i === idx ? pt : c));
    const xs = corners.map(c => c[0]), ys = corners.map(c => c[1]);
    setVertexDrag({ regionId, points: [[Math.min(...xs), Math.min(...ys)], [Math.max(...xs), Math.max(...ys)]] });
  }
  function onVertexUp() {
    if (draggingVertexRef.current && vertexDrag) {
      actions.updateRegionPoints(artifact.id, vertexDrag.regionId, vertexDrag.points);
    }
    draggingVertexRef.current = null;
    setVertexDrag(null);
  }

  const editRegion = ui.editShapeId ? view.regions.find(r => r.id === ui.editShapeId) : null;
  const editRegionBounds = editRegion ? (vertexDrag && vertexDrag.regionId === editRegion.id ? rectBounds(vertexDrag.points) : editRegion.bounds) : null;
  const dragActive = drawing && !!ui.drawStart && !!ui.drawCurrent;
  const dragRect = dragActive ? rectBounds([ui.drawStart, ui.drawCurrent]) : null;

  const showNotConnected = !connected;

  return (
    <div
      ref={scrollyRef}
      className="scrolly"
      style={{ flex: 1, minWidth: 0, overflow: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: '20px 28px 28px', background: 'radial-gradient(1200px 600px at 50% -10%,#11141a,#0a0b0e 70%)', position: 'relative' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, width: '100%', flex: 'none' }}>
        <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, letterSpacing: '.5px', textTransform: 'uppercase', color: '#8b93a1', flex: 'none' }}>Artifact</span>
        <span style={{ fontSize: 13.5, fontWeight: 500, color: '#e7e9ee', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{artifact ? artifact.name : '—'}</span>
      </div>

      <div style={{ width: Math.round(CANVAS_W * ui.canvasScale), height: Math.round((CANVAS_H + 42) * ui.canvasScale), flex: 'none' }}>
        <div style={{ width: CANVAS_W, borderRadius: 9, boxShadow: '0 30px 80px -20px rgba(0,0,0,.7),0 0 0 1px #1c2027', position: 'relative', transform: `scale(${ui.canvasScale})`, transformOrigin: 'top left' }}>
          <div style={{ borderRadius: 9, overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, height: 42, padding: '0 14px', background: '#15181e', borderBottom: '1px solid #1c2027' }}>
              <div style={{ flex: 1, height: 26 }}>
                <button
                  type="button"
                  title={!canEdit ? 'Viewers cannot annotate' : hasComponent ? 'Draw a Component-Aspect on this artifact' : 'Assign a Jira component to this artifact first'}
                  onClick={() => (drawing ? cancelDraw() : startDraw())}
                  disabled={!canDraw}
                  style={{ color: canDraw ? '#34D3A6' : '#464c57', background: '#000', border: `2px solid ${canDraw ? '#20242C' : '#171a20'}`, fontFamily: 'IBM Plex Sans', fontWeight: 600, fontSize: 12, padding: '6px 12px', borderRadius: 6, cursor: canDraw ? 'pointer' : 'not-allowed' }}
                >
                  {drawing ? 'Cancel draw' : '+ Annotate'}
                </button>
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => { const f = e.target.files[0]; if (f) actions.uploadArtifact(f); e.target.value = ''; }} />
              <button type="button" aria-label="Toggle artifact list" onClick={() => patch({ importOpen: !ui.importOpen })} style={{ color: '#9AA0AB', background: '#000', fontSize: 12, borderWidth: 2, borderStyle: 'solid', borderColor: '#20242C', borderRadius: 6, padding: '4px 10px', cursor: 'pointer' }}>
                All Artifacts ▾
              </button>
            </div>

            <div style={{ position: 'relative', width: CANVAS_W, height: CANVAS_H, background: '#0e1014' }}>
              {artifact && artifact.imageUrl ? (
                <div style={{ position: 'absolute', inset: 0, width: CANVAS_W, height: CANVAS_H, backgroundColor: '#0e1014', backgroundImage: `url(${JSON.stringify(artifact.imageUrl).slice(1, -1)})`, backgroundSize: 'contain', backgroundRepeat: 'no-repeat', backgroundPosition: 'center', zIndex: 1, pointerEvents: 'none' }} />
              ) : (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3a4150', fontFamily: "'IBM Plex Mono',monospace", fontSize: 13, zIndex: 1 }}>
                  {artifact ? artifact.name : 'no artifact selected'}
                </div>
              )}

              {ui.view === 'annotations' && connected && (
                <div style={{ position: 'absolute', inset: 0, zIndex: 3, pointerEvents: 'none' }}>
                  {view.markers.map(mk => (
                    <div key={mk.id} style={{
                      position: 'absolute', left: mk.cx, top: mk.cy, width: mk.d, height: mk.d, marginLeft: -mk.d / 2, marginTop: -mk.d / 2,
                      borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: `rgba(${mk.color[0]},${mk.color[1]},${mk.color[2]},0.95)`,
                      boxShadow: `0 0 0 4px rgba(${mk.color[0]},${mk.color[1]},${mk.color[2]},0.18),0 4px 14px rgba(0,0,0,.5)`,
                      color: '#0a0b0e', fontWeight: 600, fontSize: mk.fontSize, fontFamily: 'IBM Plex Mono,monospace'
                    }}>{mk.label}</div>
                  ))}
                </div>
              )}

              {ui.view === 'annotations' && (
                <div
                  ref={canvasRef}
                  onPointerDown={onDrawStart}
                  onPointerMove={onDrawMove}
                  onPointerUp={onDrawEnd}
                  style={{ position: 'absolute', inset: 0, zIndex: 5, cursor: drawing ? 'crosshair' : 'default', pointerEvents: drawing || draggingVertexRef.current ? 'auto' : 'auto' }}
                >
                  <svg width={CANVAS_W} height={CANVAS_H} style={{ position: 'absolute', left: 0, top: 0, pointerEvents: 'none' }}>
                    {view.regions.map(r => {
                      const selected = ui.sel === r.id;
                      const { stroke, fill } = regionVisuals(r, selected);
                      const bounds = vertexDrag && vertexDrag.regionId === r.id ? rectBounds(vertexDrag.points) : r.bounds;
                      return (
                        <polygon
                          key={r.id}
                          points={rectCorners(bounds).map(p => p.join(',')).join(' ')}
                          style={{ fill, stroke, strokeWidth: 2, strokeDasharray: '5,4', cursor: 'pointer', pointerEvents: drawing ? 'none' : 'auto', transition: 'stroke .15s,fill .15s' }}
                          onClick={() => !drawing && patch({ sel: r.id, editShapeId: null })}
                        />
                      );
                    })}
                    {editRegion && rectCorners(editRegionBounds).map((p, idx) => (
                      <circle
                        key={idx}
                        cx={p[0]} cy={p[1]} r={6}
                        style={{ fill: '#0a0b0e', stroke: '#34d3a6', strokeWidth: 2, cursor: 'grab', pointerEvents: 'auto' }}
                        onPointerDown={e => onVertexDown(e, editRegion.id, idx)}
                        onPointerMove={onVertexMove}
                        onPointerUp={onVertexUp}
                      />
                    ))}
                    {dragActive && (
                      <rect x={dragRect.x} y={dragRect.y} width={dragRect.w} height={dragRect.h} style={{ fill: 'rgba(52,211,166,.08)', stroke: '#34d3a6', strokeWidth: 2, strokeDasharray: '5 4', pointerEvents: 'none' }} />
                    )}
                  </svg>
                  {view.regions.map(r => {
                    const selected = ui.sel === r.id;
                    const bounds = vertexDrag && vertexDrag.regionId === r.id ? rectBounds(vertexDrag.points) : r.bounds;
                    return (
                      <div key={r.id} style={{
                        position: 'absolute', left: bounds.x + 6, top: bounds.y + 5,
                        fontFamily: 'IBM Plex Mono,monospace', fontWeight: 700, fontSize: 16, letterSpacing: '.3px',
                        background: 'rgba(255,255,255,.9)', color: selected ? '#0f8f6f' : '#141821',
                        padding: '1px 5px', borderRadius: 3, pointerEvents: 'none', whiteSpace: 'nowrap', zIndex: 4
                      }}>{r.name}</div>
                    );
                  })}
                </div>
              )}

              {drawing && (
                <div style={{ position: 'absolute', left: '50%', bottom: 14, transform: 'translateX(-50%)', zIndex: 7, display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(10,11,14,.85)', border: '1px solid #23272f', borderRadius: 8, padding: '7px 12px', fontSize: 12, color: '#c7cbd3' }}>
                  <span>Click and drag to draw a rectangle · release to finish</span>
                  <button type="button" onClick={cancelDraw} style={{ background: '#1c1416', border: '1px solid #3a2528', color: '#e08a82', fontSize: 11, padding: '3px 9px', borderRadius: 6, cursor: 'pointer' }}>Cancel</button>
                </div>
              )}

              {showNotConnected && (
                <div style={{ position: 'absolute', inset: 0, zIndex: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(10,11,14,.74)', backdropFilter: 'blur(3px)' }}>
                  <div style={{ width: 360, textAlign: 'center', background: '#13161b', border: '1px solid #23272f', borderRadius: 14, padding: '30px 28px', boxShadow: '0 20px 60px -20px rgba(0,0,0,.7)' }}>
                    <div style={{ width: 46, height: 46, borderRadius: 12, background: 'rgba(76,141,255,.14)', border: '1px solid #2c4a86', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: 20, color: '#4c8dff', fontWeight: 700 }}>J</div>
                    <div style={{ fontSize: 17, fontWeight: 600, marginBottom: 7 }}>Select a space and fix version</div>
                    <div style={{ fontSize: 13, color: '#8b919c', lineHeight: 1.5, marginBottom: 20 }}>Choose a Jira space and fix version to pull bug issues and map them onto the artifact, so you can see where defects cluster over time.</div>
                    <button type="button" onClick={() => patch({ modalOpen: true })} style={{ background: '#4c8dff', border: 'none', color: '#06122b', fontWeight: 600, fontSize: 13.5, padding: '10px 20px', borderRadius: 9, cursor: 'pointer' }}>Set up space sync</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {ui.importOpen && <ArtifactLibrary onUploadClick={() => fileInputRef.current && fileInputRef.current.click()} />}
    </div>
  );
}
