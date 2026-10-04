# Chapter identity correction — Astra decisions

Priority: replace shared blocks, wrong doors, and floating instruction signs FIRST. This is a visual identity pass on the current local game, not another geometry or difficulty redesign. Keep Level 1 byte-for-byte as it is at the start of this pass. Keep all current ledge coordinates, floor gaps, enemies, spikes, checkpoints, lock IDs, saves, controls, boss mechanics, difficulty, and scene transitions. No publishing. No gameplay input during verification.

## Four genuinely different concept-art kits

Use built-in image generation under the imagegen skill. Generate ONE new transparent 4-by-4 sprite atlas per chapter, never recolor the shared mossy kit. Preserve PNG bytes/alpha, copy outputs into `public/assets/identity/`. Record full prompts, native dimensions, generation source, and inspected crops in `docs/CHAPTER_IDENTITY_ART.md`. Do not overwrite previous artwork. The four keys/paths are `identity-jail`, `identity-outside`, `identity-crimson`, `identity-rescue`, each loading `assets/identity/<chapter>.png`.

Every atlas has the SAME row-major semantic slots (16 total); exact crop coordinates must be measured on the actual output before final approval:

|slot|frame name|shape and use|
|--:|--|--|
|0|cap-a|horizontal platform, flat straight top, shallow side silhouette|
|1|cap-b|different horizontal platform, same flat-top rule|
|2|cap-c|third clearly different horizontal platform|
|3|foundation|fully opaque rectangular material tile, no holes; crop inside its opaque face|
|4|belt|horizontal moving conveyor deck with clear direction-neutral gear detailing|
|5|carrier|horizontal ferry/lift deck; different silhouette from belt|
|6|cracked|obviously cracked horizontal cap, same collision plane|
|7|shutter|horizontal retracting deck with visible segments; NOT a standing door|
|8|door-frame|tall complete OPEN doorway frame, transparent central aperture, straight-on side-view|
|9|door-leaf|separate tall narrow CLOSED barrier panel, filled/grilled across its full height|
|10|sign|wide blank readable plaque on a short mounting foot; face occupies upper 2/3, no letters/arrows baked in|
|11|rest|small chapter-specific save/rest marker|
|12|chain|vertical chapter-specific chain/locking bond|
|13|spikes|horizontal dangerous cluster, top silhouettes clear|
|14|press|tall overhead crushing weight|
|15|latch|small visibly operable lever/wheel/rune switch, not a lantern|

All non-foundation sprites sit wholly inside their own cells on real transparency, 8% cell padding, no shadows/background/grid/text. Platform silhouettes run left-to-right and are shallow (about 4:1); door pieces are about 1:2.5. Sign faces are wide enough for two short lines of runtime text. Dark outlines and restrained highlights must remain readable at 640x400. Request a square atlas; use native output, inspect and measure rather than assuming a fixed output resolution.

Inspection refinement: accept uneven row spacing when all16 intended objects remain separated; measure whole-object rectangles in full-image coordinates, never blindly quarter the atlas. Crop hanging rigging OUT of deck frames so their first visible row is the actual collision top. The jail source spike cluster points down: use a runtime vertical flip for jail spike artwork, never modify PNG pixels.

Native-alpha refinement: generated foundation interiors are nearly opaque (alpha250–254), so requiring every pixel255 would produce unusable1px crops. Accept an INNER material rectangle with every alpha>=250, at least70px in both dimensions. In the renderer put one fully opaque matching chapter-color rectangle UNDER the foundation art, bounded to the full existing floor visual rectangle (jail0x172633, outside0x35281e, crimson0x1b1119, rescue0x36313b), depth-1. Extend the foundation tile behind the cap within those same floor bounds so transparent scallops reveal continuous chapter material. This is hidden opacity backing, not a visible replacement for concept art, and adds no body. Keep PNGs unmodified. No background showing through the material, no wide transparent holes, no false floor over gaps.

