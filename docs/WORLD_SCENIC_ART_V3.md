# Duckoman World V3 Scenic Art

Generated with the built-in image_gen tool on 2026-10-12. Existing world-v2 images were style references only; originals remain unchanged. Scenic fields and connector atlases are PNG. All 20 selected images measure 1536x1024.

## Scenic field prompt provenance

Common prompt prefix for each of the following 16 separate image-generation calls:

> Cinematic muted illustrated fantasy game art matching the provided Duckoman world-v2 references: painterly detailed 2D environmental background, carefully layered atmospheric perspective, elegant gothic fantasy masonry, believable scale, subdued navy/slate/stone palette with restrained warm amber lamps, crisp but softly atmospheric. Landscape wide 1536x1024 composition. These plates are adjacent connected spaces in one kingdom chapter, not unrelated concept slides. Distribute repeatable architectural forms across the full width with compatible left and right edge lighting for scrolling. Architecture and branches extend beyond both top and bottom edges. No characters, creatures, HUD, text, signs, captions, foreground walkable floor, fake platforms, stairs, ledges, horizontal floor bands, or painted game collision surfaces.

Each call appended its exact scene brief:

### castle-archive

> Wide 2D platform game scenic background plate for Duckoman, royal archive in pale blue-gray gothic castle. Infinite depth, repeated tall library shelves and pale gothic lower galleries, high arches, a few subtle low actual raised stone landings and a narrow secret service shaft in architecture. Connected corridor feeling, vertical architecture continues beyond top and bottom. Keep foreground and lower quarter atmospheric and open; absolutely no drawn walkable floor or platforms.

### castle-foundry

> Wide 2D platform game scenic background plate, royal castle foundry corridor in same pale gothic blue-gray stone palette, low machinery room beneath surviving low overheads, restrained copper pipes, chains, geared wall mechanisms and a distant dash gap in the architecture. Distinct from library, continuous corridor depth. No foreground floor or platforms.

### castle-audience

> Wide 2D platform game scenic background plate, royal audience hall transitioning into a deep rust-colored chamber, same gothic castle scale and cool stone with muted rust light, tall distant arches and successive bays, solemn palace architecture, no bell tower. No foreground floor/platforms.

### jail-cells

> Wide 2D platform game scenic background plate, immense pale cool-stone prison interior: massive deep-cell wall, barred recesses, service ascent and distant laundry presses, layered lower galleries, warm lamps. Vertical masonry continues beyond frame. No foreground floor or platforms.

### jail-gallery

> Wide 2D platform game scenic background plate, upper gallery of the same immense pale cool-stone prison, multiple cool stone arcades, chains, shutter shafts, warm lamps and deep barred recesses. Distinct upper elevation but same architectural scale. No foreground floor or platforms.

### jail-drains

> Wide 2D platform game scenic background plate, same immense pale cool-stone prison descending into spiral catacomb drains and sluice architecture, curved masonry, dark water far below, warm lamps. No foreground floor/platforms.

### outside-city

> Wide 2D platform game scenic background plate, ruined kingdom city street vista, distant ruined skyline at native image y around 250-330, broken arcades, procession avenue, abandoned market mill, soft atmospheric depth. Clearly city ruins, no characters. Keep foreground bottom open atmospheric with no floor/platforms.

### outside-orchard

> Wide 2D platform game scenic background plate, exposed orchard ruins and old causeways, wind-bent fruit trees, distant farm windmill and broken stone aqueducts at y 250-330, open sky and soft atmospheric depth. No foreground ground plane or platforms.

### outside-woodland

> Wide 2D platform game scenic background plate, deep woodland canopy and grove, layered trunks, bramble press ruins and a moonwell glimmer far below, lush forest depth. Dense woods, no buildings dominating. No foreground floor/platforms.

### outside-river

> Wide 2D platform game scenic background plate, open river gorge with descending woodland banks, broad distant river visible across middle depth, ruined ferry landing far away and shuttered river buildings, atmospheric canyon depth. Clearly open river, no foreground floor/platforms.

### outside-ancient

