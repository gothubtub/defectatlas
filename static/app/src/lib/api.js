// Thin wrapper around @forge/bridge's invoke(). In production (embedded
// in Jira's iframe) every call goes to the real resolver. When running
// under plain `vite dev`/`vite preview` outside that iframe — which is
// how this app is visually verified in this build pass, since there's no
// live Forge site to `forge tunnel` against — calls are routed to
// devBackend.js instead, a small in-browser stand-in that mirrors the
// resolver's mock-mode behavior closely enough to exercise every screen.
//
// Both `@forge/bridge` and devBackend.js are imported *dynamically*: the
// bridge throws at module-evaluation time (not just when called) if it
// can't reach a Forge host, so merely importing it statically would crash
// the app immediately outside an iframe. Dynamic import defers that
// evaluation until we've already decided which path to take.
// import.meta.env.DEV still keeps devBackend out of the production
// bundle, since that branch is unreachable when DEV is statically false.
const runningStandalone = typeof window !== 'undefined' && window.self === window.top;

let backendPromise = null;
function loadBackend() {
  if (!backendPromise) {
    backendPromise = import.meta.env.DEV && runningStandalone
      ? import('./devBackend.js')
      : import('@forge/bridge').then(m => ({ invoke: m.invoke }));
  }
  return backendPromise;
}

export async function invoke(name, payload) {
  const backend = await loadBackend();
  return backend.invoke(name, payload);
}
