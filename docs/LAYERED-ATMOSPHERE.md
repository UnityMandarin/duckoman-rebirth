# Layered atmosphere and smoother presentation

Every chapter now has two soft haze planes and a fixed pool of 36 falling details across three parallax depths. Castle and jail use dust and cloth; the occupied kingdom uses crimson ash and cloth; the forest uses painted leaves. The woodland adds eight recycled branch sprites split between background and foreground planes, fading in as Duckoman leaves the ruined city. Foreground effects fade near Duckoman to preserve visibility.

The camera no longer rounds castle follow positions to whole pixels. Banner reactions, foreground pillar opacity, and the crab’s claw transitions use exponential damping that behaves consistently at 30, 60 and 120 Hz. Shadow surface records are reused, and nearest-surface lookup no longer allocates and sorts arrays on every frame. All scenery is visual only. Controls, movement constants, collision bodies, enemy health and boss attack timing remain the same.

Falling particles expire, fade at both ends of their lifetime, and retire outside the camera window. Recycled fog and branch pools cover the camera instead of allocating objects across the full world. Ambient animation responds to reduced-motion preference changes while the game is running. Reduced motion stops falling details and branch/banner swaying while preserving static depth.

## Verification

- 56 unit tests pass. Coverage includes damping equivalence at three frame rates, resume clamping, particle fades and culling, existing movement/geometry/checkpoint rules, and the Level 4 combat contract.
- Production build and whitespace checks pass. The pre-existing large-bundle warning remains.
- Chrome checks passed for castle, jail, forest and crimson kingdom with no uncaught browser errors. Each chapter displayed six haze tiles and a 36-slot particle pool; forest additionally displayed eight branch sprites.
- A 1,000-update atmosphere soak in each chapter added no scene objects. Scene restarts recreated a single bounded pool. Live reduced-motion toggling hid particles.
- Inspected screenshots of all four chapters, including the forest foreground and crab arena.
- Combat regression checks: swings and pillars damage the player; stomp/throw leave the crab at 20 HP; dash does not postpone its 3,000 ms pillar deadline; death resets to the checkpoint with 3 player HP, 20 boss HP and the expected 29 ultimate listeners.
- Browser tests wait for restart completion rather than relying on a fixed wall-clock delay, and compare floating-point scene-time intervals with a small tolerance.
- These are automated and visual checks, not a full unassisted owner playthrough or a guarantee of frame rate on all devices.

## New artwork

The built-in image-generation tool produced `public/assets/depth/forest-atmosphere.png`. Its alpha is preserved. The atlas contains a painted oak bough and a separate falling leaf. The prompt requested a transparent 1536×1024 sprite atlas: a gnarled oak bough with olive/moss-green leaves and trailing vines in the upper two-thirds, a separate ochre oak leaf at lower right, textured painterly depth and muted gold lighting, open gaps and clean silhouettes, no text, ground, creatures or scenery backdrop. Runtime atlas frames are defined in `Atmosphere.ts`.