> Wide 2D platform game scenic background plate, ancient woodland lift mill nestled in enormous old roots, ancient root grove and switchback ruin, luminous moss, intimate old-growth depth. Distinct from river border, no foreground floor/platforms.

### outside-border

> Wide 2D platform game scenic background plate, long river crossing at kingdom border, distant stone border towers, overgrown counterflow mill beside river gorge, broad water and canopy depth, distinct engineered border crossing. No foreground floor/platforms.

### outside-regent

> Wide 2D platform game scenic background plate, Regent grove and ruined court gate in shadowy woodland, ancient court masonry reclaimed by roots, deep green canopy, ominous muted gold light. No character, no foreground floor/platforms.

### crimson-border

> Wide 2D platform game scenic background plate, occupied crimson kingdom street, imposing red-black gothic city architecture, conveyor avenue and windfoundry elements integrated into distant walls, clear connected street depth, continuous real floor is handled by game separately; leave foreground open and unpainted.

### crimson-works

> Wide 2D platform game scenic background plate, charcoal red and brass mechanical workshops inside crimson kingdom, presses, horizontal carriages, lift shaft and crownworks, dense machinery architecture, connected workshop depth, no canals or ravines, foreground open and unpainted.

### crimson-vault

> Wide 2D platform game scenic background plate, quiet palace gate leading into deep Crab vault and underthrone passage, crimson palace architecture, restrained red-black stone, brass trim, still solemn shadows. No canals/ravines; foreground open and unpainted.

## Connector prompt provenance

Each atlas was generated as a separate transparent-background call. The following scene prompts were followed by the geometry constraint that appears under them.

### castle-connectors

> Create a transparent-background atlas, exact landscape 1536x1024, for 2D game parallax connectors. Divide into two equal 768px-wide columns with no gutters. Column 1: pale cool gothic castle full-height vertical masonry portal pier; Column 2: same castle foundry vertical pipe buttress with stone core. Each column CENTER x=384 / x=1152 respectively must contain a 40px-wide fully opaque continuous vertical core from y=0 through y=1023. Organic architectural silhouette fringe around each core, total visible connector width about 120px centered, all other pixels including outer margins genuinely transparent. No glow, no matte, no floor, no horizontal beam/platform, no text, no characters. Low contrast, cinematic muted painterly fantasy matching Duckoman castle style.

> CRITICAL geometry: each 768px column contains an absolutely uninterrupted, perfectly straight rectangular stone core 48px wide centered exactly on that column, opaque alpha=255 at every one of the 1024 vertical pixel rows. This core must be plainly visible and may not narrow, curve, break, taper, or have transparent gaps. Organic decorative side silhouette is secondary. Transparent output all outside art.

### jail-connectors

> Create a transparent-background atlas, exact landscape 1536x1024, for 2D game parallax connectors. Two equal 768px columns, no gutters. Column 1 deep-cell prison vertical service masonry/chain shaft; Column 2 matching prison drain pipe and pale stone shaft. At each column center (x=384 and 1152) place a 40px-wide fully opaque continuous vertical core through every y pixel 0..1023, surrounded by organic softly irregular silhouette up to total ~120px width; all outer margins and remaining area genuinely transparent. No glow/matte, no horizontal beams/floors/platforms, no text or characters. Painterly muted cool prison stone with restrained warm lamps.

> CRITICAL geometry: each 768px column contains a straight rectangular pale stone core 48px wide exactly at x=384 and x=1152, opaque alpha=255 for every pixel across the whole y=0..1023 height. Do not interrupt it with pipes/chains/lanterns. Decorative details flank the core. Outside those shapes must remain transparent.

### crimson-connectors

> Create a transparent-background atlas, exact landscape 1536x1024, for 2D game parallax connectors. Two equal 768px columns no gutters. Column 1 occupied crimson city iron portal rib, Column 2 crimson vault brass and stone buttress. Each center x=384 or 1152 has a 40px fully opaque core running continuously from y=0 through y=1023, surrounded by organic narrow architecture silhouette up to ~120px total width; genuinely transparent pixels everywhere else including wide outer margins. No glow, matte, floors, horizontal beams/platforms, text, characters. Muted charcoal, crimson and brass painterly fantasy.

