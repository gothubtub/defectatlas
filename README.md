# Defect Atlas — Jira Forge app

A visual defect map over uploaded artifact snapshots. Users draw named
regions — **Component-Aspects** — on an uploaded snapshot (a UI screen, a
process diagram, an architecture diagram), and Jira bug issues are
associated to those regions by matching the issue's `Component-Aspect`
field, so defect density can be read against the artifact itself instead
of a flat issue list.

This is an implementation of the `Defect Atlas` design handed off from
Claude Design (see `../README.md`, `../chats/`, and
`../project/Defect Atlas BRD.dc.html` for the full design history and
requirements this app was built from).

## What this is, precisely

Built to the scope agreed before implementation started:

- **Full app, mocked Jira.** Every screen and interaction — drawing
  regions, filtering, timeline replay, Space sync, conflict resolution,
  roles — works end to end without a live Jira site. Issue data comes
  from a deterministic generator (`src/resolvers/domain/sampleData.js`)
  instead of real `requestJira` calls.
- **Storage: Jira entities, not Forge Storage** — with two narrow,
  explicit exceptions (workspace membership and the current Space/Fix
  Version selection), which have no natural home in a Jira entity and are
  kept in `@forge/storage` instead. See "Storage architecture" below.
- **The app provisions the `Component-Aspect` custom field type** (via
  the `jiraCustomFieldType` module) **and manages Editor/Viewer roles**
  itself, rather than assuming a pre-existing field or deriving roles
  from Jira's own permission schemes.
- **Global page**, not scoped to a single project.

## Directory structure

```
forge-app/
  manifest.yml                   Forge module/permission declarations
  package.json                   resolver-side dependencies
  src/resolvers/
    index.js                     all invoke()-able resolver functions
    domain/
      rng.js                     seeded PRNG (mulberry32)
      sampleData.js               mock issue/region seed data + JQL builder
    jira/
      index.js                   mock/real switch (DEFECT_ATLAS_MOCK env var)
      mockClient.js               deterministic mock Jira responses
      realClient.js                real requestJira() calls — unexercised in
                                   this pass, written to the same interface
    store/
      index.js                   mock/real switch for workspace storage
      mockStore.js                in-memory workspace doc (mock build)
      realStore.js                Jira project entity properties + issue
                                   attachments (real build)
      roles.js                    Editor/Viewer membership — @forge/storage
      scope.js                    current Space/Fix Version pointer — @forge/storage
  static/app/                    Custom UI frontend (Vite + React)
    src/
      main.jsx, App.jsx
      state/                     AtlasContext (server state + local UI state)
      components/                Header, FilterBar, Canvas, DetailPanel,
                                  Timeline, ArtifactLibrary, modals/
      lib/
        api.js                   invoke() wrapper — routes to @forge/bridge
                                  in production, devBackend.js in `vite dev`
        devBackend.js             dev-only in-browser stand-in (see below)
        compute.js                the view-derivation math (heat, filters,
                                  ranked list, timeline path) — the frontend
                                  counterpart to the prototype's renderVals()
    public/demo/                 the four seed artifact images
```

## Why Custom UI, not UI Kit

The canvas needs free-form pointer-driven rectangle drawing, vertex
dragging and pixel-exact region placement over an arbitrary uploaded
image. That's a plain-DOM/SVG problem, not something UI Kit's managed
component set is meant for, so the frontend is a normal React app served
as a Custom UI resource and talks to the backend exclusively through
`@forge/bridge`'s `invoke()`.

## Storage architecture

The build-scope decision was **Jira entities, not Forge's own Storage
API**, for the domain data the BRD's data model describes (Workspace,
Artifact, ComponentAspect, JiraConnection). Concretely:

- **Space ⇒ Jira project.** The UI shows spaces as `"KEY — Name"`
  (`RB — Retail Banking`, `PP — Payments Platform`, ...) — the same way
  Jira's own project picker renders a project — so a space *is* a Jira
  project, and Fix Version is that project's real version list
  (`realClient.listFixVersions`).
- **Workspace metadata** (artifact list, region rectangles, component
  vocabulary, connection/JQL/sync state) is one JSON document per space,
  stored as a **Jira project entity property**
  (`realStore.js`, `PROPERTY_KEY = 'defect-atlas.workspace'`), which is a
  real Jira API, not an app-side database.
- **Artifact images** have no natural Jira home (Jira attachments only
  exist on issues), so each artifact gets a small carrier issue created
  purely to hold its snapshot as an attachment
  (`realStore.uploadArtifactImage`).
- **Two exceptions, both tiny and explicitly authorized during scoping:**
  workspace membership (`store/roles.js`) and the currently-selected
  Space/Fix Version (`store/scope.js`) live in `@forge/storage`, because
  neither has a Jira entity to attach to and both need to be shared
  across the team rather than per-browser.

