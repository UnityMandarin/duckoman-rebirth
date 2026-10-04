# Quality redesign — Astra's implementation blueprint

Authorized scope: preserve Level 1 exactly; redesign every block of Levels 2 and 3; polish Chapters 2–5 with concept art, readable animation, less repetition, 20% successive pressure targets, and a fair burrowing Crimson Claw. Deliver on localhost for owner testing. Do not publish this iteration yet. Preserve current files and saves.

## Invariants and architecture

- Keep Gate1Scene, castle/gate1 data, tuning, CastleBoss, shared default player behavior, Level 1 art/texture frames, controls, save schema, chapter lengths, unlocks, and replay intact. Chapter-only visuals must be opt-in. No global art replacement.
- Preserve 12 jail sections, 22 outdoor encounters + 2 boss/exit sections, 10 crimson encounters + 2 arenas. Width remains 1440 per section. Existing saved checkpoint X values remain valid. Compute checkpoint/spawn Y from the authored floor. DEV previews are ephemeral and must never borrow saved progress unless explicitly supplied for a retry.
- Add explicit authored geometry: ledges carry `role: floor|ledge`, floor intervals and tops are specified below. Use `role`, never height, to distinguish tall solid foundations. Jail floor rectangles extend down to world bottom 1840, so one cannot walk under upper floors. World bounds top -160, bottom 1840; camera follows actual vertical travel. Outdoor foundations extend to 620 with genuine holes; crossing bottom 520 kills once through the existing death/retry flow. No invisible safe continuous road under the holes.
- Store all exact placements in one data module and use it for campaign AND route drills. No modulo layout templates, random spikes, random enemy positions, or automatic staircase generation. This document's table is the design source. Rows are independent authored rooms.
- Enemy table entries identify a support (floor interval or step index) and local X. Compute spawn Y = support top - 25 using the existing enemy constructor convention, then clamp patrol with actual body width. Never put a guard on a crumble, ferry, lift, or shutter support; use static nearby support/floor instead. Keep normal robots 1 HP; crimson armored robots retain 2 HP.
- Spikes sit on the relevant floor top (art bottom at floor top); the damaging silhouette is inside the artwork, 20px high and 72px wide, not a full rectangular box. Each cluster is 84px wide. No spikes within 120px of spawn, checkpoint, latch, or gate landing. No spike overlap with resting guard patrols or mandatory takeoff/landing edges. Calm and first-mechanic lessons remain spike-free.
- The common HUD remains fixed to its own camera. No camera mismatch during vertical travel, menu pause, resize, death or restart.

## Exact Level 2 block map

Coordinates: each section starts at X = index * 1440. `F` is the floor surface Y; every listed step is `(local center X, absolute center Y, width)` with height 32. Full floor spans `[0,1440]`, extends down to 1840. Step tops are centerY - 16. These explicit steps carry the player above the next solid foundation in ascending sections. The final descent uses wide catching landings.

