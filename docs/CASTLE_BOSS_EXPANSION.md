# Continuous castle / first boss

Extends the current 2,560-pixel world to 11,520 pixels; original controls, tuning, intro, pillar and attribution are retained. The enlarged boss arena reaches y=-237 inside a continuous world envelope from -800 to 400.

## Route

Royal galleries → switchback tower → foundry → ruined audience hall → occupied approach → Warden. The critical path is a single readable platform chain. Optional second-layer spaces exist only as short trapped dead ends behind breakable walls. Full-height gates require their preceding floor buttons. Repeated flashing spike platforms occupy risky landing zones; randomized ceiling crushers telegraph before falling from above. Rock overhangs close visual space above deliberately low routes.

## Combat contract

- Pointed robots: unique spike-head sprite/hurtbox; stomp causes player damage, dash/throw defeats them.
- Jumping robots: unique long spring-leg sprite, with physical jumping pursuit.
- Warden: 15 HP, only dash or stomp, 1 damage. Contact must separate between hits; 650 ms hit lock plus bounce grace prevents duplicates and immediate punishment.
- Bomb: every 2 seconds, 1 full heart, radius 55; locked target, 1.3-second marked arc, one damage check per explosion.
- Reinforcements: every 6 seconds, exactly 3 jumping normal robots plus 1 nonjumping pointed robot. No silent caps, despawns, or altered periods.
- Flight: every 10 seconds, slow 3.6-second repositioning phase with continuous interpolation.
- Navigation: connected arena ledge graph, ground approach/launch positions, actual gravity/jump motion, no teleportation.
- Victory: stop attacks, clear encounter entities, reopen arena, reveal a royal command-seal clue without naming the mastermind.

## Runtime ownership

Distant castle enemies disable physics/visual work; fixed trap graphics are redrawn only nearby. Defeated enemies detach update and shutdown listeners. Boss minion colliders are explicitly destroyed on defeat. Bombs and afterimages have bounded lifetimes. Exact reinforcement rules are preserved; prolonged no-kill performance must be monitored rather than capped without permission.

`?qa` exposes local inspection controls only on 127.0.0.1. Traversal replay feeds ordinary player inputs; damage-free soak is explicitly a load test, not evidence of encounter fairness. Neither mode is available on GitHub Pages.

## Generated artwork

Built-in image generation produced `public/assets/gate3/castle-depth.png`, `spike-robot.png`, `jumper-robot.png`, `spike-platform.png`, `royal-banner.png`, `lock-kit.png`, and `rock-pillar-kit.png`.
Prompts: polished hand-painted 3D side-view castle assets matching the supplied robot, masonry and navy/amber castle references; separate spike-head and long-leg jumping robots, flashing forged spike platform, royal duck banner, linked mechanical gate/button, ceiling rock and falling seal pillar; transparent background, no text or watermark.

## Validation status

Automated contract tests cover expanded width, existing floor connection, geometry bounds, pointed-head combat priority, all boss timing schedules, fifteen separated hits, hit lock, and enlarged arena graph connectivity. Build includes TypeScript.

The latest route/art revision was intentionally not manually played or visually reviewed at the user's request. Final local checks: 23 tests, TypeScript, production build and diff whitespace checks pass.

Boss bitmap generation did not produce usable transparency after repeated attempts; those rejected images are not shipped. The boss uses the approved robot texture plus runtime-articulated, shaded metal wings to retain visual consistency.
