import React from 'react';
import { useAtlas } from '../state/AtlasContext';
import { heat, rgba, CAUSE_COLOR, SEVERITY_COLOR } from '../lib/color';
import { fmtDate, DAY } from '../lib/format';

export default function DetailPanel() {
  const { ui, patch, server, actions, artifact, view } = useAtlas();
  const connected = !!server.lastSync;
  const canEdit = server.user && server.user.role === 'editor';
  const selRegion = view.selRegion;

  return (
    <div style={{ width: 368, flex: 'none', borderLeft: '1px solid #1a1d23', background: '#0d0e12', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <div style={{ padding: '18px 20px 14px', borderBottom: '1px solid #181b21' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, color: '#8b93a1', letterSpacing: '.5px', textTransform: 'uppercase', marginBottom: 4 }}>
              {!connected ? 'Jira' : 'Component'}
            </div>
            {connected ? (
              <select
                title="Jira component for this artifact"
                value={(artifact && artifact.component) || ''}
                disabled={!canEdit || !artifact}
                onChange={e => actions.setArtifactComponent(artifact.id, e.target.value)}
                style={{
                  width: '100%', fontSize: 15, fontWeight: 600, padding: '5px 8px', background: '#0d0f13',
                  border: `1px solid ${artifact && artifact.component ? '#23272f' : '#4a3a24'}`, borderRadius: 6,
                  color: artifact && artifact.component ? '#c7cbd3' : '#c9a15e', fontFamily: "'IBM Plex Mono',monospace", cursor: canEdit ? 'pointer' : 'default'
                }}
              >
                <option value="">— Pending —</option>
                {server.components.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            ) : (
              <div style={{ fontSize: 18, fontWeight: 600, letterSpacing: '.1px', lineHeight: 1.3, width: '100%', minWidth: 0 }}>Not connected</div>
            )}

            {selRegion && (
              <>
                <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, color: '#8b93a1', letterSpacing: '.5px', textTransform: 'uppercase', marginTop: 10, marginBottom: 4 }}>Component-Aspect</div>
                <div style={{ fontSize: 15, color: '#34d3a6', fontWeight: 600, letterSpacing: '.1px' }}>{selRegion.name}</div>
                {canEdit && (
                  <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                    <button type="button" onClick={() => patch({ promptOpen: true, promptTitle: 'Rename Component-Aspect', promptValue: selRegion.name, promptKind: 'renameRegion' })} style={{ background: '#14171d', border: '1px solid #23272f', color: '#9aa0ab', fontSize: 11, padding: '4px 9px', borderRadius: 6, cursor: 'pointer' }}>Rename</button>
                    <button
                      type="button"
                      onClick={() => patch({ editShapeId: ui.editShapeId === selRegion.id ? null : selRegion.id })}
                      style={{ fontSize: 11, padding: '4px 9px', borderRadius: 6, cursor: 'pointer', border: `1px solid ${ui.editShapeId === selRegion.id ? '#2c4a86' : '#23272f'}`, background: ui.editShapeId === selRegion.id ? 'rgba(76,141,255,.14)' : '#14171d', color: ui.editShapeId === selRegion.id ? '#9cc0ff' : '#9aa0ab' }}
                    >
                      {ui.editShapeId === selRegion.id ? 'Done editing' : 'Edit shape'}
                    </button>
                    <button type="button" onClick={() => patch({ confirmOpen: true, confirmTitle: 'Delete this Component-Aspect', confirmKind: 'deleteRegion', confirmPayload: selRegion.id })} style={{ background: '#1c1416', border: '1px solid #3a2528', color: '#e08a82', fontSize: 11, padding: '4px 9px', borderRadius: 6, cursor: 'pointer' }}>Delete</button>
                  </div>
                )}
              </>
            )}
          </div>
          {selRegion && (
            <button type="button" aria-label="Close Component-Aspect details" onClick={() => patch({ sel: null })} style={{ background: '#14171d', border: '1px solid #23272f', color: '#9aa0ab', width: 26, height: 26, borderRadius: 7, cursor: 'pointer', fontSize: 14, lineHeight: 1, flex: 'none' }}>×</button>
          )}
        </div>
        {connected && <div style={{ fontSize: 12.5, color: '#7a818d', marginTop: 10, fontFamily: "'IBM Plex Mono',monospace" }}>as of {view.dateLabel}</div>}
      </div>

      {connected && (
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #181b21', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
            <span style={{ fontSize: 34, fontWeight: 600, fontFamily: "'IBM Plex Mono',monospace", lineHeight: 1 }}>{view.openTotal}</span>
            <span style={{ fontSize: 13, color: '#7a818d' }}>defects</span>
            <span style={{ marginLeft: 'auto', fontSize: 12, fontWeight: 500, color: view.trendColor, fontFamily: "'IBM Plex Mono',monospace" }}>{view.trendArrow} {view.trendText}</span>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {ui.status.open && (
              <div style={{ flex: 1, background: '#13161b', border: '1px solid #1e222a', borderRadius: 8, padding: '10px 12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 7, height: 7, borderRadius: '50%', background: '#34d3a6' }} /><span style={{ fontSize: 11, color: '#8b919c' }}>Open</span></div>
                <div style={{ fontSize: 20, fontWeight: 600, fontFamily: "'IBM Plex Mono',monospace", marginTop: 3 }}>{view.openCount}</div>
              </div>
            )}
            {ui.status.closed && (
              <div style={{ flex: 1, background: '#13161b', border: '1px solid #1e222a', borderRadius: 8, padding: '10px 12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 7, height: 7, borderRadius: '50%', background: '#5fd0a0', opacity: 0.55 }} /><span style={{ fontSize: 11, color: '#8b919c' }}>Closed</span></div>
                <div style={{ fontSize: 20, fontWeight: 600, fontFamily: "'IBM Plex Mono',monospace", marginTop: 3, color: '#9aa0ab' }}>{view.closedCount}</div>
              </div>
            )}
          </div>
        </div>
      )}

      {connected && !selRegion && (
        <div className="scrolly" style={{ flex: 1, minHeight: 0, overflow: 'auto', padding: '14px 20px 20px' }}>
          <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, color: '#8b93a1', letterSpacing: '.5px', textTransform: 'uppercase', marginBottom: 12 }}>Defects by Component-Aspect — click to inspect</div>
          {view.ranked.map(r => {
            const col = heat(r.intensity);
            return (
              <button
                key={r.id}
                type="button"
                onClick={() => patch({ sel: r.id })}
                style={{ display: 'flex', flexDirection: 'column', gap: 7, padding: '11px 12px', borderRadius: 9, cursor: 'pointer', border: '1px solid #1a1d23', background: '#111419', marginBottom: 8, width: '100%', textAlign: 'left', color: 'inherit', font: 'inherit' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 13.5, fontWeight: 500 }}>{r.name}</span>
                  <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 13, color: '#c7cbd3' }}>{r.open}</span>
                </div>
                <div style={{ height: 6, borderRadius: 3, background: '#1c2129', overflow: 'hidden', width: '100%' }}>
                  <div style={{ height: 6, borderRadius: 3, background: `rgba(${col[0]},${col[1]},${col[2]},.95)`, width: `${Math.max(3, r.intensity * 100).toFixed(1)}%` }} />
                </div>
              </button>
            );
          })}
          {view.regions.length === 0 && (
            <div style={{ textAlign: 'center', color: '#8b93a1', fontSize: 12.5, padding: '30px 0', fontFamily: "'IBM Plex Mono',monospace" }}>no Component-Aspects drawn on this artifact yet — click "+ Annotate" above</div>
          )}
          {view.unmappedVisible.length > 0 && (
            <div style={{ marginTop: 10, padding: '9px 12px', borderRadius: 9, border: '1px dashed #2c333e', color: '#8b93a1', fontSize: 12 }}>
              {view.unmappedVisible.length} defect{view.unmappedVisible.length === 1 ? '' : 's'} counted at component level — their Component-Aspect value doesn't match a drawn region.
            </div>
          )}
        </div>
      )}

      {connected && selRegion && (
        <>
          <div style={{ padding: '12px 20px 0', display: 'flex', gap: 18 }}>
            <div><span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 15, fontWeight: 600 }}>{view.totalCount}</span><span style={{ fontSize: 11.5, color: '#7a818d', marginLeft: 5 }}>total filed</span></div>
            <div><span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 15, fontWeight: 600, color: '#5fd0a0' }}>{view.resolvedCount}</span><span style={{ fontSize: 11.5, color: '#7a818d', marginLeft: 5 }}>resolved</span></div>
          </div>
          <div className="scrolly" style={{ flex: 1, minHeight: 0, overflow: 'auto', padding: '14px 20px 20px' }}>
            <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, color: '#8b93a1', letterSpacing: '.5px', textTransform: 'uppercase', marginBottom: 12 }}>Tickets in this Component-Aspect</div>
            {view.visibleTickets
              .slice()
              .sort((a, b) => {
                const sa = a.status === 'open' ? 0 : 1, sb = b.status === 'open' ? 0 : 1;
                if (sa !== sb) return sa - sb;
                return sa === 0 ? b.createdAt - a.createdAt : (b.resolvedAt || 0) - (a.resolvedAt || 0);
              })
              .map(t => <TicketRow key={t.key} t={t} now={view.now} canEdit={canEdit} />)}
            {view.visibleTickets.length === 0 && (
              <div style={{ textAlign: 'center', color: '#8b93a1', fontSize: 12.5, padding: '30px 0', fontFamily: "'IBM Plex Mono',monospace" }}>no defects match the current filters</div>
            )}
          </div>
        </>
      )}

      {!connected && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 30 }}>
          <div style={{ width: 42, height: 42, borderRadius: 11, background: 'rgba(76,141,255,.12)', border: '1px solid #2c4a86', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14, color: '#4c8dff', fontWeight: 700 }}>J</div>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>No space synced</div>
          <div style={{ fontSize: 12.5, color: '#7a818d', lineHeight: 1.5, maxWidth: 230, marginBottom: 16 }}>Pick a space and fix version to sync bug issues and inspect defects by Component-Aspect.</div>
          <button type="button" onClick={() => patch({ modalOpen: true })} style={{ background: '#14171d', border: '1px solid #2c4a86', color: '#9cc0ff', fontWeight: 500, fontSize: 12.5, padding: '8px 16px', borderRadius: 8, cursor: 'pointer' }}>Open space sync</button>
        </div>
      )}
    </div>
  );
}

