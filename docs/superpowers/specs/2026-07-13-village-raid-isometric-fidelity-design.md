# Village Raid Isometric Fidelity Design

## Goal

Replace Village Raid's orthogonal top-down presentation with a fixed 2:1
isometric projection so the three playable bases reproduce the supplied
Clash-style references much more faithfully.

The authoritative references remain:

- Farming base `#111`
- War base `#26`
- Defence base `#104`

The result must preserve the gameplay simulation while making a side-by-side
comparison immediately recognizable through the same relative building
positions, wall paths, openings, and compartments.

## Confirmed Decisions

Three implementation directions were considered:

1. Keep the orthogonal renderer and continue adjusting coordinates.
2. Keep the orthogonal simulation but project all gameplay rendering into a
   fixed isometric view.
3. Replace the simulation, collision system, and pathfinding with native
   isometric coordinates.

Direction 2 is selected. It provides the visual fidelity needed for the
references without risking the deterministic combat system. Direction 1 has
already proven too ambiguous when translating the screenshots. Direction 3
would change pathfinding and combat for no gameplay benefit.

## Scope

In scope:

- Fixed isometric ground and perimeter rendering
- Isometric buildings, walls, traps, troops, projectiles, and health bars
- A new transcription of all three reference layouts
- Isometric draw ordering and hit testing
- Existing countdown, troop legend, building inspection, and combat telemetry
- Automated projection, geometry, ordering, interaction, compatibility, and
  regression tests
- Browser comparison of every base against its supplied reference

Out of scope:

- Changing the 48x32 simulation grid
- Changing movement, pathfinding, collision, targeting, damage, fitness, army
  composition, or neural-network shape
- Decorative trees, bushes, stones, seasonal scenery, logos, or watermarks
- Official or extracted game sprites and textures
- Camera rotation, free zoom, panning, or a second perspective
- Pixel-identical reproduction of lighting, terrain, or copyrighted artwork

Only gameplay elements are reconstructed: buildings, walls, traps, troops, and
projectiles.

## Coordinate Model

Simulation coordinates remain unchanged. Each simulation point `(gridX,
gridY)` is converted to Canvas coordinates by a pure projection helper:

```text
screenX = originX + (gridX - gridY) * halfTileWidth
screenY = originY + (gridX + gridY) * halfTileHeight
```

The projection uses the conventional 2:1 ratio:

```text
halfTileWidth = 2 * halfTileHeight
```

The geometry helper calculates the largest tile that fits the complete 48x32
diamond inside the 960x560 Canvas while reserving space for the HUD. The entire
gameplay field remains visible and centered at every supported page width; CSS
continues scaling the Canvas responsively.

The helper returns one immutable geometry object containing:

- `halfTileWidth`
- `halfTileHeight`
- `originX`
- `originY`
- projected ground bounds

All raid rendering and inspection functions receive or derive this same
geometry. No subsystem may maintain a separate projection formula.

## Fixed Camera and Ground

The camera orientation matches the three references: the two grid axes descend
diagonally left and right from the far corner. The camera never rotates.

The rectangular graph-paper background is removed. The playable field becomes
a centered grass diamond with subtle isometric cell lines. The deployment
perimeter follows the four diamond edges. Empty space outside the diamond uses
the existing light background color.

The ground is original procedural Canvas artwork. The runtime does not request
images, fonts, or textures from an external host.

## Exact Reference Transcription

The existing v3 positions are not treated as authoritative. All three layouts
are transcribed again from the original 1000x462 reference images.

### Calibration method

For each image:

1. Record the pixel center of the Town Hall as the reference anchor.
2. Determine the two visible isometric grid basis directions from straight wall
   runs.
3. Record the pixel center of every building and visible bomb relative to the
   Town Hall.
4. Apply the inverse isometric basis to convert those pixel deltas into grid
   deltas.
5. Snap the complete layout as one unit to integer grid cells while preserving
   every building footprint and preventing overlap.
6. Trace walls cell by cell in image order. Wall openings and junctions are
   explicit points, never inferred from a generic rectangle or diamond.
7. Compare the projected production layout back against the source image and
   adjust only the shared calibration or the incorrectly transcribed entity.
   Buildings must not be spread independently to make the board look fuller.

