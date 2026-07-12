# Village Raid Fidelity, Timer, and Building Clarity Design

## Goal

Correct three shortcomings in Village Raid HDV 3:

1. Display the existing 180-second attack duration as a visible countdown.
2. Replace the loosely inspired layouts with calibrated gameplay reconstructions
   of the user-provided #111, #26, and #104 references.
3. Make every building type recognizable at gameplay scale while keeping the
   selected minimalist, label-free canvas style.

The neural-network shape, combat balance, three-base evaluation order, and
strict mean-destruction fitness remain unchanged.

## Root Cause

The simulation already limits each attack to `180 * 20` ticks, but no remaining
seconds value is exposed to either the Canvas HUD or the Village Raid side panel.

The current layouts validate entity counts, bounds, overlaps, and a few coarse
anchors. Their coordinates were not calibrated against the reference images and
their tests do not constrain wall topology or most relative building positions.
Consequently, a layout can pass every test while no longer resembling its source.

The current procedural renderer uses correct footprints and different colors,
but many identifying details occupy too little of a building at the game's tile
size. The Cannon, Mortar, mines, collectors, and storages therefore read as
similar colored squares during a busy attack.

## Scope

In scope:

- Buildings, walls, and traps visible in references #111, #26, and #104
- A `180 s` to `0 s` simulation countdown
- More recognizable procedural building miniatures
- Hover and click/touch building inspection
- Automated geometry, timer, rendering, interaction, and regression tests

Out of scope:

- Decorative trees, bushes, stones, particles, or seasonal scenery
- Bundling reference screenshots or official Clash of Clans assets
- Pixel-identical isometric rendering
- Combat-stat, troop, fitness, or neural-network changes
- New runtime dependencies or a build step

## Layout Reconstruction

The screenshots are authoritative for gameplay topology. The existing
`farm-111`, `war-26`, and `defence-104` IDs and evaluation order remain, but all
three coordinate maps will be recalibrated from the references.

### Calibration method

For each reference:

1. Crop mentally to the active village field and identify the Town Hall center
   as the primary anchor.
2. Record every building center relative to the Town Hall, preserving cardinal
   ordering, spacing, and whether it is inside or outside a wall compartment.
3. Trace every visible wall run in order. Convert the isometric diamond into the
   equivalent orthogonal topology without changing connections, gaps, or
   compartment membership.
4. Place each bomb in the corresponding visible compartment and nearest valid
   unoccupied grid cell when its exact center is partially obscured.
5. Scale and translate the complete layout as one unit onto the existing 48x32
   simulation grid. Do not independently spread buildings to fill empty space.

The result is an orthogonal arcade reconstruction, not a pixel-identical image,
but a player comparing it with the screenshot must recognize the same walls,
compartments, and relative building placements.

### Reference-specific invariants

`farm-111` must preserve the irregular cluster of small wall compartments around
the Town Hall rather than a single rectangular enclosure. Its resource and army
buildings retain their visible asymmetric distribution around the core.

`war-26` must preserve the central diamond enclosure, the two Builder Huts north
of it, the Archer Tower on the north axis, Elixir Storages in the upper core,
Gold Storages south of the core, Elixir Collectors to the west, Gold Mines to the
east, and the Barracks south of the enclosure.

`defence-104` must preserve the large central diamond, three Elixir Collectors
north of the enclosure, three Gold Mines south of it, opposite exterior Builder
Huts, exterior Army Camps on the west and east, and the defensive/core building
relationships visible inside the walls.

Only gameplay entities are reconstructed. Decorative obstacles remain generic
and non-colliding.

## Countdown

The simulation remains authoritative. Remaining time is derived from existing
ticks rather than a wall-clock timer:

```text
remainingSeconds = ceil(max(0, maxTicks - tick) / RAID_TICKS_PER_SECOND)
```

This produces:

- `180 s` at tick 0
- `179 s` after 20 ticks
- `0 s` at the existing timeout

The countdown resets to `180 s` when a specimen starts each of the three bases.
Simulation speed accelerates the visible countdown because it advances more
simulation ticks per animation frame; one displayed second always equals exactly
20 simulation ticks.

Display the same value in two places:

- Canvas HUD below the active base line
- Village Raid side panel next to the active base information

The Canvas HUD height grows to accommodate the extra line without overlapping
destruction or provisional-average telemetry.

