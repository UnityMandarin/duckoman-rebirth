# Chapter 5 image presentation audit

Scope inspected: the Furnace extension (`FurnaceScene`), rescue/boss stage (`RescueScene`), shared player, enemy, trap, checkpoint, impact, and ultimate presentation systems, and Franklin's encounter renderer. Physics helpers remain intentionally separate from visible art.

## Converted in this pass

| Visible element | Previous renderer | Image presentation now | Logic retained |
|---|---|---|---|
| Furnace walls and machinery | Repeated `Graphics` rectangles/lines | `furnace-backdrop` TileSprite; fixed three-image ember pool | Room bounds and timing unchanged |
| Furnace traversal depth | Camera-relative scenic strip | 33 fixed 480px world pools plus a 192px preboss apron; authored surface and full-depth basin images, upward world glow, full-depth retaining walls, fixed pump/feed machinery at every unequal transition, visible bubbling tells, and pooled molten projectiles | Pool height follows overlapping platform and lower lift geometry; static higher reservoirs are visually supplied through enclosed machinery; surface contact is lethal through the existing retry path; visible projectile overlap uses the existing player damage guard |
| Furnace circuit markers | Text | Measured `circuit-1/2/3` atlas frames | Circuit IDs and roomclock unchanged |
| Heated vents and flame | Rectangle core and triangle `Graphics` | Vent strip and three authored flame frames | Warning/burn phases, 1000ms warning, 24px contact range, damage unchanged |
| Furnace robot status | Rectangle plate/core | Utility vent and gear images | Awake range and enemy AI unchanged |
| Furnace platform trim | Graphics line and bolt circles | Omitted redundant trim | Platform art and collision unchanged; no extra update loop |
| Chapter 5 dash | Procedural Graphics | Utility dash image | Facing, lifetime, hitbox and movement unchanged |
| Chapter 5 sprint sweat | Ellipse | Tinted utility ember image | Existing cadence and tween retained |
| Chapter 5 hit spark | Graphics rays/circles | Utility impact image | 160ms lifetime retained |
| Chapter 5 checkpoint glow/core | Graphics/ellipse | Utility halo and vent images | Inactive tint and 450ms activation tween retained |
| Chapter 5 crusher telegraph | Graphics warning lines | Utility warning image | Warning phase and press timing unchanged |
| Chapter 5 ultimate slash/super-freeze dim/sparkles | Generated Canvas and Rectangle | Climax ultimate image, tinted backdrop image, ember images | Blade geometry, strike sweep, freeze duration, meter and 16-particle count retained |
| Chapter 5 enemy health depletion/defeat cracks/gears | Graphics fill, crack lines and gear shapes | Utility vent, cracks and gear images | HP values, debris trajectory, timing and rewards unchanged |
| Chapter 5 enemy health readout | Text label and Graphics fill | Dynamic numeric text with static bitmap `HP`, image bar, and vent fill | HP values and tracking unchanged |
| Chapter 5 throw prompt | Text panel | Static bitmap `J THROW` label | Carry state and input unchanged |
| Franklin control light | Runtime radial Canvas texture | Utility electric and control-glow image frames | Anchor, pulse and alpha follow the existing presentation sample |
| Franklin electricity, chip cracks, mouth flash and tail streak | Visible Graphics line/circle shapes | Fixed 16-image utility/climax effect pool | Existing anchors, activity windows and cleanup retained |
| Franklin wall and pillar warnings | Graphics lines/fill rectangles | Utility warning decal images | Warning phases and hazard bounds unchanged |
| Franklin vulnerable chip, crash sparks and rescue burst | Graphics rings/chevrons/circles | Climax chip-target/burst and utility impact frames | Real chip bounds, three-crash counter, stomp and rescue timing unchanged |
| Franklin title and intro | Text | Static PNG typography frames | Existing intro phase and fade retained |
| Franklin health HUD | SVG warning strips | Authored atlas images for frame, fill and pips; native text is limited to changing health values | Health crop maps against native 310px vent frame width |
| Rescue objective, story, compass and breath mark | Text | Static PNG typography frames | Visibility follows existing stage state |
| Rescue completion panel and buttons | Rectangle and boxed Text | Climax panel and image labels/buttons | Original pointer handlers and replay/menu routes retained |
| Chapter 5 DOM control surfaces | CSS color/blur/primitive borders | Chapter scoped image atlas backgrounds on the existing accessible controls and keys | Native controls, labels, focus and hide/restore behavior retained |

## Invisible or intentionally unchanged

- Player, enemy, throwable, platform, crusher, gate and trigger rectangles remain invisible physics/collision helpers.
- The throwable's visible cake continues to be the existing `cake` image.
- Existing crimson cap/floor, belt and carrier identity art remains in place. The finishing-pass code still composites measured image crops.
- Debug hitboxes remain debug-only overlays and are not normal gameplay presentation.
- Hidden player/enemy/hazard shapes remain physics-only. `FranklinFox.graphics` is an empty, permanently hidden compatibility helper; normal Chapter 5 draws no visible shapes through it.
- The remaining `Graphics` branches in shared dash, checkpoint, crusher and hit-spark code are selected only outside the `rescue` / `rescue-boss` scene keys. The shared earlier-chapter presentation paths are preserved.
- The legacy sign renderer is used by Chapters 2–4, not by Chapter 5. The wind instruction renderer is not reached by Furnace encounters, which contain no wind effects. Rescue's pending-wave Graphics arrays are empty and have no visible objects in the released/cleared stage.
- Dynamic HP digits are the only remaining world Text in the Chapter 5 combat presentation. The surrounding label and bar art are images.