Exact generation prompts (each prompt includes this atlas contract):

### jail.png

Stylized-concept production sprite atlas for Duckoman's royal jail, painterly fantasy side-view game, believable hand-painted materials and crisp readable silhouettes. Real transparent background. Precisely sixteen separate objects in a clean 4-by-4 grid, all wholly within their cells with 8 percent padding. No cell borders, captions, letters, watermark, drop shadows, backdrop, character, grass, roots or moss. Row 1: A dark blue basalt shelf reinforced by iron corner rivets; B flat charcoal steel grating on a thick iron beam with chain lugs; C pale worn limestone evidence-gallery ledge with a narrow brass trim; fully opaque rectangular navy basalt masonry face made from small staggered bricks, no openings. Row 2: iron roller conveyor deck; hanging counterweight lift deck; deeply cracked dark basalt shelf; horizontal segmented retracting iron deck. Row 3: tall narrow rectangular open prison doorway frame of iron-reinforced basalt, central opening completely transparent; separate tall narrow closed iron portcullis panel with dense vertical bars and cross rails covering the entire panel height; blank wide brass-edged prison notice plaque on a short riveted mounting foot, blank face in upper two thirds; small warm amber prison save lamp. Row 4: vertical heavy iron chain; horizontal sharp iron spike cluster; tall heavy counterweight crusher; compact brass crank lever with a handle, visibly a switch. Straight-on side-view, horizontal flat collision tops on every platform, no perspective that tilts those tops. Door parts face forward and are compatible as two layered pieces. The atmosphere is cold, oppressive and industrial. Each A/B/C platform has a different structure, not merely a tint.

### outside.png

Stylized-concept production sprite atlas for Duckoman's fallen kingdom and Wildwood journey, painterly fantasy side-view game, hand-painted materials and crisp readable silhouettes. Real transparent background. Precisely sixteen separate objects in a clean 4-by-4 grid, all wholly within their cells with 8 percent padding. No cell borders, captions, letters, watermark, drop shadows, backdrop or character. Row 1: A warm weathered sandstone terrace with tiny chipped edge details and dry gold lichen; B flat timber plank bridge on short rope-bound beams; C flat living root shelf with a thin earth cap and small trailing foliage underneath; fully opaque rectangular earth-and-fine-roots cross-section tile, no gaps and no giant repeating pillars. Row 2: brass and oak mill conveyor deck; rope-bound wooden river ferry deck; visibly split sandstone terrace; horizontal leaf-and-wood segmented retracting deck. Row 3: tall narrow open border gate frame of two oak trunks, entwined branches and a small antler crest, transparent center, no prison bars; separate closed tall narrow dark oak gate panel with crossed wooden slats and brass fox seal; blank wide weathered wooden trail plaque on a short forked mounting foot, blank face in upper two thirds; small golden fox trail lantern. Row 4: vertical braided rope with brass binding rings; horizontal thorn spike cluster with unmistakably sharp points; tall suspended carved stone-and-root crushing weight; compact oak-handled brass mill switch. Straight-on side-view, all platform tops horizontal and flat. Door parts compatible as separate layers. Atmosphere warm, weathered, natural, with amber wood, ochre sandstone and restrained green roots. Silhouettes must be clearly unlike a metal prison.

### crimson.png

