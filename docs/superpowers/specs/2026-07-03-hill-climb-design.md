# Hill Climb Game Design

## Goal

Add a fourth game profile, `Hill Climb`, to Neuro Evolution Arcade. The game
should focus on a convincing hill-climb driving feel: a two-wheel vehicle,
suspension, traction, rotation control, collectible coins, fuel cans, flips, and
a fixed countryside-style level with increasing difficulty.

The implementation must stay original. It should not copy proprietary Hill
Climb Racing physics, assets, or the exact first level. The target is a familiar
arcade hill-climb feel using original code, shapes, terrain, and tuning.

## Scope

The first version includes:

- A new `Hill Climb` game tab.
- Sequential AI evaluation: one specimen drives a full run, then the next
  specimen starts.
- Human play mode.
- A fixed long countryside terrain with increasing difficulty.
- A custom vehicle physics model without a physics library at first.
- Fuel that decreases with time only.
- Fuel cans required to reach long distances.
- Coins as collectible bonus objectives.
- Flip detection and flip bonus.
- Hill Climb champion save, load, and clear support with a dedicated storage
  key.
- Tests proving the game boots, switches correctly, exposes its network shape,
  supports human controls, and saves compatible champions.

Out of scope for the first version:

- Upgrades, garages, multiple vehicles, or multiple maps.
- Exact reproduction of Hill Climb Racing level 1.
- Imported copyrighted art, audio, names, or terrain data.
- A third-party physics library unless the custom model proves too unstable in a
  later iteration.

## Architecture

Hill Climb should follow the existing game-profile pattern in `src/main.js`.
The profile will define its own:

- world state
- agent state
- physics step
- observation vector
- action mapping
- fitness function
- rendering
- human-control adapter
- champion storage key

The game should be sequential like Snake and Pong because a side-scrolling
camera and long terrain are easier to understand with one visible vehicle.

The new champion storage key should be:

```text
neuro-evolution-arcade.hill-climb.champion
```

## Vehicle Physics

The first implementation should use a custom 2D rigid-body approximation:

- Vehicle state: `x`, `y`, `vx`, `vy`, `angle`, and `angularVelocity`.
- Two wheel anchors are derived from the chassis position and angle.
- Each wheel samples the terrain height and slope below it.
- If a wheel penetrates the terrain, apply suspension force along the terrain
  normal plus damping.
- Gas applies traction along the terrain tangent when at least one wheel is in
  contact.
- Tilt left and tilt right apply torque, especially useful while airborne.
- Friction should reduce lateral sliding when wheels are grounded.
- Gravity and integration should use small fixed substeps for stability.
- Crash detection should trigger when the chassis roof or body hits terrain too
  hard, or the vehicle remains inverted for too long.
- Flip detection should accumulate rotation and award a flip when the vehicle
  completes a full rotation and survives the landing.

The goal is stable expressive arcade physics: acceleration, cabrage, suspension,
jumps, flips, and meaningful loss of control.

## Level And Collectibles

The first level should be a fixed long terrain built from authored points and
interpolated smoothly.

Difficulty progression:

1. Gentle start for learning acceleration and balance.
2. Longer hills that reward speed management.
3. Closer bumps and troughs that test suspension and stability.
4. Natural ramps that make flips possible.
5. A more aggressive late section with steep climbs, harder landings, and rarer
   fuel.

Coins should be placed near natural driving lines, with some riskier coins on
jump arcs or ramps. Fuel cans should be placed so long-distance progress depends
on reaching them. Fuel decreases with time only, not with gas usage. When fuel
reaches zero, the vehicle can keep coasting but cannot accelerate; the run ends
when it is stopped, too far behind progress, crashed, or otherwise unable to
continue.

## AI And Controls

The network should expose three independent output actions:

- `gas`
- `tilt left`
- `tilt right`

The agent may gas and tilt at the same time. If both tilt outputs are active,
the stronger one wins unless the difference is too small, in which case no tilt
is applied.

Recommended inputs:

- horizontal velocity
- vertical velocity
- chassis angle
- angular velocity
- fuel remaining
- front wheel contact
- rear wheel contact
- slope below or near the vehicle
- slope ahead
- terrain height delta ahead
- distance to next fuel can
- height delta to next fuel can
- distance to next useful coin
- height delta to next useful coin

Human controls:

- `ArrowUp` or `W`: gas
- `ArrowLeft` or `A`: tilt left
- `ArrowRight` or `D`: tilt right

No brake is required in the first version.

## Fitness

Fitness should be dominated by maximum distance reached.

Secondary rewards:

- Moderate bonus for collected coins.
- Meaningful bonus for completed flips.
- Small tie-breaker bonus for remaining fuel.

Penalties:

- Crash or inversion penalty, kept small enough that agents can still learn
  risky jumps.
- No heavy penalty for using gas, because fuel decreases only with time.

Distance must outweigh coins and flips. A specimen that travels much farther
should beat a shorter flashy run.

## UI And Rendering

The app should add a `Hill Climb` tab alongside Flappy Bird, Snake, and Pong.
The right-side controls can reuse the generic sequential labels:

- alive label: `Specimen`
- speed label: `Run speed`
- population label: `Specimens`
- leader fitness label: `Current specimen`
- distance label: `Distance`

The canvas render should include:

- sky and terrain
- camera-followed vehicle
- two visible wheels and suspension motion
- coins
- fuel cans
- distance display through existing score metric
- fuel gauge inside the canvas or near the vehicle
- crash overlay in human mode

Hill Climb should have its own explanatory panel in `index.html`.

## Testing

Update `test/app.test.mjs` when editing `src/main.js` or adding controls.
Coverage should include:

- static DOM includes the Hill Climb game tab and explanation panel
- game picker switches to Hill Climb
- Hill Climb hides pipe and snake settings
- sequential labels are applied
- network input and output labels are drawn
- human mode accepts gas and tilt keys
- champion payload uses the Hill Climb storage key and compatible genome length
- source syntax check still passes

Before committing or pushing, run:

```bash
npm run check
```

## Acceptance Criteria

- `Hill Climb` appears as a playable fourth game.
- AI training evaluates one vehicle at a time.
- Human play can drive and tilt the vehicle.
- The car can accelerate, jump, rotate, land, crash, collect coins, collect fuel,
  and run out of fuel.
- The fixed level becomes harder over distance.
- Fitness is strongly distance-first, with smaller coin and flip bonuses.
- Saved Hill Climb champions are isolated from other game champions.
- `npm run check` passes.