`mockStore.js` implements the identical interface in memory so the app
is fully interactive without deploying to a real site; `realStore.js` is
real, unexercised code, written so flipping `DEFECT_ATLAS_MOCK=false`
in the Forge environment is a real path forward, not a stub.

## Where the prototype's model was corrected against the BRD

The interactive prototype (`../project/Defect Atlas.dc.html`) matched a
ticket to a region by testing whether a fabricated `(x, y)` point fell
inside the region's rectangle — a demo-only device, since the prototype
had no real Jira field to key off and needed *something* to visually
distribute tickets across a static mockup.

The BRD (§6, "Association") specifies the real mechanism instead: an
issue binds to a Component-Aspect by matching its Jira `Component-Aspect`
field value against the region's *name*. This app implements the BRD's
version — `sampleData.js`'s generated issues carry a `componentAspect`
string, matched by name in `compute.js`, with a deliberate ~8% left
unmatched so the "unmapped, counted at component level" behavior (BRD
UC-02) has something to show. Everything else — the rectangle-only
region drawing, the dotted cause-colored outlines, the timeline replay,
the filter combination rules — is a direct, pixel-matched port of the
prototype's final state after all the design chats.

## Roles

The BRD defines Editor and Viewer (with Editor explicitly barred from
managing membership) but doesn't say who *grants* those roles. This
implementation makes an interpretive call, documented inline in
`store/roles.js`: Jira **site administrators** (global `ADMINISTER`
permission) manage membership through a "Members" panel in the header.
The first person to ever open the app bootstraps as Editor; everyone
after defaults to Viewer until promoted.

## Running it locally

```
cd static/app
npm install
npm run dev
```

Opens on `http://localhost:5173`. Outside Jira's iframe, `@forge/bridge`
can't reach a host and throws immediately on import — `src/lib/api.js`
detects that (`window.self === window.top`, dev build only) and routes
every `invoke()` call to `src/lib/devBackend.js`, a small in-browser
stand-in with its own compact seed dataset. This is how the app was
visually verified for this pass (draw/edit/delete regions, filter
combinations, timeline scrub and play, Space sync, a manufactured
conflict, role gating) — screenshots were taken via a scripted Chromium
session driving the dev server. `devBackend.js` is dead-code-eliminated
out of the production build (`import.meta.env.DEV` is statically false),
confirmed by grepping the built bundle.

`npm run build` (from either `static/app/` or the repo root's
`package.json`) produces `static/app/dist`, which `manifest.yml` points
at as the `main` resource.

## Deploying for real

This pass did not run `forge deploy`/`forge install` — no Atlassian
developer credentials were available in this environment. To take it
live:

1. `npm install -g @forge/cli`, `forge login`.
2. `forge lint` first — `manifest.yml` was hand-written against the
   documented module/permission schema without access to `forge lint` or
   `forge deploy` in this environment (no Atlassian dev credentials were
   available), so this is the first real validation it'll get.
3. From `forge-app/`: `forge deploy`, then `forge install` on a target
   site.
4. In Jira admin ▸ Issue fields, create a field of the **Component-Aspect**
   type this app registers, then add it to the Bug issue screen — Forge
   can offer a field *type* but can't silently attach a field to existing
   screens.
5. Set the `DEFECT_ATLAS_MOCK` environment variable to `false`
   (`forge variables set DEFECT_ATLAS_MOCK false`) to switch both the
   Jira client and the workspace store onto `realClient.js`/`realStore.js`.
6. Confirm the target site's Bug issues carry the `Component-Aspect`
   field and, ideally, a `spaceJira` field matching the project key (see
   the JQL template in `sampleData.jqlFor`) — both are BRD §7 assumptions
   this app inherits, not something it can create on its own.

## Known gaps / carried-forward BRD open questions

The BRD (§7) lists six open questions the original design work couldn't
resolve; they're still open here, not silently decided:

- Whether regions carry over when a snapshot is replaced with a newer
  version of the same artifact.
- Who resolves a sync conflict — this build allows any Editor, matching
  the BRD's Editor capability list, but the BRD itself flags this as
  unresolved (any Editor vs. only the author of the conflicting change).
- Retention policy for artifacts/regions after a fix version ships.
- Severity source (priority vs. a custom severity field) — `realClient.js`
  reads Jira's `priority` field; flagged inline as an assumption.
- Whether history replay should reconstruct from Jira changelogs rather
  than atlas-side sync snapshots (this build uses sync-time snapshots
  only).
- Audit requirements on annotation create/edit/delete — not implemented
  beyond `createdBy`/`updatedAt` on each region.

Additionally, specific to this implementation:

- `realClient.uploadArtifactImage`'s carrier-issue creation assumes a
  `Task` issue type exists on the target project; production hardening
  should fall back to the project's first non-subtask type from
  `/issue/createmeta` instead of assuming the name.
- The membership UI (`MembersModal.jsx`) takes a raw Jira account ID
  rather than a proper user picker/typeahead — acceptable for this pass,
  worth wiring to Jira's user-search API before shipping.