Stylized-concept production sprite atlas for Duckoman's occupied Crimson Kingdom, painterly fantasy side-view game, hand-painted materials and crisp readable silhouettes. Real transparent background. Precisely sixteen separate objects in a clean 4-by-4 grid, wholly inside their cells with 8 percent padding. No cell borders, captions, letters, watermark, drop shadows, backdrop, character, moss, grass or wooden planks. Row 1: A sharp-edged black obsidian shelf with a thin crimson marble top; B flat dark bronze industrial deck with red enamel inlays; C flat pale red-veined marble ceremonial ledge with sculpted gilt side brackets; fully opaque rectangular black ashlar foundation face with thin red mineral veins, no gaps. Row 2: dark bronze and red-enamel gear conveyor; narrow armored siege carriage deck; shattered black obsidian ledge with bright visible cracks; horizontal interlocking crimson-metal retracting deck. Row 3: tall pointed gothic open doorway frame of black stone and red marble with restrained gilt claw crest, central aperture transparent; separate tall narrow closed bronze armored barrier panel with a crimson vertical seal and sharp gothic details, covering the full height; blank wide angular black-and-red metal warning plaque on a short riveted mounting foot, blank face in upper two thirds; compact red crystal refuge beacon. Row 4: vertical dark bronze chain with crimson joints; horizontal black crystal spikes with red edges; tall spiked siege-engine crushing weight; small red-enamel handwheel and lever switch. Straight-on side-view; platform tops straight and horizontal. Door parts compatible as separate layers. Atmosphere militant and severe. Material and silhouettes must be visibly different from both the navy prison and natural Wildwood kits.

### rescue.png

Stylized-concept production sprite atlas for Duckoman's Hollow Prison under the throne, painterly fantasy side-view game, hand-painted materials and crisp readable silhouettes. Real transparent background. Precisely sixteen separate objects in a clean 4-by-4 grid, wholly inside their cells with 8 percent padding. No cell borders, captions, letters, watermark, drop shadows, backdrop, character, iron prison bars, moss or grass. Row 1: A flat pale chalk-stone ledge with black narrow geometric rune seams; B flat inky metal bridge with a restrained violet crystal lip; C flat alabaster dais supported by a small sculpted spectral bracket; fully opaque rectangular pale ribbed chalk-stone foundation face with fine dark vertical seams, no gaps. Row 2: inky metal and violet crystal conveyor; floating pale monolith carrier deck; cracked chalk-stone shelf with violet seams; horizontal segmented spectral-metal retracting deck. Row 3: tall narrow hexagonal open ritual doorway frame of pale carved stone and inset violet crystals, central aperture transparent; separate tall narrow closed inky geometric seal panel with a violet central diamond, filled across its whole height, no iron bars; blank wide pale engraved tablet on a short angular mounting foot, blank face in upper two thirds; small violet rune rest monolith. Row 4: vertical black rune-linked chain with tiny violet joints; horizontal sharp pale crystal spikes; tall pale ritual monolith crushing weight; compact violet diamond-shaped palm switch. Straight-on side-view; platform tops straight and horizontal. Door parts compatible as separate layers. Atmosphere quiet, eerie and ritualistic. Pale stone and angular violet geometry distinguish this hidden prison from the industrial royal jail.

## Rendering contract

Add `src/data/chapterVisuals.ts` (pure authored data), `src/systems/ChapterVisuals.ts` (registration/render helpers). Export `IdentityChapter = 'jail'|'outside'|'crimson'|'rescue'`; `preloadChapterIdentity(scene,chapter)`, `registerChapterIdentity(scene,chapter)`; `identityTexture(chapter)`; `platformVisual(chapter,room,step)` returns one of the exact frame names; `floorVisual(chapter,room,interval=0)` returns cap-a/b/c. Central data includes inspected crop rectangles, authored surface arrays below, authored sign placements below, and door modes. No randomness, index modulo styling, or cross-chapter fallback to old green stone. If a required asset is absent, report it; do not quietly use generic kit.

Shared renderer API for both implementers: `addIdentityBlock(scene,chapter,{x,top,width,height=48,frame,depth=2})` returns one proportionally tiled `TileSprite`; x is its center, top its origin-aligned top, and the final partial cell is clipped at the requested right edge. `addIdentitySign(scene,chapter,{x,y,text})` where y is support top; `addIdentityFloor(scene,chapter,{x,top,width,height,frame})` where x is collider center and frame is selected cap; `addIdentityDoor(scene,chapter,{x,ground,width,height,opened})` returns `{frame,leaf}`; `openIdentityDoor(scene,chapter,door,duration)` animates leaf only and preserves frame. Export `IdentityDoor` type. Runtime text splits at the FIRST ` / ` only, so `REST / SAVE` stays on its second line. Measured frame rectangles may be kept in `public/assets/identity/frames.json`, loaded by `preloadChapterIdentity` into cache key `identity-frames`; registration reads that metadata. This avoids editing code for each measured crop.

