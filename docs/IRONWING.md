# IronWing encounter

HUD revision: separate camera keeps player hearts and stamina at the upper left through arena zoom; the boss has a purple mechanical bar at upper right. Health and stamina numbers are omitted. The sword meter charges 10 points per player robot kill, 50 for IronWing, caps at 100, and U consumes it for an invincible 900ms draw-and-swing animation dealing 4 damage to nearby targets once. Bomb damage is 0.5 heart; boss contact remains 0.5. Boss HP is 10; regular robots die in one hit.

The approved button, bomb, and eye concepts are shipped as ironwing-button.png, ironwing-bomb.png and ironwing-eye.png in public/assets/gate3. Built-in image generation extracted each concept with the prompt: preserve the concept design, remove all backdrop/floor, actual transparent alpha background, no outside shadow, centered game sprite.

Robots face their actual horizontal velocity, including navigation-driven jumps. IronWing charges for two seconds while stationary before each reinforcement wave; the first charge starts at ten seconds and the first wave arrives at twelve seconds.

Defeat removes the encounter HUD, explodes the armor into falling gears, and drops a physical core eye. Touch the eye to pick it up, then press J or click it to activate. Activation explodes the eye, locks gameplay, fades to black, holds full darkness for two seconds, and enters Duckoman's locked jail cell. The jail retains movement controls. Duckoman expresses surprise at IronWing's presence.

Pillar warnings use dotted red vertical guides ending at a width-matched ground line. Guides disappear before strikes.

Art: public/assets/gate3/royal-hall.png is the user-supplied first image. public/assets/gate3/jail-cell.png was produced with the built-in image generation tool. Prompt: cinematic eerie gothic royal jail cell, inspired by supplied barred reference; 3:1 side-view, navy moonlit stone, enormous iron bars, hanging chains, sparse amber candles, damp floor, oppressive shadows and low mist; inside one locked cell, clear central walking area, painterly detailed 3D materials, no characters, text or HUD.

Verification: automated tests and TypeScript/production build only. No gameplay performed.
