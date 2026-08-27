export const initialUiState = {
  t: 0.66,
  view: 'annotations', // 'annotations' | 'off' — the prototype's markers/off toggle, renamed per the design chats
  sel: null,
  sev: { critical: true, major: true, minor: true },
  status: { open: true, closed: true },
  cause: { requirements: true, design: true, code: true, regression: true },
  selectedArtifactId: null,
  importOpen: false,
  playing: false,
  drawMode: false,
  drawStart: null,
  drawCurrent: null,
  editShapeId: null,
  renameOpen: false, renameValue: '', renameTargetId: null,
  promptOpen: false, promptTitle: '', promptValue: '', promptKind: null, promptPoints: null,
  confirmOpen: false, confirmTitle: '', confirmKind: null, confirmPayload: null,
  modalOpen: false,
  membersOpen: false,
  viewStartDate: '2025-01-01',
  canvasScale: 1,
  error: null
};

export function uiReducer(state, action) {
  switch (action.type) {
    case 'patch':
      return { ...state, ...action.patch };
    case 'toggleSeverity': {
      const on = state.sev[action.key];
      if (on && Object.values(state.sev).filter(Boolean).length <= 1) return state;
      return { ...state, sev: { ...state.sev, [action.key]: !on } };
    }
    case 'toggleStatus': {
      const on = state.status[action.key];
      const other = action.key === 'open' ? 'closed' : 'open';
      if (on && !state.status[other]) return state;
      return { ...state, status: { ...state.status, [action.key]: !on } };
    }
    case 'toggleCause': {
      const on = state.cause[action.key];
      if (on && Object.values(state.cause).filter(Boolean).length <= 1) return state;
      return { ...state, cause: { ...state.cause, [action.key]: !on } };
    }
    case 'selectArtifact':
      return { ...state, selectedArtifactId: action.id, sel: null, importOpen: false, drawMode: false, editShapeId: null };
    case 'selectRegion':
      return { ...state, sel: action.id, editShapeId: null };
    case 'setError':
      return { ...state, error: action.error };
    default:
      return state;
  }
}