Terrain bodies remain untouched. Every ledge block (static and moving) is one `TileSprite` with the authored mechanic frame, origin(.5,0), top at centerY - height/2, visible width equal to collider width, and height48 (shutter32). Scale both tile axes uniformly by desired block height/native frame height; repeat blocks horizontally and clip only the partial final cell at the requested right edge. Never stretch a single block across a long platform or allocate one image per repeat. Floor cap strips also repeat horizontally at uniform native proportions, 48px deep (or at most collider height). Lower foundations repeat at uniform scale128/native foundation height within the existing floor rectangle; an opaque chapter-color backing fills that full rectangle behind foundation and cap so transparent scallops reveal continuous material. This is visual only. Rescue uses a total visual floor height of240px over its unchanged40px collider. No new collision. Pit edge caps use the same repeated block helper and remain entirely within real floor intervals; no painted cap spans an actual gap. Each floor interval has its own cap frame. Keep all current particle pools and trap clocks.

Closed doors: replace generic arch + stretched masonry bars. One persistent chapter-specific door-frame image; one separate door-leaf image over the EXACT invisible blocker rectangle. Journey blocker stays42x560: leaf42x560 at x,ground with origin(.5,1); frame132x578 anchored at x,ground. During lift/lift-fade animation, crop the moving leaf each update to the original blocker opening with `Image.setCrop`; no geometry mask is used. Frame stays after opening, has no body. Closed leaf must cover the full blocker height visibly. Initial saved-open leaf is hidden, collider disabled. Jail leaf retracts upward560px over650ms through the crop. Outside leaf folds horizontally to scaleX0/fades over700ms. Crimson leaf lifts560px/fades over700ms through the crop. Doors never move the entire arch or add painted masonry rods. Latch uses kit frame `latch` at the exact existing button coordinates, same28x48 and65px interaction distance; J label below the switch. Keep gate IDs and open callbacks. Door mode data must not change actual gameplay waits. Rescue blocker sizes remain46x360 (seal) and52x360 (exit), frame132x376, leaf matching blocker, ritual dissolve over520ms; keep scene state/chain rescue logic. Frames stay visible after barriers disappear.

World signs: use the chapter `sign` art168x92, origin(.5,1), bottom at the specified support top; readable runtime text centered x, bottomY-60, max132 wide, font9px, high contrast, at most TWO short lines. Chapter-specific typography color jail cream, outside ivory, crimson pale gold, rescue pale violet. No duplicate long format-plus-instruction sentence in the world. Keep HUD objective, story and controls. Room0/boss/exit signs must be built too. Checkpoint markers use chapter `rest`, same interaction/save dimensions. Remove the old floating REST/SAVE text; include REST / SAVE on the corresponding authored sign. Do not change CrownRoute rings/saves.

## Every block's exact art assignment

Coordinates come unchanged from `qualityRooms.ts` for Levels2/3 and `chapterPlatforms('crimson')` for Level4. Each list is in exact `step` order; A/B/C mean cap-a/b/c; R=cracked, S=shutter, T=belt, M=carrier. Floor list is in exact existing interval order. These are explicit authored rows, never cycle/modulo generated. New styles change appearance, not geometry.

|jail room|floor caps|steps|
|--:|--|--|
|0|A|A A B A B|
|1|A|B B A B C C|
|2|B|B B C B C|
|3|C|C A C C A|
|4|C|C C A C C B|
|5|B|B R R B C|
|6|C|C C C|
|7|B|C S B B A|
|8|A|A A B A B|
|9|A|A C A B A|
|10|B|B A B B A|
|11|A|A B A A|

