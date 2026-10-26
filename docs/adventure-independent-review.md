# Independent adventure integration review

## Verified paths

- The focused rule and progression regressions pass: `tests/adventure.test.ts` and `tests/adventureProgressReview.test.ts` (11 tests total).
- In the local development preview, physical keyboard input at the pump valve changed QA telemetry from `pump=dry, bridgeBody=false` to `pump=restored, bridgeBody=true`. The preview was marked `preview=true`.
- The thrown-cake relay route also worked with real input. Moving Duckoman to collect the cake, lining up toward the relay, and pressing J changed telemetry to `pump=restored, relayHits=1, bridgeBody=true, preview=true`. The restored bridge rendered and became active.
- Authored NPC support placement is visible in the rendered chapter. At Nella's support, the player and NPC stand on their authored platforms at matching foot heights. A real F press within range opened the conversation state (`talk=nella:1`).
- The Nella dialogue card now renders its text. Real F advanced from the first line to the second; Escape dismissed the card without opening the menu; subsequent D input moved the player, confirming physics resumed.
- Stormworks preview starts with `devices=stormworks-signal:off` and a visible `F · OPERATE` prompt. Real F changed QA telemetry to `devices=stormworks-signal:on`.

The powered Stormworks shortcut was not independently traversed. Its relay activation state was observed; the later view reset during the live development session, so this review does not claim persistence across restart.

## Save and story contracts reviewed

- New story flags and known-person identifiers are schema-validated, deduplicated, and filtered. The version 1–6 migration regression preserves prior chapter, route, and trial data while adding empty story collections where absent.
- Chapter writes preserve independent story flags and known-person records. The campaign persistence gate rejects preview, infinite-health, and otherwise ineligible runs.
- Completing Crown's Edge marks the chapter complete and keeps `ended=false`; it unlocks no chapter beyond the seven authored chapters.
- The adventure dialogue keeps the Franklin rescue and Meese border invitation as separate beats. The current Chapter 1–7 dialogue does not disclose the AI, Albert, or clone secret.
- Current menu/debug routing has no Hollow Warden access path; its standalone rules code remains unused by the adventure scenes.

## Scope

This review used the two focused Vitest files above and a browser run in local preview mode. It did not run the full suite or build. Story persistence was checked through source contracts and targeted tests; physical interaction was exercised only in preview mode so campaign saves were ineligible.
