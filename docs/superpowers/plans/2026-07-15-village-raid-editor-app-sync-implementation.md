# Village Raid Editor App Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expose the Village Raid editor from the game panel and persist validated editor layouts for the next main-app load.

**Architecture:** A shared override module owns one versioned local-storage payload, rebuilds candidates from canonical roster metadata, validates them, and returns a derived layout array. The editor writes it after validation; the main app reads it once at startup.

**Tech Stack:** Static ES modules, localStorage, Node `node:test`.

## Global Constraints

- The bottom of `#explanationRaid` links to `./tools/village-raid-layout-editor.html` with `target="_blank"` and `rel="noopener"`.
- Persist only valid `village-raid-layout-editor-v2` data for `farm-111`, `war-26`, and `defence-104`.
- Never store images, drafts, champions, game state, or training results in the applied-layout payload.
- Invalid, malformed, unknown-base, or roster-incompatible storage silently falls back to canonical layouts.
- Applying one base keeps other saved overrides. Restore removes only the applied-layout key after confirmation.
- No cross-tab synchronization, dependency, build step, network call, or mutation of imported canonical layouts.
- Use ASCII source, run `npm run check` before commits, and do not stage `.playwright-cli/`.

---

### Task 1: Create validated applied-layout persistence

**Files:**

- Create: `src/village-raid-layout-overrides.js`
- Create: `test/village-raid-layout-overrides.test.mjs`

**Interfaces:**

- Consumes: `LAYOUTS`, `LAYOUT_EDITOR_SCHEMA`, `createEmptyLayoutEditorState`, and `validateLayoutEditorState`.
- Produces: `RAID_LAYOUT_OVERRIDE_STORAGE_KEY`, `readRaidLayoutOverrides(storage, layouts)`, `saveRaidLayoutOverride(storage, state, layouts)`, `clearRaidLayoutOverrides(storage)`, `resolveRaidLayouts(storage, layouts)`.
- Reads return `Map<baseId, { baseId, buildings, walls, traps }>` containing only valid canonical-roster data. Resolve returns a derived array, overriding only matching valid bases.

- [ ] **Step 1: Write failing persistence tests**

Create `test/village-raid-layout-overrides.test.mjs`:

```js
import assert from "node:assert/strict";
import { test } from "node:test";
import { LAYOUTS } from "../src/village-raid-data.js";
import {
  applyLayoutEditorWallStroke,
  createEmptyLayoutEditorState,
  placeLayoutEditorEntity,
} from "../src/village-raid-layout-editor.js";
import {
  RAID_LAYOUT_OVERRIDE_STORAGE_KEY,
  clearRaidLayoutOverrides,
  resolveRaidLayouts,
  saveRaidLayoutOverride,
} from "../src/village-raid-layout-overrides.js";

function storageStub() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
}

function completedState(layout) {
  let state = createEmptyLayoutEditorState(layout);
  for (const building of layout.buildings) {
    state = placeLayoutEditorEntity(state, { kind: "building", id: building.id }, building).state;
  }
  for (const trap of layout.traps) {
    state = placeLayoutEditorEntity(state, { kind: "trap", id: trap.id }, trap).state;
  }
  return applyLayoutEditorWallStroke(state, "paint", layout.walls).state;
}

test("saving a valid base changes only that derived raid layout", () => {
  const storage = storageStub();
  const farm = LAYOUTS.find(({ id }) => id === "farm-111");
  assert.deepEqual(saveRaidLayoutOverride(storage, completedState(farm), LAYOUTS), { ok: true, error: null });
  const resolved = resolveRaidLayouts(storage, LAYOUTS);
  assert.notEqual(resolved[0], farm);
  assert.deepEqual(resolved[0].walls, farm.walls);
  assert.equal(resolved[1], LAYOUTS[1]);
  assert.ok(storage.getItem(RAID_LAYOUT_OVERRIDE_STORAGE_KEY));
});

test("malformed storage falls back and restore clears only applied layouts", () => {
  const storage = storageStub();
  storage.setItem(RAID_LAYOUT_OVERRIDE_STORAGE_KEY, "not-json");
  assert.deepEqual(resolveRaidLayouts(storage, LAYOUTS), LAYOUTS);
  assert.deepEqual(clearRaidLayoutOverrides(storage), { ok: true, error: null });
  assert.equal(storage.getItem(RAID_LAYOUT_OVERRIDE_STORAGE_KEY), null);
});
```