|outside room|floor caps|steps|
|--:|--|--|
|0|A|A A A|
|1|A C|A A C C A|
|2|A A|A R R A A|
|3|A|A T T T|
|4|C A C|C A C A C C|
|5|A A|A R R B A|
|6|C|C B C|
|7|A|A B B A A|
|8|C C|C C C B C|
|9|C C|C S S C C|
|10|C|C C A C|
|11|C|C C C|
|12|A C A|A B A B A|
|13|B B|B M M B|
|14|A A|A S S S A|
|15|C|C M A C C|
|16|C C|C A C A C C|
|17|C|C C C|
|18|B B|B M M B|
|19|A C|A M C A C A|
|20|A A|A T T T A|
|21|C C|C S S C C|
|22|C|C C|
|23|A|A A|

|crimson room|floor caps|steps|
|--:|--|--|
|0|C|C C A|
|1|B|B T T T B|
|2|A|A B C C A|
|3|A|A T R T A B|
|4|C|C T T B|
|5|B|B M M B|
|6|A|A T T T A|
|7|B|B M C B C|
|8|C|C T T T T A|
|9|C|C C C|
|10|A|A A|
|11|C|C C|

Rescue floor uses A; ledges at(260,276,180),(960,276,200),(1450,266,200) use A,B,C respectively. This last level must not reuse road-platform for its ledges.

## Exact physical sign placement and copy

Each room-local sign X below is worldX=room*1440+X. `floor` means the room floor top; explicit elevated bottomY values align the sign exactly with the first static ledge top and keep it clear of ledge artwork. Sign width defaults to168px except where a width is explicitly listed. All signs are non-colliding. Text `/` separates the two lines. Purposeful signs replace vague repeated instructions. At mechanic entrances leave the specific cue; in quiet rooms show location/rest. Existing objective HUD remains, but no generic duplicate long world text. Sign art is depth3 and text depth4 so actor visuals at depth5 remain in front.

|jail room|X/support|copy|
|--:|--|--|
|0|92/wall; bottomY1620|J: CELL LATCH / STAIRS EAST|
|1|375/floor|SERVICE SHAFT / CLIMB TO GALLERY|
|2|375/floor|COUNTERWEIGHTS / WAIT FOR RED LINE|
|3|410/floor|LOWER GALLERY / REST / SAVE|
|4|385/floor|EVIDENCE STAIRS / FLOOR 2 ABOVE|
|5|380/floor|CHAINWORKS / CRACKED = FALLING|
|6|495/floor|FLOOR 2 / REST / SAVE|
|7|380/floor|OBSERVATION WALK / EAST: SLUICE DOWN|
|8|175/bottomY424|SPIRAL DRAIN / FOLLOW THE LEDGES|
|9|180/bottomY792|CATACOMB LANDING / REST / SAVE|
|10|170/bottomY1152|DRAINAGE LOCK / WAIT, THEN DESCEND|
|11|395/floor|EASTERN SLUICE / J: LAST LATCH|

