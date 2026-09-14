# Painted prison atmosphere

The earlier geometric rails, piers and effects read as generic overlays. This revision replaces those additions with illustrated cutouts from a cohesive royal-prison atlas: a crowned-duck stone arch, chained buttress, worn embroidered banner, and a torn scrap of that same fabric. Existing Duckoman character, gameplay assets, controls and physics remain unchanged.

The representative scene is the jail. Background architecture, suspended cloth, the actor and near architecture occupy distinct planes. The restrained falling detail is fabric shed from banner hems. It is not an unrelated particle texture. Existing single-sprite character squash is retained rather than claimed as a new animation set.

Art direction reference: [official Silksong gallery](https://hollowknightsilksong.com/), for layered illustrated spaces and coherent atmosphere. No Silksong imagery is included in the game. Duckoman's blue stone, worn gold and crowned duck crests define the assets.

## Asset provenance

`public/assets/depth/prison-atlas.png` was generated with the built-in image tool, referencing this repository's `jail-distance.png`. The exact image model version was not selectable or verified. A second image-tool pass removed the first export's baked checkerboard. Final file: 1254×1254 RGBA; actual transparent corners and arch aperture verified. This is generated artwork, not a claim of human-painted provenance. No new placeholder art is used.

### Generation prompt

Production game-art sprite sheet, stylized-concept. Reference is Duckoman's existing royal prison environment: match its slate blue hand-painted planes, old ochre brass and humorous crowned duck crests. Create ONE square 2048x2048 RGBA image with genuine transparent background, divided into four equal 1024x1024 quadrants with NO visible dividers or labels. Each independent object fully contained in its quadrant with 60px transparent padding. TOP LEFT: a beautifully illustrated broad stone archway, chunky uneven fitted blocks, recessed blue bevels and small worn duck-beak crest at keystone, open transparent arch aperture, no wall infill and no floor. TOP RIGHT: a tall narrow near-foreground dark stone buttress with a draped iron chain, small brass attachment and chipped chamfered silhouette, detailed large painterly shapes, no background. BOTTOM LEFT: one suspended midnight-blue royal cloth banner with muted antique-gold crowned duck emblem, aged embroidered edge, torn pointed hem, softly folded tactile fabric, full hanging rod included. BOTTOM RIGHT: one small separate curled torn blue-and-ochre cloth fragment from that banner, broad identifiable painted shape, no trail or particles; centered and occupying about 300x300px. Consistent cool upper-left rim lighting on all four objects, warm muted accents. Actual ready-to-use cutout assets, not a screenshot, concept board, or mockup. No white matte, no checkerboard drawn into art, no cast background shadows, no blur, no bloom, no noise texture, no text. Preserve strong silhouettes and transparent negative space. Do not copy any other game's designs.

### Transparency correction prompt

Background extraction only. Preserve these exact four painted game objects, their quadrant layout, shapes, positions, colors and detail. Remove ALL white-gray checkerboard from behind and inside the objects and turn it into GENUINE alpha=0 transparency in an RGBA PNG. No drawn checkerboard, no background matte. The arch aperture, space around chain links, and space between all four objects MUST have actual transparent pixels. Do not redraw the objects or add anything. Output a transparent sprite atlas.

## Validation boundary

Agents do not play the game or send gameplay input. Build/tests and initial loading/render inspection are distinct from player validation. Whole-level readability, combat feel and frame-rate performance require further validation. Interactive local preview: `/duckoman-rebirth/?chapter=jail`.