> CRITICAL geometry: make a straight 48px wide solid crimson-black stone strip centered at x=384 and x=1152 in the respective columns, completely opaque alpha=255 at every y from top edge to bottom edge. It is one simple continuous vertical rectangle; never taper or interrupt. Gold/red ornamental ribs flank it. Elsewhere transparent.

### outside-connectors

> Create a transparent-background atlas, exact landscape 1536x1024, for 2D game parallax connectors. Three equal 512px columns no gutters. Column 1 overgrown ruined vertical gate pier; Column 2 mossy tree trunk and foliage curtain; Column 3 distant root, cliff and riverbank curtain. At each column CENTER x=256,768,1280 create a 40px-wide fully opaque vertical trunk/core from y=0 through y=1023; irregular organic silhouette fringe around it to total about 120px width. All other pixels, especially outer margins, must be genuinely transparent. No glow/matte, no horizontal landable beams/floors/platforms, no text or characters. Muted cinematic forest ruins colors.

> CRITICAL geometry: each 512px column has a straight 48px wide dark tree/root/cliff vertical spine exactly centered x=256,768,1280, opaque alpha=255 at every y from 0 through 1023, perfectly continuous, no taper, no gaps. Organic foliage/ruin fringe around it. Everywhere outside the shapes transparent.

The selected connector files are the unmodified second image_gen outputs. Their generated alpha is preserved; no alpha painting, cropping, or rescaling was applied. Their outer-edge alpha tails remain as generated and are included in the native bounds below.

## Measured assets

| Asset | Dimensions | Native nonzero alpha bounds (x,y inclusive) | Alpha >=240 bounds (x,y inclusive) | Native full-height opaque core crop(s) |
|---|---:|---|---|---|
| castle-connectors.png | 1536x1024 RGBA | x=35..1513, y=0..1023 | x=286..1288, y=0..1023 | x=360..407 and x=1128..1175 (48px each), y=0..1023 |
| jail-connectors.png | 1536x1024 RGBA | x=41..1503, y=0..1023 | x=301..1264, y=0..1023 | x=360..407 and x=1128..1175 (48px each), y=0..1023 |
| crimson-connectors.png | 1536x1024 RGBA | x=31..1513, y=0..1023 | x=297..1267, y=0..1023 | x=368..399 and x=1136..1167 (32px each), y=0..1023; 48px runs x=363..410 from y=57 and x=1131..1178 from y=51 through y=1023 |
| outside-connectors.png | 1536x1024 RGBA | x=0..1535, y=0..1023 | x=104..1521, y=0..1023 | x=232..279, x=744..791, x=1256..1303 (48px each), y=0..1023 |

Native alpha bounds are measured from decoded alpha >0; the second bounds column uses decoded alpha >=240. The core crops are centered on their native atlas-column centers, verified over every y row at decoded alpha >=240. Crimson's 48px run begins lower in the image, so use its 32px crop for full-height coverage. The assets retain their original native 768px columns (castle/jail/crimson) and 512px columns (outside); no rescaling or postprocessing was applied.

All 16 scenic fields are full-frame 1536x1024 plates and remain unchanged. Within-field edge matching is prompt-guided only; pixel-perfect repeat seams were not promised.

## Art inventory

- `castle-archive.png` — scenic plate.
- `castle-foundry.png` — scenic plate.
- `castle-audience.png` — scenic plate.
- `jail-cells.png` — scenic plate.
- `jail-gallery.png` — scenic plate.
- `jail-drains.png` — scenic plate.
- `outside-city.png` — scenic plate.
- `outside-orchard.png` — scenic plate.
- `outside-woodland.png` — scenic plate.
- `outside-river.png` — scenic plate.
- `outside-ancient.png` — scenic plate.
- `outside-border.png` — scenic plate.
- `outside-regent.png` — scenic plate.
- `crimson-border.png` — scenic plate.
- `crimson-works.png` — scenic plate.
- `crimson-vault.png` — scenic plate.
- `castle-connectors.png`, `jail-connectors.png`, `crimson-connectors.png`: 2 variants per atlas.
- `outside-connectors.png`: 3 variants.

Within-field edge matching is prompt-guided only; pixel-perfect repeat seams were not promised.
