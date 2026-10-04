# Animal behavior

This specification covers only the thorn-boar and gloom-hare in the Outside and Crimson chapters. It does not change Level 1, platform geometry, contact damage, player controls, saves, bosses, or other enemy types.

## Shared enemy behavior

Both animal skins use the existing robot health display and hit routes. Outside animals have 1 HP; Crimson animals have 2 HP. Dash and stomp deal 1 damage, while the existing ultimate strike deals 2. Animals gain no new immunity or spike flag. Contact still damages the player, and thrown cake keeps its existing route. The health display follows the enemy, hides while it sleeps, reflects current and maximum HP, and is removed on defeat. Animal HP text sits on the existing bar fill to keep it clear of room captions; robot label placement stays unchanged.

## Thorn-boar

A boar begins stationary for 1,000 ms, with a subtle head-tilt tell during the final 250 ms. It then charges at base 260 px/s in its committed direction, initially left. It stops at its existing patrol limit, on a side wall, or after 700 ms. Each stop reverses the next charge and begins another full stationary pause. Actor time is capped per update; a gap longer than 200 ms returns the boar to a full pause. Sleeping and waking also reset its pause, preventing an offscreen charge from resuming unexpectedly.

## Gloom-hare

When the player is inactive, more than 320 px away horizontally, or more than 220 px away by feet height, the hare uses its original grounded patrol at base 55 px/s and starts no jumps. Near an active player it pursues only within the live bounds of its current enabled support, inset by half its body width plus 12 px and clipped to its original room. It jumps only while grounded, with a 900 ms cooldown and the existing -600 px/s jump velocity. Flat hops use base 100 px/s and stop at support limits.

When the player is at least 16 px above the hare, the hare may commit to an enabled same-room ledge 12–105 px higher, no more than 190 px away, on the player's side. The target must provide a safe landing center and cannot overlap the hare's current body. The selected landing point is the nearest safe point on that ledge to the hare; reachable candidates are ranked by progress toward the player. The hare calculates initial horizontal speed from the 1,471.5 px/s² gravity and 600 px/s jump, then steers toward the committed point at no more than base 210 px/s until landing. If no climb is reachable, it stays within its current support and may use a bounded flat hop. A jump already underway finishes safely if the player moves away. Without a supporting or landing surface, horizontal motion stops.