|i|Room / environment|F|All steps (x,y,width)|Mechanic / pacing|Spikes local X|Enemies (type, X, support, patrol)|
|--|--|--:|--|--|--|--|
|0|Deep Royal Cell / deep-cells|1740|(350,1660,180); (590,1588,190); (820,1512,210); (1070,1444,220); (1300,1430,200)|ascent / learn|none|none|
|1|Service Shaft / deep-cells|1500|(175,1480,230); (480,1370,180); (300,1278,180); (660,1222,230); (980,1190,220); (1290,1175,210)|ascent / test|720,804,1100,1184|guard X480 step1 patrol65; pointed X980 step4 patrol65|
|2|Laundry Counterweights / old jail-gallery|1260|(180,1170,220); (450,1098,210); (730,1060,260); (1015,1002,210); (1275,940,230)|presses / test|520,604,820,904,1120,1204|guard X180 step0 patrol65; jumper X1275 step4 patrol60|
|3|Lower Gallery Rest / old jail-gallery|1020|(200,930,250); (495,878,250); (825,816,240); (1130,746,220); (1330,700,180)|ascent / calm; checkpoint X80|none|none|
|4|Evidence Switchback / upper-gallery|780|(190,742,220); (450,630,210); (280,538,180); (710,492,260); (1010,462,200); (1300,430,220)|ascent / test|610,694,810,894,1130,1214|pointed X710 step3 patrol70; guard X1300 step5 patrol65|
|5|Chainworks Bridge / upper-gallery|540|(180,448,230); (460,384,200); (715,316,260); (1020,246,230); (1280,206,230)|crumble / test (only steps1,2 crumble)|560,644,780,864,1090,1174|guard X180 step0 patrol65; pointed X1280 step4 patrol65|
|6|Upper Floor 2 / upper-gallery|300|(230,216,360); (695,162,400); (1170,218,340)|rest / calm; checkpoint X80|none|none|
|7|Warden Observation Walk / upper-gallery|300|(190,218,210); (455,158,230); (805,110,320); (1160,204,270); (1330,330,180)|shutters / test (only step1 shutter); descent begins|560,644,740,824,990,1074|guard X190 step0 patrol60; pointed X1160 step3 patrol70|
|8|Spiral Drain / old cistern|540|(175,440,220); (450,518,240); (715,614,260); (990,720,250); (1280,822,240)|descent / test; all static|330,414 on floor; 990 on step3|guard X450 step1 patrol70; jumper X1280 step4 patrol60|
|9|Catacomb Landing / sluice|900|(180,808,220); (445,872,240); (750,970,270); (1055,1070,250); (1290,1188,210)|descent / calm; checkpoint X80|none|none|
|10|Drainage Lock / sluice|1260|(170,1168,210); (440,1244,230); (720,1370,260); (1005,1500,250); (1285,1610,230)|crossfire / test (presses target steps1,3)|340,424 on floor; 720 on step2|pointed X170 step0 patrol60; guard X1285 step4 patrol65|
|11|Eastern Sluice Exit / sluice|1740|(180,1638,260); (490,1578,240); (790,1630,310); (1120,1690,300)|rest / calm; final gate|none|guard X1120 floor patrol65|

NOTE: descent steps below a section's full solid floor would be embedded. In sections 7–10 explicitly segment the floor: 7 `[0,1180]`, 8 `[0,540]`, 9 `[0,550]`, 10 `[0,530]`. The descent ledges beyond those ends extend over open shafts. Add low safe catch floors only at the NEXT section's lower F. Section 7 step4 at Y330 descends over gap after1180; section8 steps2–4 descend after540; section9 steps2–4 after550; section10 steps2–4 after530. Section boundaries do not have extra invisible walls. Source geometry tests must account for actual solid foundation volumes, not treat every floor as a harmless line.

Gate placement (independent of old flat-road gate constants): cell gate0 X240 surface1740, latch X140,Y1680 reachable from initial floor; no overhead decorative collision pier. Mid gate4 at X4*1440-70, ground1020, latch X3*1440+1130,Y700 (reachable on step3); mid gate8 at X7*1440+1090, ground300, latch X7*1440+805,Y72 (on static step2, BEFORE gate); final gate12 X12*1440-120, ground1740, latch X11*1440+1120,Y1680. Closed gates occupy floorY-560..floorY, decorated with the concept door and stacked painted bars/chain above so their full silhouette is visible; never invisible overhanging collision. Solid floor beneath prevents bypass below. Opening removes all collision for that gate and animates all its painted pieces upward165px/fades; no permanent pier blocks the ascent. Preserve IDs0,4,8,12 and save validity. Exit only past final gate while grounded/feet near1740. Story names and secrets follow the room purpose, with climb direction and floor2 explicit. No conveyor or wind in jail.

## Exact Level 3 block map

All outdoor floor tops360, foundations end620. Floor intervals are local endpoints. Steps `(x,y,width)` height32. Default spikes sit on listed floor support; if absent from a floor, move that cluster to an explicitly identified static ledge and record its Y. Prefer remove an invalid cluster over decorating empty air. All danger gaps have visible painted edge caps. First conveyor in room3; first wind in room7, both safe. Early city, first trees, deep roots, river and border have distinct authored backgrounds/props.