- [ ] **Step 2: Run the test and verify RED**

```bash
node --test test/village-raid-layout-overrides.test.mjs
```

Expected: `ERR_MODULE_NOT_FOUND` for `src/village-raid-layout-overrides.js`.

- [ ] **Step 3: Implement the storage module**

Create `src/village-raid-layout-overrides.js` with this public behavior:

```js
import {
  LAYOUT_EDITOR_SCHEMA,
  createEmptyLayoutEditorState,
  validateLayoutEditorState,
} from "./village-raid-layout-editor.js";

export const RAID_LAYOUT_OVERRIDE_STORAGE_KEY = "neuro-evolution-arcade.village-raid-layout-overrides.v1";
const STORAGE_SCHEMA = "village-raid-layout-overrides-v1";

export function saveRaidLayoutOverride(storage, state, layouts) {
  const validation = validateLayoutEditorState(state);
  if (!validation.valid || !layouts.some(({ id }) => id === state.baseId)) {
    return { ok: false, error: "Village invalide - impossible de l'appliquer." };
  }
  const overrides = readRaidLayoutOverrides(storage, layouts);
  overrides.set(state.baseId, exportLayout(state));
  try {
    storage.setItem(RAID_LAYOUT_OVERRIDE_STORAGE_KEY, JSON.stringify({
      schema: STORAGE_SCHEMA,
      overrides: [...overrides.values()],
    }));
    return { ok: true, error: null };
  } catch {
    return { ok: false, error: "Le village ne peut pas etre enregistre localement." };
  }
}

export function resolveRaidLayouts(storage, layouts) {
  const overrides = readRaidLayoutOverrides(storage, layouts);
  return layouts.map((layout) => {
    const override = overrides.get(layout.id);
    return override ? { ...layout, ...override } : layout;
  });
}

export function clearRaidLayoutOverrides(storage) {
  try {
    storage.removeItem(RAID_LAYOUT_OVERRIDE_STORAGE_KEY);
    return { ok: true, error: null };
  } catch {
    return { ok: false, error: "Les villages appliques ne peuvent pas etre effaces." };
  }
}
```

`readRaidLayoutOverrides` parses only `{ schema: STORAGE_SCHEMA, overrides: Array }`, finds each matching canonical base, rebuilds entities from `createEmptyLayoutEditorState(canonical)`, and retains each candidate only if it has `LAYOUT_EDITOR_SCHEMA` and `validateLayoutEditorState(candidate).valid`. `exportLayout` emits only schema, baseId, and sorted buildings/walls/traps.

- [ ] **Step 4: Run focused tests and verify GREEN**

```bash
node --test test/village-raid-layout-overrides.test.mjs
```

Expected: PASS with both persistence tests.

- [ ] **Step 5: Commit**

```bash
git add src/village-raid-layout-overrides.js test/village-raid-layout-overrides.test.mjs
git commit -m "feat: persist validated Village Raid layouts"
```

---

### Task 2: Add the editor entry point and apply/restore controls

**Files:**

- Modify: `index.html`, `src/main.js`, `README.md`
- Modify: `tools/village-raid-layout-editor.html`, `tools/village-raid-layout-editor.js`, `tools/village-raid-layout-editor.css`
- Modify: `test/app.test.mjs`, `test/village-raid-layout-editor-ui.test.mjs`

**Interfaces:**

- Consumes: Task 1 `resolveRaidLayouts(localStorage, RAID_LAYOUTS)`, `saveRaidLayoutOverride(localStorage, state, LAYOUTS)`, `clearRaidLayoutOverrides(localStorage)`.
- Produces: `raidLayouts` used for every Village Raid base count/layout selection, `applyEditor`/`restoreAppliedLayouts`, and a safe Raid-panel link.

- [ ] **Step 1: Write failing UI and startup tests**

Add to `test/app.test.mjs`:

```js
assert.match(
  html,
  /<section id="explanationRaid"[\s\S]*?<a[^>]+href="\.\/tools\/village-raid-layout-editor\.html"[^>]+target="_blank"[^>]+rel="noopener"[^>]*>[^<]*Ouvrir l'editeur de villages/i,
);
assert.match(script, /const raidLayouts = resolveRaidLayouts\(localStorage, RAID_LAYOUTS\);/);
```