function TicketRow({ t, now, canEdit }) {
  const { server, actions } = useAtlas();
  const closed = t.status === 'closed';
  const sevColor = SEVERITY_COLOR[t.severity];
  const causeColor = CAUSE_COLOR[t.rootCause];
  const statusConflict = server.conflicts.some(c => c.issueKey === t.key && c.field === 'status');
  const severityConflict = server.conflicts.some(c => c.issueKey === t.key && c.field === 'severity');

  return (
    <div style={{ padding: '11px 12px', borderRadius: 9, border: '1px solid #1a1d23', background: '#111419', marginBottom: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
        <span style={{ width: 7, height: 7, borderRadius: '50%', flex: 'none', background: sevColor, opacity: closed ? 0.45 : 1 }} />
        <a href={`https://jira.atlassian.net/browse/${t.key}`} target="_blank" rel="noopener noreferrer" style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 11.5, color: '#9cc0ff', textDecoration: 'none' }}>{t.key} ↗</a>

        {canEdit ? (
          <select
            value={t.status}
            disabled={statusConflict}
            title={statusConflict ? 'Conflicted — resolve in Space sync before editing' : undefined}
            onChange={e => actions.setIssueField(t.key, 'status', e.target.value)}
            style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, letterSpacing: '.4px', textTransform: 'uppercase', padding: '2px 6px', borderRadius: 4, border: 'none', cursor: statusConflict ? 'not-allowed' : 'pointer', color: closed ? '#5fd0a0' : '#34d3a6', background: closed ? 'rgba(95,208,160,.12)' : 'rgba(52,211,166,.13)' }}
          >
            <option value="open">open</option>
            <option value="closed">closed</option>
          </select>
        ) : (
          <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, letterSpacing: '.4px', textTransform: 'uppercase', padding: '2px 6px', borderRadius: 4, color: closed ? '#5fd0a0' : '#34d3a6', background: closed ? 'rgba(95,208,160,.12)' : 'rgba(52,211,166,.13)' }}>{t.status}</span>
        )}
        {statusConflict && <span title="Status is conflicted with Jira — resolve in Space sync" style={{ color: '#f6b13c', fontSize: 12 }}>⚠</span>}

        <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, letterSpacing: '.4px', textTransform: 'uppercase', padding: '2px 6px', borderRadius: 4, color: causeColor, background: rgba(causeColor, 0.13) }}>{t.rootCause}</span>

        <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4 }}>
          {canEdit ? (
            <select
              value={t.severity}
              disabled={severityConflict}
              title={severityConflict ? 'Conflicted — resolve in Space sync before editing' : undefined}
              onChange={e => actions.setIssueField(t.key, 'severity', e.target.value)}
              style={{ background: 'transparent', border: 'none', fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, color: sevColor, textTransform: 'uppercase', letterSpacing: '.4px', cursor: severityConflict ? 'not-allowed' : 'pointer' }}
            >
              <option value="critical">critical</option>
              <option value="major">major</option>
              <option value="minor">minor</option>
            </select>
          ) : (
            <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, color: sevColor, textTransform: 'uppercase', letterSpacing: '.4px' }}>{t.severity}</span>
          )}
          {severityConflict && <span title="Severity is conflicted with Jira — resolve in Space sync" style={{ color: '#f6b13c', fontSize: 12 }}>⚠</span>}
        </span>
      </div>
      <div style={{ fontSize: 13, lineHeight: 1.4, marginBottom: 8, color: closed ? '#9aa0ab' : '#dadce1' }}>{t.title}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 11, color: '#8b93a1', fontFamily: "'IBM Plex Mono',monospace" }}>
        <span>filed {fmtDate(t.createdAt)}</span>
        <span style={{ width: 3, height: 3, borderRadius: '50%', background: '#3a4150' }} />
        <span>{closed ? `closed ${fmtDate(t.resolvedAt)}` : `${Math.max(0, Math.round((now - t.createdAt) / DAY))}d open`}</span>
        <span style={{ marginLeft: 'auto', color: '#4d5460' }}>{t.reporter}</span>
      </div>
    </div>
  );
}