|i|Room / background|Floor intervals|All steps|Mechanic / pacing|Spikes X|Enemies (type, X, support, patrol)|
|--|--|--|--|--|--|--|
|0|Fallen City / ruined-kingdom|0–1440|(240,278,330); (680,202,420); (1180,290,330)|rest / calm|none|none|
|1|Ash Gardens / ruined-kingdom|0–580; 880–1440|(170,280,210); (450,208,240); (740,254,220); (1060,282,280); (1300,310,170)|ambush / test|970,1054|hare X450 step1 patrol60; boar X1300 floor patrol65|
|2|Broken Procession / ruined-kingdom|0–300; 1190–1440|(180,290,220); (450,252,200); (735,210,260); (1040,274,210); (1320,310,170)|crumble / test (steps1,2)|none|hare X180 step0 patrol60; boar X1320 floor patrol65|
|3|Market Conveyor / ruined-kingdom|0–1440|(180,302,220); (480,294,270); (825,294,300); (1190,302,240)|conveyor +70 / learn; checkpoint X80|none|boar X1330 floor patrol60|
|4|Bell Orchard / wind-ruins|0–470; 770–1000; 1260–1440|(175,314,210); (435,202,200); (270,118,170); (720,98,290); (1040,206,230); (1310,290,180)|ascent / test|none|pointed X720 step3 patrol75; hare X1310 step5 patrol60|
|5|Royal Causeway / wind-ruins|0–230; 1240–1440|(165,290,210); (420,248,190); (710,190,280); (1010,252,240); (1320,292,180)|relay / test (steps1,2 crumble, press step3)|none|boar X165 step0 patrol60; pointed X1320 step4 patrol60|
|6|Ember Farm Rest / ruined-kingdom|0–1440|(340,296,450); (885,234,530); (1300,300,190)|rest / calm; checkpoint X80|none|none|
|7|First Wind Causeway / wind-ruins|0–1440|(180,310,240); (470,296,250); (790,272,280); (1120,300,250); (1320,310,160)|gust +80 / learn|none|hare X1320 floor patrol60|
|8|First Trees / wildwood|0–460; 950–1440|(180,285,220); (470,212,210); (760,126,280); (1095,210,250); (1320,300,170)|ascent / test|1030,1114|boar X760 step2 patrol75; hare X1320 step4 patrol60|
|9|Hollow Grove / deepwood|0–530; 910–1440|(200,300,250); (505,244,210); (790,194,270); (1080,246,230); (1315,310,170)|shutters / test (steps1,2); checkpoint X80|1040,1124|hare X200 step0 patrol65; boar X1315 floor patrol60|
|10|Bramble Arena / deepwood|0–1440|(180,295,260); (490,212,230); (830,144,360); (1210,282,310)|crossfire / test|540,624,1080,1164|pointed X490 step1 patrol65; hare X830 step2 patrol85; boar X1330 floor patrol65|
|11|Moonwell / deepwood|0–1440|(235,295,330); (690,220,470); (1200,288,370)|rest / calm|none|none|
|12|Raven Wind Descent / wind-ruins|0–400; 720–1030; 1280–1440|(170,280,210); (450,206,220); (730,160,290); (1040,230,270); (1320,292,170)|gust +115 / test; checkpoint X80|none|pointed X450 step1 patrol65; hare X1040 step3 patrol70|
|13|Split River Ferry / fox-river|0–300; 1180–1440|(180,290,240); (495,236,230); (845,222,250); (1190,286,260)|ferry steps1,2 + wind85 / test|none|boar X180 step0 patrol65; hare X1300 floor patrol65|
|14|Stonewater Shutters / fox-river|0–330; 1140–1440|(165,290,210); (420,238,210); (700,178,250); (990,242,230); (1295,300,210)|shutters steps1,2,3 / test|1220,1304|pointed X165 step0 patrol60; hare X1295 step4 patrol60|
|15|Pilgrim Lift / wildwood|0–1440|(190,300,240); (495,268,230); (790,176,270); (1080,250,230); (1320,298,170)|lift step1 + wind -90 / test; checkpoint X80|630,714,1150,1234|boar X190 step0 patrol60; pointed X790 step2 patrol75; hare X1320 step4 patrol60|
|16|Thorn Switchback / deepwood|0–480; 860–1440|(185,322,230); (460,208,220); (285,122,180); (745,106,300); (1050,242,250); (1320,306,170)|crossfire / test|1010,1094|hare X460 step1 patrol65; pointed X745 step3 patrol75; boar X1320 floor patrol60|
|17|Ancient Root Rest / deepwood|0–1440|(310,296,420); (850,220,510); (1290,296,220)|rest / calm|none|none|
|18|Long Crossing / fox-river|0–240; 1220–1440|(165,296,210); (450,232,250); (835,250,250); (1230,298,260)|ferry steps1,2 + wind90 / test; checkpoint X80|none|hare X165 step0 patrol60; boar X1320 floor patrol65|
|19|Border Lift / wildwood|0–500; 940–1440|(190,300,230); (485,262,220); (130,182,170); (775,148,300); (1090,246,250); (1320,300,170)|lift step1 + wind -85 / test|1040,1124|boar X190 step0 patrol60; hare X775 step3 patrol80; pointed X1320 step5 patrol60|
|20|Antler Counterflow / wind-ruins|0–410; 1020–1440|(175,305,220); (455,266,250); (790,240,380); (1150,282,250); (1325,308,150)|conveyor +100 steps1,2,3 / test|1080,1164|pointed X175 step0 patrol60; boar X1325 floor patrol60|
|21|Fox Lantern Approach / wildwood|0–520; 970–1440|(180,295,230); (465,218,240); (790,136,300); (1115,232,250); (1320,302,180)|shutters steps1,2 + gust70 / test|1090,1174|hare X180 step0 patrol60; pointed X1320 step4 patrol60|

