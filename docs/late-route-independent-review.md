# Independent late route acceptance review

## Result

The authored late routes pass the focused route suite. This review added composed timing checks for the two-segment shutter chains in Crown Edge, a three-edge lift approach/ride/departure chain, a press room route through the deterministic fall and impact windows, and a conveyor approach/ride/departure chain with capped drift. The checks carry arrival time and dash-ready time between edges, retain the 200 ms landing recovery, and use the existing full-solid `furnaceJumpOptions` trajectory witnesses.

The shutter checks follow `ChapterTraps.updateDisappearingRoom`: each authored shutter gets its warning, gone, and recovery interval in order. They only wait on a shutter while it stays collision-enabled. The lift check uses the runtime 950 ms sine clock and 65-unit travel amplitude, including movement during flight and the 200 ms ride recovery. It checks seven starting phases over one full platform cycle. The press check uses its configured room start, 650 ms warning, 240 ms fall, 500 ms impact, 650 ms return, and chapter-scaled idle cadence. The conveyor check applies the runtime 50 ms delta cap to each grounded drift step, carries its accumulated position and dash cooldown through the adjacent links, and confirms support through recovery. No geometry or tuning was changed.

The focused `lateChapters.test.ts` run passes all 14 tests. This is route-model evidence, not a live-play or visual camera review. The full-course compositions cover representative rooms and machine chains; per-edge launch-window checks still cover moving lifts/ferries at 30, 60, and 120 fps and preserve the 300 ms launch and 200 ms landing thresholds.

## Crown Edge drops and camera framing

The three authored down-steps are in zero-based rooms 3, 6, and 9: Pendulum Court, Needleworks, and Last Counterweight. Each is a 40-unit descent from the preceding platform followed by an 80-unit ascent. A focused assertion checks those offsets against the scene's 400-unit-high simulation viewport and 86-unit vertical camera deadzone. The scene uses its regular player-follow camera. Thus the authored 40-unit drop itself stays within the camera deadzone and the next platform is within the viewport's vertical span. This is a geometric framing check; no visual inspection or gameplay claim is made.

## Scope and remaining evidence boundary

This review did not alter scenes, physics, progression, or entities. It did not run the full test suite or a build. The press composition checks the authored room-entry clock phase; exhaustive composition across all press start phases and all rooms is not claimed. Live play should still confirm whether the drops and switchback pacing read clearly.
