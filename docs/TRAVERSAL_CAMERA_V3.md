# Authored traversal camera zones

The runtime camera uses a short, fixed set of authored spatial zones. Each zone is defined in `src/data/traversalCameraZones.ts` by chapter, world X, player-feet Y, zoom ratio, and a constant vertical follow offset. The camera does not predict landings, inspect hazards, or change its target when the player lands. Within a zone, the same shot remains active through movement, falling, landing, and stopping; reversing direction blends back through the spatial feather.

| Chapter and area | Full-strength world X | Player-feet Y | Zoom ratio | Follow offset Y |
| --- | ---: | ---: | ---: | ---: |
| Jail room 7, Observation Walk | 11000–11500 | 80–390 | .85 | -120 |
| Jail room 8, Spiral Drain | 11900–12920 | 390–900 | .85 | -120 |
| Jail room 9, Catacomb Landing | 13300–14355 | 740–1250 | .85 | -120 |
| Jail room 10, Drainage Lock | 14725–15800 | 1080–1740 | .85 | -120 |
| Outside room 4, canopy | 6335–6915 | 20–250 | 1.0 | -100 |
| Outside room 10, waterfall | 15050–15765 | 60–330 | 1.0 | -100 |
| Outside room 16, ancient canopy | 23635–24215 | 20–290 | 1.0 | -100 |
| Crimson room 3, foundry | 4880–5455 | 40–290 | 1.0 | -100 |
| Rescue room 9, Furnace Heart crossing | 13152–13672 | -40–130 | .85 | 0 |

These locations were selected from the actual authored route geometry and camera review, rather than generated from a runtime drop threshold. Castle's authored drops fit its unchanged view, and the boss arena keeps its existing camera owner. Other Furnace drops were judged already visible in the normal view and have no camera zone.

Every full-strength core feathers by 200 world units horizontally and 100 world units vertically. The implementation clamps sampling to each chapter's route bounds, picks the strongest overlapping zone with stable data-order tie breaking, and smooths the fixed zoom and offset toward their spatially sampled values over an approximately 300 ms settling window. Delta is capped at 50 ms and pause/death discards catch-up time. The runtime rig changes only the main camera zoom and follow offset. It never resets follow, deadzone, or scroll, and the HUD remains on its separate camera. While a boss owns the camera, the traversal rig makes no camera writes.

The QA fixture and geometry diagnostics remain available for local inspection, but their trajectory/visibility measurements do not drive runtime camera behavior. Prior predictive-camera browser measurements are historical and do not establish the behavior of these authored zones. Root review of the new zone placements in the browser is still pending. No full playthrough or publication is claimed.

Validation for this revision: focused authored-zone tests cover core/feather sampling, neutral no-op behavior, stable framing across landings and hazard/velocity changes, reversal, boss ownership, pause/death, delta discard, and render-scale changes. The full test suite and production TypeScript/Vite build pass. No full user playthrough is claimed.

Parent browser review (2026-10-14): repeated Jail Drainage Lock step-2 sprint staging through landing. Before: telemetry changed normal → framing → returning. With authored placement: stayed in one `zone` throughout, settling at relative zoom .85007 and offset -119.97 with the next lower ledge visible. Outside room 10 held the authored -100 offset through landing; Outside room 0 stayed at normal ratio 1 / offset 0. No embedded runtime errors observed. Evidence is in the parent workspace outputs (`camera-jitter-before.json`, `camera-zones-after.json`, `camera-zones-outside.json`, `camera-fixed-zones.png`). These checks are targeted browser evidence, not a complete human campaign playthrough. After the resume correction, 522 tests passed; production build and diff checks passed. Local preview only, not published.
