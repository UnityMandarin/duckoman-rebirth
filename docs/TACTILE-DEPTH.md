# Chapter depth direction

Presentation update: the geometric scenery and drawn contact marks described below have been superseded by [painted atmosphere](PAINTED-ATMOSPHERE.md). The live contact-shadow fix and original controls remain.

Representative scene: jail. Duckoman's rounded golden silhouette, orange beak, blue edge light, royal prison setting and cake interaction remain the visual anchors. Controls, physics, encounter layouts and progression are retained.

The previous chapter backdrop combined distant architecture and floor in one world-speed painting. Separate distant art, structural midground and a world-aligned floor give the playable surfaces a clear place in space. Restrained material contact reactions and surface-aware shadows provide grounding.

## Generated artwork

`public/assets/depth/jail-distance.png` is a production background generated with the built-in image tool using the existing jail gallery and Duckoman sprite as references. No specific model version was selectable or verified. Original character art is preserved. The new background is generated artwork, not a claim of human-painted provenance.

Final generation prompt:

> Use case: stylized-concept. Create a production wide landscape distant-background raster for the actual Duckoman Rebirth 2D game. Reference 1 establishes prison architecture; reference 2 establishes chunky painterly shape language and blue/gold lighting, NOT a character to include. Simplify the prison into carefully composed distant slate-blue stone vaults, recessed cells, a small warm ochre window, iron bridges and subtle royal duck-beak-shaped stone crest. Side-on layered space with broad quiet silhouettes and readable large shapes, subdued contrast, restrained brush planes, cool upper-left ambient illumination, limited muted slate palette with tiny warm accents. Distant scenery only: NO playable floor, NO characters, no foreground pillars, no hazards, no UI, no text, no particles, no bloom, no artificial blur, no photorealistic microtexture. Lower quarter stays dark quiet slate. Full-bleed wide panorama, intended behind separate code-rendered gameplay stone ledges and foreground frame. Match Duckoman's existing world rather than copying another game's style.

## Review

Run `npm ci`, `npm test`, `npm run build`, then `npm run dev -- --host 127.0.0.1`. Open `http://127.0.0.1:5173/duckoman-rebirth/?chapter=jail` for the representative playable scene or `?chapter=outside` for reused presentation. Chapter shortcuts remain local-only.

No gameplay input, traversal, combat playtest or subjective feel validation was performed by the agents, per the user's instruction. Initial rendering checks do not establish whole-level readability or frame-rate performance. Existing single-image character animation remains stylized deformation rather than a newly drawn animation set.

## Expanded spatial layers

Five extra scenery planes separate recessed arcades, distant walkways, structural piers, hanging fittings, and near foundation masonry. Each has its own horizontal scroll factor. Outdoor chapters reuse the planes for ridges, branches, trunks, and roots. All tall scenery renders behind gameplay; the only near plane in front of characters stays below world y=390, below the playable floor. Chunked static graphics avoid rebuilding architecture each frame. These are decorative shapes, not new collision surfaces.

The actor now occupies world depth 40, immediately behind a near framing plane at depth 46 (HUD remains separate). Narrow translucent piers or trunks cross in front at 1.12 parallax, fading further within 165 pixels of Duckoman. Strong footings stay below the floor; upper chains or branches frame the top. This replaces the earlier below-floor-only foreground constraint.
