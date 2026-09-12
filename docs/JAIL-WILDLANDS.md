# Jail escape and the road to Franklin Fox

## Scope

- Horizontal 255 ms dash: gravity and vertical motion are suspended, then restored on expiry, stomp, hurt, or ultimate completion.
- Hold **Left Shift** to sprint. Only active movement consumes 0.25 stamina per two accumulated seconds. No regeneration while sprinting. Releasing Shift restores walking. Sweat is movement-gated.
- Kingdom remains 11,520 units. Jail is 17,280 (150%); outdoors is 34,560 (200% of jail).
- Twelve named jail sections: cell latch, gallery/drain choices, three sluice locks, four lore secrets, rest checkpoints, guards and breakable secret barriers.
- Twenty-four outdoor sections: fallen capital, deep woodland, fox border. Eight dispatch secrets, boar/hare monsters, a ten-HP Broken Regent, and the road toward Franklin Fox.
- Doors use **J** near a latch; J still throws the cake elsewhere. U ultimate and half-heart HUD remain available in both chapters. The secret 1+2+3 command persists across transitions.
- Checkpoints and opened gates survive death within the active session, not browser reload. Respawn restores health and resets enemies; dispatches cannot be farmed repeatedly.
- No menus, introductory video, extra standalone banners, or changes to original attribution/assets.

## Delivery and validation

### Difficulty revision

The owner found the original route pass too easy and repetitive. The revision replaces four reused templates with 34 distinct encounter layouts: collapsing bridges, switchback climbs, spike-bed crossings, elevated ambushes, timed presses, and mixed pillar/guard encounters. Continuous physical ground remains underneath the visible spike beds; it is no longer a safe walk-through shortcut. Spike beds cost one heart, heavy presses two. Checkpoints now restore half a heart, every two jail sections or three outdoor sections, with a pre-boss checkpoint.

Jail pressure targets 1.2 times kingdom guard speed (120 vs 100), with 750 ms pillar warnings vs 900 ms. Outdoor pressure targets 1.5 times guard speed (150), with 600 ms warnings. Collapse windows are 500/400 ms. These percentages are engineering tuning targets, not an exact measurement of perceived difficulty; owner playtest determines the feel.

The outdoor boss occupies sections 23–24, starting at x=31,680. The HUD identifies its section. Local direct boss shortcut: `/duckoman-rebirth/?chapter=outside&boss=1`. There is no additional jail boss.

Automated tests cover stamina timing, dash vertical lock and gravity recovery, world-size ratios, continuous ground, ascending route geometry, and actual PNG alpha/asset presence. TypeScript and production build pass. No gameplay, browser playthrough, or human visual acceptance performed. Geometry checks are not a substitute for a full owner playtest.

Local shortcuts, restricted to localhost/127.0.0.1:
- `/duckoman-rebirth/?chapter=jail`
- `/duckoman-rebirth/?chapter=outside`

Normal progression remains kingdom -> IronWing core eye -> jail -> outside -> Franklin's border. The border is this update's endpoint; Franklin's interior kingdom is not added.

## Art provenance and prompts

Built-in image generation was used, then each selected PNG was copied into `public/assets/chapters/`. Originals in `assets/original`, LICENSE and NOTICE.md are unchanged. The kingdom's existing door/button/pillar/spike/robot/duck/cake concepts are reused for continuity. HUD and small sweat/contact effects remain native graphics. Creature variants containing baked checkerboards were rejected; shipped sprites have real alpha. The selected creatures retain a soft corruption aura.

### jail-gallery

Saved: `public/assets/chapters/jail-gallery.png`

Prompt: A premium hand-painted 2.5D side scrolling game background panorama, 3:1 wide. Interior of an eerie royal prison: massive blue slate arches, iron barred cells, maintenance galleries, chains, amber lamps, pale moon shafts, nuanced painterly materials. Straight side-on camera, continuous horizontal stone floor at 80 percent image height. Readable quiet lower foreground; architecture recedes into atmospheric shadow. No characters, text, UI, floating platforms or foreground bars obscuring play. Bespoke cinematic fantasy art, restrained blue and warm gold, not generic glossy AI imagery.

### ruined-kingdom

Saved: `public/assets/chapters/ruined-kingdom.png`

Prompt: Premium hand-painted side-scrolling fantasy game background panorama 3:1 wide. A ruined duck kingdom outside its prison: broken royal towers, collapsed bridges in far distance, scorched gardens, quiet drifting ash suggested in painting, warm ember windows and cold predawn sky. Continuous horizontal dark earth ground at 80 percent height, straight side-on camera. Moody blue slate and restrained amber matching gothic castle. Detailed painterly materials, clear quiet foreground, no characters, no text, no UI, no foreground obstacles.

### wildwood

