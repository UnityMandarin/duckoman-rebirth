# Duckoman Rebirth chapters 1–7 overhaul

## Changes

- Stormworks Citadel and Crown’s Edge now have authored, varied twelve-room routes. Both remain 17,280 units long with two-room checkpoints. Stormworks uses ten traversal steps per room; Crown’s Edge varies its step count, includes three controlled descents, and continues upward overall.
- Adventure conversations and optional devices now connect the existing chapters: the jail captive route, outside pump and bridge, crimson freight bypass, Franklin rescue, Stormworks signal, and Crown Edge beacons. A shared Phaser-free placement plan resolves NPCs and every lever/relay to authored, hazard-checked supports before the director builds them.
- Story flags and known people are validated and migrated in campaign progress. Preview and ineligible runs remain nonpersistent. Chapter replay stays chapter-specific, and completing Crown’s Edge does not end the campaign or unlock an eighth chapter.
- Player and enemy presentation uses bounded cosmetic animation and pooled dash afterimages; it preserves combat hitboxes and ultimate behavior. Menu chapter cards expose continue/replay state for all seven chapters.

## Story boundaries

These additions keep the existing story direction. Chapter 7 ends with a Meese border invitation and an open road. It does not present a final ending. The AI, Albert, and clone material stays unrevealed, and the Hollow Warden remains preserved for later use without a campaign, menu, URL, or debug access path. Franklin’s rescue and the Meese invitation remain separate story beats.

## Art provenance

`public/assets/adventure/npc-atlas.png` is an original generated six-character atlas for Nella, Pippit, Tamsin, Bramble, Orrin, and Rune. The runtime registers cropped character frames from its 3-by-2, 512-pixel cells. The chapters reuse existing world, identity, and machinery art; no third-party NPC pack was added.

## Review and verification

Ten scoped Luna Low workstreams were reviewed in staged groups of no more than three. The full test run passed 566 tests across 81 files. TypeScript checking and the Vite production build passed; Vite reported an advisory that the minified JavaScript chunk is about 1.86 MB, above its 500 kB warning threshold.

Browser checks opened all seven chapter routes and confirmed visible scene art, startup telemetry, and basic movement. The Stormworks signal was activated in preview and its powered crossing art appeared. The powered crossing was not traversed, and a complete human playthrough, late-route pacing, and all camera transitions are still unverified. Preview interaction was used for runtime checks so campaign saves were ineligible.
