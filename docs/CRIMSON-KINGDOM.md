# Level 4: Franklin’s occupied kingdom

Defeating the Broken Regent and crossing the forest exit now starts the Crimson Kingdom. Duckoman discovers that Franklin Fox was captured beneath his own palace. Franklin is mentioned in dialogue and dispatches; no fox character appears.

The chapter spans 17,280 world units (12 sections), exactly 1.5 times the original kingdom’s 11,520 units. Ten traversal sections lead into a two-section crab arena. The encounter pressure multiplier is 1.65, versus the forest’s 1.5: robots move 10% faster and timed trap warnings scale accordingly. This is a tuning target, not a measured claim about subjective difficulty. Every crimson robot has 2 HP; ordinary hits deal one and ultimate strikes deal two. Four checkpoints include the boss approach. Secret dispatches supply story and ultimate charge.

The Crimson Claw has 20 HP. Dash deals one damage; ultimate deals four. Stomps and thrown objects cannot hurt its shell. Its independent pillar clock starts four simultaneous, fixed-position warnings every 3,000 ms. Warnings last 700 ms before a 220 ms fall; pillars clear at 1,500 ms, leaving escape gaps. The crab telegraphs its claw swing for 800 ms, swings for 450 ms, charges for 700 ms, and rests for 1,100 ms. Hits do not delay pillar volleys. Boss death clears hazards and opens the palace gate; checkpoints preserve that victory on retry.

The existing painted scenery planes, contact shadows, controls, and platform physics are retained. Crimson tinting, stained ground, red robots, hanging banners and foreground pillars establish the occupied kingdom. The crab uses a new transparent painted atlas with separate animated claws.

## Validation

- `npm test`: 52 tests pass, including crimson length, pressure ratio, encounter-repeat cap, platform reachability and seams, checkpoints, shell rules and pillar escape gaps.
- `npm run build`: passes; existing large bundle warning remains.
- Local Chrome runtime checks: all 28 robots start at 2 HP, two separate hits defeat one while repeated overlap does not; crab starts at 20 HP, four pillars appear together, dash/ultimate decrement HP, death clears pillars and opens the gate, victory survives scene restart, and forest exit starts crimson. No uncaught browser errors.
- Painted start, boss wind-up and pillar-warning screenshots inspected.
- Subjective play feel and full unassisted completion remain for owner playtest.

Local previews: `?chapter=crimson`, `?chapter=crimson&boss`. The existing chapter preview is localhost-only. `&qa` enables an opt-in development-only browser test bridge; it is removed by the production build.

## New art

Built-in image generation produced `public/assets/chapters/crimson-crab.png`. Prompt: transparent modular sprite atlas for a painted 2.5D dark fantasy side-scroller; worn red enamel crab robot body with six mechanical legs, black iron joints, brass rivets, orange eyes and crimson stains; separate open pincer and forearm; strong silhouette, textured paint and modeled lighting; no fox, text or scenery. Follow-up prompt preserved the design and separated body and claw for rectangular atlas frames. Generated alpha is preserved. Frames are defined in `CrabBoss.ts`.
