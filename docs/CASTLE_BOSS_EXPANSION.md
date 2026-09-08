# Continuous castle / first boss

Extends the current 2,560-pixel world to 10,240 pixels; original geometry, controls, tuning, intro, pillar and attribution are retained. New world reaches y=-267, within a continuous camera/world envelope from -520 to 400. No scene transitions or camera resets between areas.

## Route

Royal galleries → switchback tower → foundry → ruined audience hall → occupied approach → Warden. Upper routes reconnect to recoverable ground routes. Masonry buttresses make elevation changes necessary; fractured amber masonry breaks on dash or thrown cake. Brass floor buttons raise linked gates. Trap markings warn for 800 ms before spikes or descending presses activate. Short moving story captions reveal Duckoman's former kingship without identifying the mastermind.

## Combat contract

- Pointed robots: extended pointed silhouette/hurtbox; stomp causes player damage, dash/throw defeats them. Existing normal robot rules unchanged.
- Warden: 15 HP, only dash or stomp, 1 damage. Contact must separate between hits; 650 ms hit lock plus bounce grace prevents duplicates and immediate punishment.
- Bomb: every 2 seconds, 1 full heart, radius 55; locked target, 1.3-second marked arc, one damage check per explosion.
- Reinforcements: every 6 seconds, exactly 3 jumping normal robots plus 1 nonjumping pointed robot. No silent caps, despawns, or altered periods.
- Flight: every 10 seconds, 2.4-second repositioning phase. Boss stays near the player horizontally.
- Navigation: connected arena ledge graph, ground approach/launch positions, actual gravity/jump motion, no teleportation.
- Victory: stop attacks, clear encounter entities, reopen arena, reveal a royal command-seal clue without naming the mastermind.

## Runtime ownership

Distant castle enemies disable physics/visual work; fixed trap graphics are redrawn only nearby. Defeated enemies detach update and shutdown listeners. Boss minion colliders are explicitly destroyed on defeat. Bombs and afterimages have bounded lifetimes. Exact reinforcement rules are preserved; prolonged no-kill performance must be monitored rather than capped without permission.

`?qa` exposes local inspection controls only on 127.0.0.1. Traversal replay feeds ordinary player inputs; damage-free soak is explicitly a load test, not evidence of encounter fairness. Neither mode is available on GitHub Pages.

## Generated artwork

Built-in image generation produced `public/assets/gate3/castle-depth.png`.
Prompt: create a new 3:1 panoramic continuation matching the existing dark navy stone, restrained amber lighting and painterly 3D materials; one connected ruined royal castle through galleries, shafts, balconies, robot machinery and vaulted command hall; distinct architecture, no characters, UI, text or foreground platforms. The existing panorama is the style reference. Runtime crop strips blend the original into the continuation.

## Validation status

Automated contract tests cover exact width, existing floor connection, geometry bounds, pointed-head combat priority, all boss timing schedules, fifteen separated hits, hit lock, and arena graph connectivity. Build includes TypeScript.

Runtime inspection covered gallery, tower, boss entry, HUD and console. An ordinary-input continuous replay reached x=6466 before dying to damage, with no console error. A damage-free physics replay then traversed continuously from x=80 through the pillar and castle to x=10170, registering an actual boss hit. This verifies traversal, not survival difficulty. The arena soak retained 40 live reinforcements at approximately 120 FPS with no console errors. A stationary target on the highest ledge was reached by jumping robots in the live runtime. A controlled one-HP final-stomp probe verified victory, boss removal and the final story clue. Normal damage-driven death followed by a short D press restored three hearts and original spawn without replaying the intro; this test found and repaired dropped short reset-key taps. Final local checks: 23 tests, TypeScript, production build and diff whitespace checks pass. Human survival difficulty and encounter readability await playtest approval; these tests do not establish a no-assistance boss victory.

Boss bitmap generation did not produce usable transparency after repeated attempts; those rejected images are not shipped. The boss uses the approved robot texture plus runtime-articulated, shaded metal wings to retain visual consistency.