|outside room|X/support|copy|
|--:|--|--|
|0|490/floor360|FALLEN KINGDOM / FRANKLIN: EAST|
|1|360/floor360|ASH GARDENS / BROKEN ROAD AHEAD|
|2|180/bottomY274|PROCESSION BRIDGE / CRACKS BREAK|
|3|180/bottomY286|MARKET MILL / REST / SAVE|
|4|365/floor360|BELL ORCHARD / UPPER CROSSING|
|5|165/bottomY274|ROYAL CAUSEWAY / LAND BEFORE DASH|
|6|650/floor360|EMBER FARM / REST / SAVE|
|7|180/bottomY294|FIRST WIND / K HOLDS COURSE|
|8|375/floor360|WILDWOOD / FOLLOW GOLD THREAD|
|9|200/bottomY284|HOLLOW GROVE / REST / SAVE|
|10|395/floor360|BRAMBLE ARENA / RED = FALLING STONE|
|11|485/floor360|MOONWELL / QUIET CLEARING|
|12|805/floor360|RAVEN ROAD / REST / SAVE|
|13|180/bottomY274|SPLIT RIVER / RIDE, THEN LEAP|
|14|165/bottomY274|STONEWATER / FADING = NO FLOOR|
|15|695/floor360|PILGRIM LIFT / STEP OFF AT TOP|
|16|385/floor360|THORN RIDGE / CLIMB THEN CROSS|
|17|605/floor360|ANCIENT ROOTS / LOOK ABOVE|
|18|165/bottomY280|LONG CROSSING / REST / SAVE|
|19|294/bottomY284/w156|BORDER LIFT / FRANKLIN: EAST|
|20|175/bottomY289|ANTLER MILL / ARROWS MOVE FLOOR|
|21|380/floor360|FOX LANTERNS / FOLLOW THE BRIDGE|
|22|100/floor360|BROKEN REGENT / WAIT FOR HEAD DROP|
|23|145/floor360|FOX BORDER GATE / EASTERN ROAD|

|crimson room|X/support|copy|
|--:|--|--|
|0|180/bottomY294|SCARLET BORDER / KING CAPTURED|
|1|180/bottomY294|OCCUPATION ROAD / ARMORED: 2 HITS|
|2|650/floor360|SILENT FOUNDRY / AGAINST THE WIND|
|3|370/floor360|BLOODWATER / CRACKED LEDGE FALLS|
|4|650/floor360|SIEGE PARADE / WATCH RED LINES|
|5|680/floor360|BELLWORKS / RIDE THE CARRIAGE|
|6|345/floor360|REFUGE OF ASH / REST / SAVE|
|7|645/floor360|IRON PROCESSION / RIDE THE LIFT|
|8|605/floor360|CROWNWORKS / CONTROL THE BELTS|
|9|260/bottomY294|CAPTIVE KING GATE / REST / SAVE|
|10|145/floor360|CRIMSON CLAW / K OR U: SHELL|
|11|145/floor360|UNDER THE THRONE / FRANKLIN BELOW|

Rescue signs (absolute X, bottomY360): x435 'HOLLOW PRISON / U BREAKS CHAINS'; x720 'RUNE SEAL / SAVE FRANKLIN'; x1750 'EASTERN PASSAGE / DEFEAT THE WARDEN'. No new puzzle, unlock or stage dependency. Keep Franklin/cake/enemy readability; signs sit at depths3/4 behind actors at depth5.

Two exact presentation exceptions: jail0 sign is wall-mounted with bottomY1620, safely above the latch at(140,1680), never obscuring its handle. Rescue floor retains its actual40px collider, but its visual opaque foundation extends toY600: use visual floor height240 at top360. No new floor body or reachable surface.

## Files and acceptance

Journey rendering + ChapterTraps: use `platformVisual` for every static/moving ledge, `floorVisual` for floor intervals, chapter frames for spikes/presses/rest/latches/door. Keep generic concept-props ONLY for shared effects (wind,dust,sword,portal,crown) until another authorized pass. Replace old gate bars/chains construction; no invisible oversized blockers. Rescue: same kit integration for floor, three ledges, two door assemblies, signs and Franklin bonds. Do not modify actor/rules/geometry modules.

Verify pure authored arrays have exact room/step/interval coverage, all four texture paths different, mechanic-frame assignments agree with actual moving supports, door leaves map exactly to blocker dimensions. Check native asset alpha and opaque foundation crops. Preserve source hashes of Level1 + geometry/rules/controls/saves. Run relevant data tests/typecheck/build, then primary browser inspections without gameplay inputs: jail0/jail6, outside0/outside13, crimson0/crimson10, rescue. Owner tests play feel. Final output must show distinct block/door/sign styles in actual rendered scenes, not just generated atlas previews.