## Verification boundary

The current normal Chapter 5 paths have been searched for visible primitive renderers. Remaining matches are invisible physics helpers, hidden compatibility/debug objects, or renderer branches gated to earlier chapters. Atlas bounds follow the supplied `frames.json`; the authored utility/climax sheets were visually inspected and the typography-only SVG source was rasterized offline to transparent PNG assets. Automated tests and build checks pass. A complete in-game run-through is still needed to validate camera framing, readability, and obstacle silhouette in motion before describing the chapter as ready for full visual playtesting.


### Phaser integration correction (10 October)
- Typed Franklin frame selection resolves chip target/burst to the climax atlas; all effect dimensions are bounded and its existing 16-image pool is destroyed on cleanup.
- Transparent raster Georgia bold glyph atlas now uses native measured crops, light gold fill and dark shadow, with no glyph stretching. Original Furnace stories, room number/name, checkpoint and Franklin introduction copy are preserved, including wrapped lines at 13 logical pixels. Chapter 5 DUCKOMAN is a real Image; dynamic robot HP numerals stay Text.
- Extracted authored panel.webp backs Chapter 5 controls/key caps/HUD glass through a BASE_URL custom property; earlier chapter CSS is preserved.
- Chapter 5 air-jump puff uses a 56×24 image and a 300ms cleanup tween. Dormant robot HP glyph visibility follows setAwake. Released/cleared normal campaign retains the hidden sleeping Z Image.
- Validation: 427 tests passed; TypeScript and Vite build passed. Native glyph atlas inspected visually. Browser/normal campaign runtime verification belongs to the parent audit.

## Runtime review

Controlled live Phaser snapshots covered all 11 traversal rooms, eight Franklin presentation beats, and the completion panel: no visible primitive shapes, invalid atlas frames, or oversized utility images were found. Numeric HP text remains intentional. A real pointer click on the ending Replay button returned to Furnace room 1. The live checkpoint/lifecycle check passed: warning damage 0, burning damage half a heart, unchanged paused clock, visible checkpoint activation, and reset heat clock after retry at the checkpoint. A clean normal localhost preview reported no console warnings/errors. These checks inspect visual states and connected behaviors; they do not claim a fresh continuous unassisted full-chapter playthrough or the user's subjective visual approval. Temporary local QA pages were removed from public delivery. Evidence is saved in the task outputs folder.

## Lava world-space revision

The earlier camera-anchored lava sample above was superseded on 2026-10-10. Lava is now authored in fixed world space, with a 96px clearance below the greatest overlapping platform top (including lifts at their +65px lower extreme). Unequal neighboring basin heights meet at fixed world-space crimson masonry dividers; the preboss safe floor has its own apron pool. The bright surface image marks the lethal boundary, and warm glow rises from each pool. Eruptions use a visible 700ms bubbling tell followed by one to three pooled image blobs; all blobs launch at the warned origin, and only swept overlap with a blob's inset core can call the existing half-heart `Player.takeDamage` path. The world lava contact joins the existing fall-death/checkpoint retry block. Static tests cover pool geometry, support clearance, lethal edges, refuge margins, 30/60/120 FPS route trajectories, randomness bounds, swept contact, current-neighbor surface retirement, pooling, suspension and shutdown. A live traversal/render pass remains for the parent review.

The follow-up visual pass extends every unequal-height masonry support to world bottom 700 and adds a fixed pump, 32px-repeat glowing conduit, and outlet facing the higher pool at all 23 unequal-height transitions, including 47/48px steps. Separate generated iron side rails remain stationary while only the molten window scrolls, and the small pump gear shares the existing lava clock. The pump and outlet stay entirely below the higher pool's surface; pause/suspension behavior and scene cleanup remain centralized. The added transparent feed atlas is registered only in the Furnace profile.

### World-lava runtime acceptance

Controlled browser checks on 2026-10-10 confirmed pool art coordinates stayed identical while the camera traversed all 11 room entrances. Lethal contact produced health 0 and the existing paused death state, then a new player at checkpoint 2960 with health 3. Real Player contact tests recorded 3 health without contact, 2.5 after contact, and unchanged 2.5 during invulnerability. Lava clock remained exactly unchanged during physics pause. A 32.5-second natural observation captured five different eruption origins and variable event intervals, with at most three active blobs and an unchanged 644 scene objects; world trajectories were sampled. All lava textures unloaded entering rescue-boss. Normal preview console remained empty of errors/warnings. Protected gameplay source hashes match the prior baseline. Final verification: 441 tests, production build, and diff whitespace check pass; temporary QA page archived outside public/dist. Sampled jump validation at 30/60/120 FPS passes. This does not claim a full unassisted chapter playthrough or user approval of balance/visuals.
