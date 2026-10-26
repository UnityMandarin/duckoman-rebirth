# Late chapter route design review

## Authored route overview

| Chapter | Rooms | Authored steps per room | Required route links | Distinct route signatures | Net vertical travel |
| --- | ---: | ---: | ---: | ---: | ---: |
| Stormworks Citadel | 12 | 10 | 132 | 12 | 0 units; rooms return to entry height |
| Crown Edge | 12 | 7, with one 10-step expert route | 87 | 11 | 5,540 units upward |

Signatures compare each room's actual ordered horizontal displacement, height change, and platform widths. No room layout signature repeats more than twice. Both chapters remain 17,280 units long, with entry levels aligned and the existing checkpoint every two rooms.

Stormworks varies its elevation profile across all twelve rooms and mixes lifts, counterflow belts, presses, ferries, and wide robot islands. Crown Edge mixes gentler ramps, long crossings, a full switchback route, and controlled drops in rooms 4, 7, and 10 (zero-based room indices 3, 6, and 9). Those drops are followed by continued ascent; the chapter climbs 5,540 units overall and introduces no story ending, Warden access, clone/AI, or Albert laboratory material.

The fixed room width and aligned entry/exit contract are preserved. The existing camera remains bounded to chapter geometry and follows the player; no predictive camera behavior was added. The three Crown Edge drops should receive a specific framing check during later gameplay review because the existing follow camera can track a player moving down before the next rise.

## Route model results

The focused `lateChapters.test.ts` suite passes all 9 tests, and `lateAtmosphere.test.ts` passes both coverage checks for Crown Edge’s new vertical range. It checks every mandatory edge with the full room's authored solids at 30, 60, and 120 fps; there are no unreachable mandatory links. The existing moving lift/ferry checks retain 120 starting phases per cycle, collision checks, and the 200 ms landing recovery requirement, and require at least 300 ms of repeatable departure opportunity. Conveyor tests retain capped 50 ms drift, full landing recovery, and dash cooldown checks. Paired shutter scheduling remains covered with the unchanged warning and collision timings.

At 60 fps, the route-option scan found 12 Stormworks dash-only links and 3 Crown Edge dash-only links. The switchback route's dash-only links occur at edges 4, 6, and 8, with permanent platforms between them. The current checks verify link options and dash cooldown behavior, but they do not yet produce one composed timing schedule across every late-chapter machine. No movement tuning or optional relics are needed by the route witnesses.

## Gameplay review still needed

The route model establishes geometric reachability and timing windows, not fun or fairness in live play. The three Crown Edge drops and the switchback section need direct play review for camera framing, readable landings, and pacing. No playtest or visual review is claimed here.