## Minimalist Building Renderer

No permanent building labels are drawn on the Canvas. Recognition comes from
large, type-specific silhouettes that use most of the entity footprint:

- Town Hall: orange layered roof and central gold crest
- Clan Castle: stone towers and central keep
- Army Camp: open campfire/tent composition
- Barracks: red roof and crossed weapon cue
- Laboratory: large blue glass dome and metal base
- Gold Mine: dark mine entrance, rails, and a small gold cart
- Elixir Collector: pump, pipes, and small pink vat
- Gold Storage: reinforced open bin visibly filled with yellow coins
- Elixir Storage: large spherical pink tank with highlight and stopper
- Builder Hut: compact timber hut and tool cue
- Cannon: square masonry base, visible wheels, and long horizontal barrel
- Archer Tower: four wooden supports, raised platform, and bow cue
- Mortar: round turntable and thick, open, diagonally elevated tube

Footprint outlines remain exact. The Cannon remains a square 3x3 building even
though its firing assembly contains circles. Health bars move above the building
footprint so they do not obscure identifying details.

The rendering stays deterministic, dependency-free, and composed only of Canvas
2D primitives. It does not load image assets at runtime.

## Building Inspection

Minimalism is preserved by showing building text only on demand.

Pointer coordinates on the Canvas are converted into simulation grid coordinates
using the same tile size and horizontal offset as the renderer. The active living
building whose complete footprint contains the pointer becomes the inspected
building.

Desktop behavior:

- Pointer movement over a living building shows an inspection tooltip.
- Pointer leave clears it.

Touch/click behavior:

- Clicking or tapping a living building selects it and shows the same tooltip.
- Clicking empty ground clears the selection.
- Destroyed buildings cannot be inspected.

The tooltip contains the French building name, level, and current/max HP. It is
drawn inside the Canvas near the building, clamped to Canvas bounds, and uses a
solid high-contrast background.

## Architecture

`src/village-raid-data.js` remains authoritative for layout entity data and
reference invariants.

`src/village-raid-simulation.js` exports a pure remaining-seconds helper based on
the world's tick fields. Timeout behavior itself remains unchanged.

`src/village-raid-rendering.js` owns building names, type-specific miniatures,
health-bar placement, hit testing, and inspection-tooltip rendering. Rendering
helpers receive the existing grid transform values; they do not depend on DOM
state.

`src/main.js` keeps orchestration state for the currently hovered/selected raid
building, delegates hit testing and tooltip drawing, and synchronizes the side
panel countdown.

`index.html` adds one countdown output to the existing Village Raid panel.
`src/styles.css` styles that output using existing stat-line patterns.

## Testing

### Layout tests

- Exact building coordinate fixtures for all three layouts
- Ordered wall paths or exact normalized wall-point sets
- Trap positions
- Reference-specific inside/outside and directional relationships
- Exact 22-building roster, 50 walls, and 2 bombs retained
- Bounds and complete-footprint overlap validation retained

Tests must fail when a key building is moved, a wall gap is closed or opened, a
compartment changes topology, or east/west and north/south groups are swapped.

### Timer tests

- `180` at tick 0
- `179` at tick 20
- correct ceiling behavior between whole seconds
- `0` at and after timeout
- reset to `180` on bases 2 and 3
- Canvas and side-panel output stay synchronized

### Rendering tests

- Cannon has a square outer footprint, separate wheel cues, and a long barrel
- Mortar has a round base plus an elevated open tube
- Gold Mine and Gold Storage use different primitive signatures
- Elixir Collector and Elixir Storage use different primitive signatures
- Health bars are above, not inside, the building footprint
- All primitives remain within safe visual bounds except the intentionally
  external health bar

### Inspection tests

- Coordinate conversion finds each footprint edge correctly
- Empty ground and destroyed buildings return no inspection target
- Pointer leave and empty click clear inspection
- Tooltip includes French name, level, and HP
- Tooltip is clamped to all Canvas edges

### Regression verification

- Network shape remains 37 -> 18 -> 7
- Combat values and target priorities remain unchanged
- Fitness remains the strict mean of three destruction percentages
- Human mode remains disabled for Village Raid
- `npm run check` passes
- Browser smoke test compares all three rendered layouts with their references,
  verifies the countdown, and confirms building inspection at normal scale
