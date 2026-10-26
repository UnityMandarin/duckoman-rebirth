# Adventure startup integration review

This review covers startup placement anchors and nearby progression safeguards for the authored adventure additions.

## Placement coverage

`tests/adventureStartupReview.test.ts` calls `resolveAdventurePlacementPlan` for all seven campaign scenes. The director consumes this same Phaser-free plan for the authored NPCs and every device lever/relay, so the check exercises actual support lookup and hazard rejection against the room, encounter, castle, and late-chapter data. It checks expected device identifiers as well as finite support coordinates.

Outside's Nella anchor is Bell Orchard (`OUTSIDE_ROOMS[4]`), step 4. Her pump valve and relay use the same room's step 1. Stormworks' relay uses the wider authored step 3; Crown Edge beacon relays use bounded offsets on authored supports. The placements stay subject to the existing enemy, moving-platform, edge-clearance, and hazard checks.

## Adjacent safeguards

The existing `adventureProgressReview.test.ts` checks that preview, infinite-health, and ineligible runs cannot persist campaign data. Franklin is not part of the `AdventureDirector` cast; rescue interaction remains in the boss scene. Review boss-state gating there before changing any rescue dialogue or completion flow.

The Warden preservation and universal ultimate suites are existing guardrails for Warden access and ultimate behavior. This startup review does not modify those systems.

## Verification record

Focused startup test: passed (`tests/adventureStartupReview.test.ts` and `tests/adventure.test.ts`, 9 tests). The full repository run passed 81 test files and 566 tests; the production build and type check passed. Browser startup checks covered gate-1, jail, outside, crimson, rescue, stormworks, and crown-edge. Runtime checks first found invalid stormworks and Crown Edge relay placements; the shared plan was corrected and fresh pages for both late chapters now show their QA status and authored level art without console errors. Movement responded in each route sampled. The full chapter routes and powered-crossing physics were not exhaustively played through.