Add to `test/village-raid-layout-editor-ui.test.mjs`:

```js
for (const id of ["applyEditor", "restoreAppliedLayouts"]) {
  assert.match(html, new RegExp(`id=["']${id}["']`), id);
}
assert.match(html, /Appliquer ce village au jeu/);
assert.match(html, /Restaurer les villages d'origine/);
assert.match(script, /saveRaidLayoutOverride\(localStorage, state, LAYOUTS\)/);
assert.match(script, /clearRaidLayoutOverrides\(localStorage\)/);
```

- [ ] **Step 2: Run focused tests and verify RED**

```bash
node --test test/app.test.mjs test/village-raid-layout-editor-ui.test.mjs
```

Expected: FAIL because the anchor, controls, and startup resolution do not exist.

- [ ] **Step 3: Wire the main app and bottom Raid link**

Append this as the final child of `#explanationRaid` in `index.html`:

```html
<a class="button-secondary raid-editor-link" href="./tools/village-raid-layout-editor.html" target="_blank" rel="noopener">
  Ouvrir l'editeur de villages
</a>
```

In `src/main.js`, import `resolveRaidLayouts`, then declare after imports:

```js
const raidLayouts = resolveRaidLayouts(localStorage, RAID_LAYOUTS);
```

Replace runtime `RAID_LAYOUTS` base-count and selected-layout uses with `raidLayouts`; do not change canonical imports, profile versioning, army behavior, or data fallback.

- [ ] **Step 4: Wire editor apply and restore**

Add to `tools/village-raid-layout-editor.html` beside `#validateEditor`:

```html
<button id="applyEditor" class="primary-button" type="button" disabled>Appliquer ce village au jeu</button>
<button id="restoreAppliedLayouts" class="button-secondary" type="button">Restaurer les villages d'origine</button>
```

In `tools/village-raid-layout-editor.js`, import Task 1 write helpers; add both nodes to `elements`; and in `render` set `applyEditor.disabled` from `validateLayoutEditorState(currentHistory().present).valid`. Add:

```js
elements.applyEditor.addEventListener("click", () => {
  const state = currentHistory().present;
  const result = saveRaidLayoutOverride(localStorage, state, LAYOUTS);
  setInteractionMessage(
    result.ok ? "Village applique. Rechargez l'application principale pour l'utiliser." : result.error,
    result.ok ? "success" : "error",
  );
  render();
});

elements.restoreAppliedLayouts.addEventListener("click", () => {
  if (!window.confirm("Restaurer les trois villages d'origine pour le jeu ? Les brouillons et champions sont conserves.")) return;
  const result = clearRaidLayoutOverrides(localStorage);
  setInteractionMessage(
    result.ok ? "Les villages appliques ont ete restaures." : result.error,
    result.ok ? "success" : "error",
  );
  render();
});
```

Add only compact wrap/layout CSS for these controls and the Raid link, preserving existing disabled, focus-visible, and responsive behavior.

- [ ] **Step 5: Update README workflow**

State that the editor opens from the Village Raid explanation panel; applying is available only after validation, browser-local, active after main-app reload, and restore removes only applied layouts.

- [ ] **Step 6: Run focused checks and verify GREEN**

```bash
node --test test/village-raid-layout-overrides.test.mjs test/app.test.mjs test/village-raid-layout-editor-ui.test.mjs
node --check src/main.js
node --check tools/village-raid-layout-editor.js
```

Expected: PASS; contracts prove validated editor data reaches next app startup.

- [ ] **Step 7: Full verification and commit**

```bash
npm run check
git diff --check
git status --short
git add index.html src/main.js src/village-raid-layout-overrides.js tools/village-raid-layout-editor.html tools/village-raid-layout-editor.js tools/village-raid-layout-editor.css README.md test/app.test.mjs test/village-raid-layout-editor-ui.test.mjs test/village-raid-layout-overrides.test.mjs
git commit -m "feat: apply Village Raid editor layouts"
```

Expected: the full suite passes and `.playwright-cli/` remains unstaged.

---

## Completion Boundary

The Raid panel opens the editor safely in a new tab. A complete village can be applied locally and replaces only its matching training layout after reload; malformed data is ignored, and restore returns to canonical layouts without touching drafts or champions.