Boss sections22/23 retain existing open floor and two side refuges; no ambient traps, spikes, wind, conveyors or guards inside boss arenas. Rest/save at22. Existing boss/gate completion retained. Crown routes still select existing 3 distinct step indexes; use actual authored Y for start/exit signs and retry spawn. Keep IDs and records.

All genuine outdoor floor gaps have concept-image spike beds at surface520 covering the authored gap span, including continuous gaps across section boundaries. One damaging/respawn zone per gap uses that same silhouette. This adds visible, readable punishment to failed crossings rather than invisible bottom death. Never fill the gap up at360. Jail descending shafts similarly have a spike bed at1820; no hazard intrudes into the planned catching ledges. Do not repeat a full environmental background to depict a spike bed: use the separate spike concept sprite clipped/tiled inside that pit interval.

## Pressure and fair danger

Add pure chapter pressure policy: level1=1; jail=1.2; outside=1.44; crimson=1.728; rescue=2.0736 (`1.2^(level-1)`). These are measurable tuning targets, not a claim that perceived difficulty is exactly numerical. Apply consistently to ordinary enemy patrol speed and trap idle/cycle cadence; use isolated scene data rather than changing TUNING. No changes to maxHealth, jump, dash, invulnerability, base damage or HP.

Preserve advance warnings: ordinary presses >=650ms, crimson pillars>=1000ms, boss windup>=800ms, portal warning>=900ms, recovery weakpoints >=900ms. Scale pressure through shorter passive pauses and planned combinations, not overlapping unavoidable damage. Use capped delta/simulation-time clocks and freeze on hidden/paused/dead scenes. Guardian charge speed may scale by outdoor pressure but cap350; warning850 remains; passive rest1600/1.44, recovery>=1000. Warden listening/walk speed scales by rescue ratio2.0736/1.728=1.2; existing tell/recovery windows remain intact. Rescue sentry patrol uses rescue pressure, cues unchanged, full charge still suspends pending waves.

## Crimson Claw burrow sequence and animation

20 HP and damage contract unchanged. Add serialized cycle after pillar-recovery: burrow-down -> underground -> emerge-cue -> emerge-active -> emerge-recovery -> rest. The next cycle returns to claw, charge, pillars. No simultaneous pillars/emergence.

- burrow-down400ms: crouch shell and fold claws; painted dust plume rises; no contact/dash/U damage once disappearing.
- underground700ms: hide shell and claws, disable every boss hit/contact zone and all pillars. Snapshot target X at entry. Clamp to arena inner bounds with100px clearance. Do not home/track player during tell.
- emerge-cue1100ms (phase2>=1000): fixed painted cracked-stone patch120px wide, cyan/gold edge plus pulsing crimson dust, explicit upward cue. Clamp destination at least180px away from current player if still too near at cue start (resolve ONCE, then freeze); never emerge under player at end by resampling. Cue shape = active shape footprint.
- emerge-active260ms: rise120px with articulated claw recoil/dust, danger X±60,Y240..360, damage.5 once; dashing/U protection respected. Visible active silhouette exactly contains collision.
- emerge-recovery1200ms: plant legs, open claws, gold vulnerability cue; dash1/U4 permitted; both remain disabled underground/down/cue. All contact safe during recovery except explicit existing shell behavior if clearly shown; prefer no recovery passive contact.
- Existing claw anticipation/swing/recovery must read as separate poses; 400ms shell compression before charge, articulated opposing claws, charge legs/foot dust, pillar impact then debris settle. Animation affects image transforms only, never physics/hitbox movement outside specified positions.
- Use pure burrow helpers for destination/phase/damage gating, test edge targets, repeated attacks, hidden tab, death, restart, immunity, fixed cue and16/33/50ms time steps. No chasing emergence, instant teleport harm, overlapping attacks, impossible edge pinch.