The repository will store numeric calibration evidence and expected entity
coordinates, but it will not store the source screenshots.

### Required inventory

Each base must retain exactly:

- 22 buildings
- 50 wall cells
- 2 bombs

The screenshot count remains authoritative even if a contemporary game roster
would differ.

### Reference identity

`#111` must reproduce the asymmetric cluster of connected small compartments,
including the upper, left, central, and lower-right wall relationships visible
around the Town Hall.

`#26` must reproduce the open diamond enclosure, northern Builder Huts and
Archer Tower, western Elixir Collectors, eastern Gold Mines, central storages,
and southern Barracks grouping.

`#104` must reproduce its distinct larger diamond and divider, three northern
Elixir Collectors, three southern Gold Mines, opposite Builder Huts, exterior
Army Camps, and the same defensive relationships inside the core.

The new coordinate set increments `RAID_LAYOUT_VERSION` to
`th3-reference-layouts-v4`. The combat snapshot version remains unchanged.
Older v3 Village Raid champions are rejected as layout-incompatible, following
the existing strict champion policy.

## Isometric Render Queue

Walls, active traps, buildings, projectiles, and living troops are collected
into one render queue. Each entry exposes a ground-depth key based on the
furthest occupied footprint corner:

```text
depth = gridX + footprintWidth + gridY + footprintHeight
```

Entries are sorted from low depth to high depth. Stable tie-breakers use entity
kind, grid position, and stable ID. This produces deterministic back-to-front
occlusion and avoids array-order flicker.

Ground-only effects render before the queue. Tooltips, the troop key, and the
fixed HUD render after it.

Destroyed buildings and walls remain governed by the existing gameplay state.
The renderer does not create extra collision or combat entities.

## Isometric Building Miniatures

The existing 13 semantic building identities remain, but their top-down boxes
become small original isometric miniatures.

Every building starts with its projected world footprint. A square world
footprint therefore appears as a diamond in screen space. This is a perspective
effect, not a shape change.

The Cannon specifically retains a square 3x3 masonry footprint. Its square base
is extruded vertically, with two wheels and a long barrel above it. It must not
become a circular building even though the firing assembly contains circles.

Other silhouettes preserve their previously approved cues:

- Town Hall: layered orange roof and central crest
- Clan Castle: stone towers and keep
- Army Camp: tents and campfire
- Barracks: red roof and crossed weapon cue
- Laboratory: glass dome and metal base
- Gold Mine: entrance, rails, and cart
- Elixir Collector: pump, pipes, and small vat
- Gold Storage: reinforced bin and visible coins
- Elixir Storage: large spherical tank and stopper
- Builder Hut: timber roof and tool cue
- Archer Tower: four supports, platform, and bow
- Mortar: square world footprint, round turntable, and open elevated tube

Procedural light and dark faces make height readable, but no official textures
or extracted sprites are used. Building visual height may extend above its
ground footprint; its collision footprint remains unchanged.

Health bars stay screen-horizontal and render above the highest visual point of
the entity. Normal gameplay remains label-free.

## Walls, Traps, Troops, and Projectiles

Each wall cell is an extruded diamond block. Adjacent wall cells visually meet
without rectangular gaps. Wall HP bars remain compact and appear only where the
current renderer already exposes them.

Bombs use a small projected ground base and raised fuse. Their active/triggered
behavior remains unchanged.

Troop simulation positions are projected through the same geometry helper.
Their semantic colors and cues remain, but their bodies receive a small
vertical offset so they stand on the isometric ground instead of being centered
inside a tile. Troop health bars remain horizontal.

Projectile start, travel, and impact coordinates are projected only at draw
time. Projectile physics remains in simulation coordinates.

## Isometric Inspection

The old rectangular hit test is replaced by projected-footprint hit testing.

For every living building:

1. Project its four footprint corners into a screen-space diamond or
   parallelogram.
2. Test the pointer against that polygon.
3. Iterate candidates from front to back so an overlapping foreground building
   wins.

The hit target is the complete world footprint, not the visible roof alone.
This keeps selection stable while respecting isometric overlap.

The existing interaction contract remains:

- Hover shows a temporary tooltip.
- Pointer leave clears hover.
- Click or tap pins the building.
- Empty click clears selection.
- Destroyed buildings cannot be inspected.
- Base, specimen, reset, and game transitions clear selection.

The French tooltip continues showing name, level, and current/max HP. Its anchor
uses the projected visual bounds and its solid box remains clamped inside the
Canvas.

## Countdown and HUD

The verified 180-to-0 simulation countdown is unchanged. The Canvas HUD remains
screen-aligned in the upper-left corner rather than rotating with the ground.
It continues to render:

- Base index
- Remaining seconds
- Current destruction
- Provisional three-base average

The troop key remains screen-aligned in the upper-right corner. Isometric draw
ordering must never obscure either overlay.

## Architecture

`src/village-raid-data.js` remains authoritative for buildings, walls, traps,
footprints, combat metadata, layout identity, and compatibility version.

`src/village-raid-rendering.js` gains the pure projection, footprint polygon,
depth ordering, isometric primitive, and hit-test helpers. These helpers remain
DOM-independent and testable through the recording Canvas context.

`src/main.js` owns Canvas orchestration only: it creates one geometry object,
draws the ground, builds the render queue, delegates entity drawing, and draws
screen-aligned overlays. It does not duplicate projection math.

`src/village-raid-simulation.js` is not modified unless a test exposes an
existing projection-independent bug. Simulation coordinates and rules remain
orthogonal and deterministic.

The app remains a dependency-free static site with no build step.

## Testing Strategy

### Projection tests

- The four grid corners form the expected centered 2:1 diamond.
- Projection is deterministic and preserves both grid axes.
- Projected footprint corners match direct corner projection.
- Point-in-polygon includes interior and boundary points and excludes nearby
  empty ground.
- Responsive CSS scaling still converts client coordinates to logical Canvas
  coordinates before isometric hit testing.

### Layout tests

- Independent v4 fixtures contain exactly 66 building coordinates, 150 wall
  cells, and 6 traps in total.
- Production signatures exactly equal the fixtures.
- Wall connectivity, openings, junctions, and compartment membership are
  checked independently for all three references.
- Source-relative landmark relationships encode the Town Hall anchor and the
  two isometric basis directions.
- Complete footprints stay in bounds and never overlap.

### Render tests

- The ground uses a diamond perimeter rather than a rectangular grid.
- The render queue is stable and back-to-front for mixed entity types.
- Every building has a projected square world footprint and a distinct
  silhouette.
- Cannon and Mortar retain square world bases and remain visually distinct.
- Walls meet along projected grid edges.
- Health bars and HUD text remain screen-horizontal.
- All save/translate/rotate operations are balanced.

### Interaction tests

- Hover and click find the frontmost living building through its projected
  footprint.
- Overlapping roof pixels do not select a background entity incorrectly.
- Empty ground and destroyed buildings return no target.
- Tooltip contents and Canvas-edge clamping remain correct.
- Inspection resets on every existing lifecycle transition.

### Regression tests

- Network shape remains 37 -> 18 -> 7.
- Each attack still visibly renders 180 to 0, including all verified high-speed
  transition paths.
- Combat values, target priorities, pathfinding, army composition, and strict
  mean-destruction fitness remain unchanged.
- Each base still recreates a full independent army inventory.
- Human mode remains disabled for Village Raid.
- `npm run check` passes.

## Visual Acceptance

The in-app browser is used at the logical 960x560 Canvas size and at one narrow
responsive size.

For each base, acceptance requires:

1. Entire gameplay layout visible and centered.
2. Projected Town Hall and wall silhouette aligned with the corresponding
   reference.
3. Every building on the same side of the same wall opening or compartment as
   the reference.
4. No generic rectangle or diamond substituted for the actual wall trace.
5. Cannon, Mortar, Gold Mine, Gold Storage, Elixir Collector, and Elixir Storage
   distinguishable at normal scale.
6. Hover, pinned inspection, empty-click clearing, and tooltip clamping working.
7. Countdown and side panel synchronized.
8. No console error, warning, or external game-asset request.

The three comparisons are reviewed one base at a time in the order `#111`,
`#26`, `#104`. A base is not considered accepted merely because entity counts
or automated tests pass; its projected topology must visibly match the supplied
reference.