Saved: `public/assets/chapters/wildwood.png`

Prompt: Premium hand-painted side-scrolling fantasy game background panorama 3:1 wide. An ancient woodland road toward a distant fox kingdom, twisted trees and mossy ruins, river glints, distant fox-shaped spires emerging at dawn. Atmospheric layered teal forest, copper leaves, amber horizon, cinematic authored fantasy illustration. Horizontal ground line at 80 percent height. Clear quiet lower foreground, side-on camera, no characters, text, UI or platforms.

### thorn-boar

Saved: `public/assets/chapters/thorn-boar.png`

Prompt: Production game sprite concept, one monstrous armored wild boar facing right in exact side profile, full body centered, strong readable silhouette, tusks and dark slate plated fur, copper thorn accents, grounded believable anatomy. Premium hand-painted 2.5D gothic fantasy, amber rim lighting, nuanced brushwork, not cartoon emoji or toy. Entire animal visible, generous transparent padding. Genuinely transparent alpha background, no floor, no shadow plane, no text, no sheet.

### gloom-hare

Saved: `public/assets/chapters/gloom-hare.png`

Prompt: Production game sprite concept, one eerie long-legged hare monster facing right in exact side profile, full body centered, powerful bent hind legs, tall ragged ears, slate blue fur, pale amber eyes, subtle copper bramble accents. Menacing but non-gory. Premium hand-painted 2.5D gothic fantasy, nuanced brushwork and readable silhouette. Entire animal visible. Genuinely transparent alpha background, no floor or shadow plane, no text, no sheet.

### antler-regent

Saved: `public/assets/chapters/antler-regent.png`

Prompt: Production game boss sprite concept, one huge corrupted antlered stag facing right in exact side profile. Full body including hooves and branching antlers entirely visible. Dark mossy armor grown into blue slate fur, glowing amber fissures and eyes, regal tragic silhouette, powerful heavy legs. Premium hand-painted 2.5D gothic fantasy, cinematic rim light, exquisite restrained materials not plastic. Genuinely transparent alpha background, no scene, floor, shadow plane, text or sheet.

### road-platform

Saved: `public/assets/chapters/road-platform.png`

Prompt: Production game environment asset, a single long horizontal side-view platform of weathered dark slate blocks topped by moss and compact earth, hanging broken stones underneath. Flat level walkable top, width 5 times height, whole platform isolated with generous padding. Premium hand-painted gothic fantasy, cool navy shadow and subtle amber edge light matching a royal prison and ruined forest road. Genuinely transparent alpha background, no scene, text or other objects.

### cistern

Saved: `public/assets/chapters/cistern.png`

Prompt: Premium hand-painted gothic side-scrolling game panorama 3:1 wide. Royal prison drainage cistern, enormous damp blue slate vaults, iron flood gates, quiet black water behind the walkway, moss, restrained amber lamps and pale distant shafts of daylight. Flat horizontal stone walkway precisely at 80 percent image height. Exact side-on camera, no foreground obstructions, no characters, text or UI. Cohesive cinematic navy and gold fantasy painting, tactile stones, atmospheric depth.

### deepwood

Saved: `public/assets/chapters/deepwood.png`

Prompt: Premium hand-painted gothic side-scrolling game panorama 3:1 wide. Deep eerie ancient woodland passage, monumental roots, collapsed royal aqueduct behind the trail, teal mist, cold river and sparse copper leaves, tiny amber wayfinding lanterns. Straight horizontal earth walkway at 80 percent image height. Exact side-on camera, foreground clear for play. No castle or fox statues yet, no characters, no text or UI. Cohesive cinematic navy and gold fantasy painting with restrained lighting.

### rest-lantern

Saved: `public/assets/chapters/rest-lantern.png`

Prompt: A single side-view gothic traveler checkpoint lantern on a short carved stone pedestal, warm gold flame inside aged brass and blue-black iron, delicate fox and feather motif. Full isolated object, premium hand-painted 2.5D fantasy game sprite, subtle material detail and readable at small scale. Genuinely transparent background outside object, NO diffuse halo, no shadow plane, no environment, no text. Portrait silhouette, centered entire object.

### sealed-dispatch

Saved: `public/assets/chapters/sealed-dispatch.png`

Prompt: A single old folded royal letter tied with a dark gold ribbon and a small red wax fox seal, slightly angled front view. Premium hand-painted gothic fantasy collectible sprite, ivory parchment, aged ink edges, realistic restrained materials, readable at small size. Genuinely transparent alpha background, no glow cloud, no shadow plane, no environment, no readable text. Entire object isolated centered.

The selected hare received a background-extraction pass: preserve the creature, remove background and halo, request genuine alpha. Original boar and regent concepts were retained after extracted variants failed alpha validation.