## Art, animation and performance

Generated plates and16-cell props atlas are specified in QUALITY_ART_MANIFEST. Use existing painted actors/enemies/health bars/sword art plus new concept textures for every visible terrain block, spike, moving surface, gate, cracked stone, crown ring, chain and portal in Chapters2–5. Invisible rectangles for collisions are fine. Text and exact red threat overlays may remain code for legibility, but no flat colored boxes as object artwork. New images are chapter-specific keys, never replace global Level1 keys. If a generated atlas cell has crop/transparency defects, report exact cell before integration; register cell frames from actual dimensions, do not recolor transparency or synthesize sprites.

Use distinct backdrops per authored room and the correct floorY anchor, not repeated flipped wallpaper. Jail new plates0–1 / old gallery2–3 / upper4–7 / cistern8 / sluice9–11; outdoor mapping in table. Crimson city existing tint plus new vault for final approach/boss; Rescue new hollow-prison. Background images are visual-only, foreground collision gets separate painted surfaces with crisp highlighted top edge. Tall foundations tile painted stone in bounded strips; no giant stretched ledge/black void. Stage has <=2 near/distance images per visible room, no repeated pillars every900px. Decorations are placed at room-specific landmarks, not modulo every screen.

Animate images with short anticipation/contact/settle beats: stone press warning shake then acceleration/impact/plume/return; conveyor scrolling painted arrows; ferries smoothly carry actor; shutters pulse then sink/fade with no invisible collision; crumble visibly cracks/shakes then drops; wind painted streaks drift in its actual direction; lantern flame pulse; chains sway slightly then break apart as textured segments; Warden portal scales open then collapses; Franklin breathes without moving feet. Keep gameplay tell cues even reduced-motion; disable ambient sway/extra particles. Optional impact/crown/sword effects are images from atlas, not flat graphics. All animation pools/timers/listeners clean up on shutdown/restart.

Only current + neighboring rooms animate/update. Cull distant images and enemies in X AND Y. Fixed effects pool max24 active; no new graphics/arrays/text allocations each normal frame. Press timers deterministic; suspended rooms restart warning before active damage. Background textures <=2048px long side (retain originals, use imagegen output or browser image resize only when explicitly allowed), no full-world render textures. Keep smooth/sharp graphics selector.

## Required verification and delivery

- Baseline preservation manifest; compare unchanged Level1-owned source and all Level1 asset bytes. Any shared file change must be opt-in for Chapters2–5 with default Level1 behavior unchanged.
- Exact map tests: bounds, no steps inside solid foundations, no interval overlap/seam hole at non-gap transitions, no jump rises above actual122px jump, collision-aware directed reachability from actual spawn to every checkpoint/latch/exit with20px margin, all guard supports/patrols, safe checkpoint landing and gap fallback, route ring reachability.
- Runtime contract tests for pressure, burrow, pause/visibility, save migration/retry, moving carry and closed gates. Update obsolete flat-road tests to the new meaningful requirements; do not weaken tests just to pass.
- One full suite/build after integrating, then only targeted repeats until corrected. Inspect actual rendered menu + chapters2–5 via DEV preview screenshots, not movement/gameplay inputs. Check new images all200/alpha, no black boxes/crop faults, foreground platform art matches collision, vertical camera/HUD and upper gallery screenshot. DEV section preview may accept bounded `section` parameter to show maps without playing, with no campaign writes. No credentials, publishing or SMS.
- Leave server running with direct localhost chapter links, brief summary of pressure targets/maps/burrow and honest separation of automated/render checks from owner's play-feel judgment. This requires a playable implementation, not just a design document.
