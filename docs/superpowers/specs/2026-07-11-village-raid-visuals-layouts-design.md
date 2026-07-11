# Village Raid HDV 3 Visuals and Reference Layouts Design

## Goal

Improve Village Raid HDV 3 readability with original textured Canvas buildings,
distinct troop silhouettes, and a troop legend. Replace the three generic test
layouts with faithful structured reconstructions of the three user-provided HDV
3 references:

- Farming base #111
- War base #26
- Defense base #104

The reference screenshots determine building counts, types, and placement. The
existing roster is not authoritative when it conflicts with the screenshots.

## Reference Sources

- `https://clashofclans-layouts.com/fr/plans/th_3/farm_111.html`
- `https://clashofclans-layouts.com/fr/plans/th_3/war_26.html`
- `https://clashofclans-layouts.com/fr/plans/th_3/defence_104.html`

The screenshots and linked images are reconstruction references only. The app
will not ship copied screenshots, official textures, logos, watermarks, or other
third-party visual assets.

## Layout Data

Replace the generic `open`, `compartment`, and `central` layouts with:

- `farm-111`
- `war-26`
- `defence-104`

All three screenshots show the same 22-building HDV 3 inventory. The current
25-building roster differs because it contains five Builder Huts; the references
show two. The new shared inventory is:

| Building type | Count |
| --- | ---: |
| Town Hall | 1 |
| Clan Castle | 1 |
| Army Camp | 2 |
| Barracks | 1 |
| Laboratory | 1 |
| Gold Mine | 3 |
| Elixir Collector | 3 |
| Gold Storage | 2 |
| Elixir Storage | 2 |
| Builder Hut | 2 |
| Cannon | 2 |
| Archer Tower | 1 |
| Mortar | 1 |
| **Total** | **22** |

Building combat metadata remains centralized by building type. Each layout owns
only its identity, structured entity inventory, and geometry. Positions will be
manually reconstructed from the screenshots on the existing logical grid. Walls
and the two bombs will follow visible reference geometry. When a trap or wall
cell is genuinely obscured, the implementation may use the nearest consistent
approximation, but it must not invent an additional building.

Layout validation must support a per-layout building inventory while still
checking unique IDs, expected metadata, bounds, wall and trap metadata, and
complete-footprint overlaps.

## Simulation and Fitness

The three bases remain a fixed sequential evaluation set. A specimen composes
one army, then attacks `farm-111`, `war-26`, and `defence-104` in a documented
fixed order with the same composition reset for each base.

Destruction is computed from the base's captured initial building count rather
than the historical constant of 25. Destroying every building always yields
100 percent. Filtering or mutating the live entity array during an attack must
not change the denominator.

Fitness remains the strict arithmetic mean of the three final destruction
percentages. There are no bonuses for time, stars, surviving troops, or unused
inventory.

## Building Rendering

Use the selected hybrid arcade direction: deterministic Canvas geometry with
simple procedural textures, strong outlines, and recognizable type-specific
details. Do not add runtime image loading or external dependencies.

The outer silhouette always preserves the entity's complete collision footprint.
Texture details are drawn inside that footprint. In particular, the Cannon keeps
a square 3x3 base even though its barrel and rotating assembly use round details.
The Town Hall remains 4x4, 3x3 buildings remain square, Builder Huts remain 2x2,
and Army Camps remain 5x5.

Each building type receives an original visual identity, such as an orange roof
for the Town Hall, a metal barrel for the Cannon, a wooden Archer Tower, and
distinct gold and elixir storage treatments. Existing health bars remain visible
above the new rendering. Destroyed buildings remain excluded from rendering.

## Troop Rendering and Legend

Troops use both color and silhouette, so color is not the sole identifier:

- Barbarian: yellow, sturdy body, sword cue
- Archer: pink, narrow body, bow cue
- Giant: brown, substantially larger body
- Goblin: green, pointed and compact silhouette
- Wall Breaker: white and gray, visible bomb cue

The selected hybrid legend has two layers:

1. A compact in-canvas color and icon reminder that does not obscure the main
   village geometry.
2. A detailed legend in the existing Village Raid side panel with icon, French
   name, level, target priority, and current available quantity.

The detailed legend is visible only when Village Raid is active. Its inventory
values update with the current raid world.

## Testing

Data tests must prove:

- the three exact layout IDs exist;
- every layout has exactly 22 buildings;
- all three layouts match the documented per-type inventory;
- only two Builder Huts are present per layout;
- entity IDs are unique and all footprints remain in bounds;
- invalid overlaps, metadata, roster changes, and counts are rejected.

Simulation tests must prove:

- destruction uses the world's captured initial count;
- one destroyed building in a 22-building base scores `100 / 22` percent;
- destroying all buildings scores 100 percent;
- filtering the live entity array does not alter the denominator;
- three-base fitness remains the strict arithmetic mean.

App tests must prove:

- the five-entry troop legend exists;
- it is visible only for Village Raid;
- inventory quantities update from the active raid world;
- the new layout IDs and variable-denominator rendering paths are wired into the
  main app.

Canvas visual details remain deterministic and dependency-free. Tests should
assert the rendering and legend contracts without relying on fragile pixel
snapshots.

## Out of Scope

- Copying or bundling official Clash of Clans artwork
- Using reference screenshots as game backgrounds
- Changing troop or building combat balance
- Changing the neural-network shape or observation vector
- Adding human play to Village Raid
- Changing the three-base fitness formula
