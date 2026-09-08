# Continuous castle expansion

The existing 1280-pixel room continues to 2560 pixels. The panorama is one image across the full camera range, using the existing 0.6 parallax factor. Ground joins at x=1280 without a gap or transition. The upper route alternates wider robot encounters with smaller elevation-changing landings; the floor offers recovery after a missed landing.

Exactly three additional robots patrol platforms at x=1415, 1770 and 2370. They reuse stomp, dash, contact damage and thrown-object rules. Patrol limits keep them from walking off their assigned platforms.

At x=1820 a warning marks a 76-pixel impact zone at x=2030. After 1500ms of warning a pillar falls for 650ms, dealing two hearts on contact (existing invulnerability applies). It then becomes a permanent 155-pixel obstacle. A held normal jump rises approximately 122 pixels; a held slam-boost jump rises approximately 196 pixels. Recover on the floor, jump, tap S twice to slam, then hold jump on landing to clear the pillar. The warning and landing pulse are time based; no repeated impact damage occurs after landing.

S is now a visual tuck on ground or in air. The first airborne press applies no vertical force; a second airborne press activates the existing slam. Landing resets this sequence. Duckoman has movement sway, landing squash, air tilt, hurt tint, death pose and short fading dash silhouettes. Robots have patrol sway and a brief defeat compression/fade.

The user-supplied intro is `public/media/intro.mp4`. Start plays it with browser-approved user interaction while game assets load behind it. The scene stays paused until video completion or Skip. The intro fades away, focuses the canvas and is not recreated on scene restart. Browser fullscreen is requested as an enhancement; viewport-filling layout works when it is unavailable.

Generated asset: `public/assets/gate3/castle-panorama.png`, built-in image generation with the existing castle plate as reference. Prompt: extend the exact hall into one 3:1 continuous panorama, original hall on the left, connected unique gothic arches and gallery on the right, same blue/amber palette, no duplicated scenery or boundary, background only with calm lower gameplay area.

Validation: focused tests cover two-press air-tuck rules, pillar warning/fall boundaries, three enemy placements and pillar clearance relative to normal/boosted jumps. Gameplay tuning, original assets, LICENSE and NOTICE are preserved.
