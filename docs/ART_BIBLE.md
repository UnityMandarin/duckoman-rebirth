# Duckoman Rebirth Art Bible

## Identity

Duckoman is a tiny, absurdly round yellow hero crossing a grand gothic castle. The contrast is the identity: warm comic innocence against imposing blue-black architecture. The result should feel hand-authored, theatrical, readable, and slightly imperfect—not grim, glossy, or generically epic.

## System

1. **Shape language:** Duckoman and pickups use soft circles and rounded rectangles. Robots and terrain use compact chamfers, squat blocks, and visible joints. Architecture uses tall arches and narrow verticals.
2. **Character proportions:** Duckoman remains a near-spherical body with a tiny beak and one dominant eye. The patrol robot stays low, broad, and about the player's gameplay height.
3. **Silhouettes:** Every actor must read at 50–70 pixels without interior detail. Player yellow, enemy white/red, pickup cream/gold.
4. **Environment:** Gothic castle masonry, banners, lanterns, arches, and stained glass. Gameplay surfaces are dark stone with a thin amber top edge.
5. **Palette:** Ink `#050A11`; castle blue `#10243D`; mist blue `#315B78`; Duckoman gold `#F7C632`; lantern amber `#F0A23A`; banner red `#651D25`; enemy ivory `#D8D1C4`; danger red `#D83A2E`.
6. **Lighting:** Cool ambient depth plus localized amber practical light. Highlights describe edges; glow never replaces shape.
7. **Materials:** Broad painterly strokes, restrained stone grain, lightly worn metal, soft feather texture. No photographic noise or micro-detail at gameplay scale.
8. **Edges:** Strong outer silhouette, softer interior edges, occasional hand-painted irregularity. No universal black cartoon outline.
9. **Depth:** Far architecture is lower contrast and cooler. Midground carries readable arches and banners. Collision terrain is darkest and sharpest. Foreground occlusion is sparse and never hides actors.
10. **Background:** Spacious lower-middle negative space; architecture frames play rather than competing with it.
11. **Enemies:** Friendly-industrial gothic machines: squat, pale metal, black face, one small red signal. Never military-realistic or spiky by default.
12. **Objects:** Familiar celebratory props rendered as tactile treasures. The cake remains unmistakably cake; no magical aura is required.
13. **HUD:** Compact ink panel, fine brass edge, warm serif display type, cool blue stamina accent, red health. HUD is functional and quiet.
14. **Effects:** Brief directional smears, impact rings, and color flashes only when they communicate state. No ambient particle clutter.
15. **Animation:** Clear anticipation and recovery, small squash/stretch, held silhouettes, minimal secondary motion. Gameplay timing is never changed to serve animation.
16. **Readability:** Player, enemy, pickup, hazards, and walkable tops must separate by hue, value, and silhouette in every frame.

## Forbidden

## Approved review refinements

The castle reveals more architecture with horizontal camera movement at 0.6 parallax. Terrain uses the supplied chunky blue masonry reference with chipped amber edges and shadowed undersides. Contact shadows anchor actors to the nearest supporting surface. The robot has Duckoman-sized visible artwork with a time-based patrol sway. HUD follows the reference portrait ring, three hearts, amber health bar and three cyan stamina segments; each segment displays fractional stamina. Physics bodies and room geometry remain the Gate 2 baseline.

Masonry asset: `public/assets/gate3/masonry.png`, generated with the built-in image tool. Prompt: isolated side-view gothic stone platform matching the supplied reference, chunky dark blue masonry, thin chipped amber top edge, deep crevice shadows, smaller stones beneath, tapered broken underside, transparent background, no scenery or HUD. Runtime texture framing removes transparent padding without modifying the source image.

Neon purple gradients, glassmorphism, random bloom, constant particles, generic mobile UI, photoreal textures, sterile perfect geometry, decorative noise, inconsistent rendering styles, baked gameplay objects in backgrounds, unreadable foreground occlusion, or visual changes that alter approved collision geometry.
