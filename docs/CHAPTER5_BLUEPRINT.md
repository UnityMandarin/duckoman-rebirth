# Chapter 5 — The Hollow Prison

Astra owns this design; GPT-6 Luna low implements bounded tasks. Extend the exact local version published in PR32. Preserve existing dirty files and the published backups. Finish with a local preview; do not deploy this new chapter or play it.

## Story and sequence

Crimson's exit now descends into Chapter5. Franklin Fox lies on his side on the stone floor, chained at wrists/ankles to two floor anchors. He remains asleep before and after release and throughout the boss encounter. He is never a target, damageable escort, or forced failure condition.

1. **Chained:** the prison seal drains the sword on first entry/replay. Defeat returning sentries to earn the existing 10 charge per accepted hit. HUD/objective shows charge and the direction back to Franklin. A full ultimate strike within160 horizontal units and90 vertical units of the floor breaks his chains. Dash, stomp, throw and an incomplete meter cannot free him.
2. **Released:** stop sentry waves, destroy remaining sentries without charge reward, break the chain into fading pieces, restore Duckoman to3 HP, save the released checkpoint, and summon the Hollow Warden immediately. A2000ms nonattacking reveal follows the strike, longer than the remaining ultimate animation. Franklin is visibly still asleep. Save stage before cinematic; reload resumes with the chain absent and boss introduction.
3. **Cleared:** Warden defeat opens the eastern exit. Save boss defeated immediately. Crossing the exit completes Chapter5; show a brief ending with Franklin asleep and MENU/REPLAY controls. No Chapter6.

## Geometry and scene architecture

Dedicated `RescueScene` key `rescue`; do not add rescue to ChapterKind or stretch JourneyScene's three chapter tables. Reuse Player, InputController, ThrowableObject, InteractionSystem, ChapterHud, SceneLayerRouter, common sprite/frame loading and existing movement/combat semantics.

World width2000, continuous floor top360; player spawn(180,340). Franklin center x540, bottom360, visible width150 preserving alpha-bbox aspect. Platforms: x260/y276/w180/h32 and x960/y276/w200/h32 (tops260), x1450/y266/w200/h32 (top250). Painted cistern background follows existing JourneyScene floor alignment; reused road-platform art aligns with collision tops. A seal at x1180 blocks east until chain release; remove its collider/art on release.

Use only2 new PNGs: franklin-asleep and hollow-warden. Render each using a texture frame from its recorded visible alpha>=16 bbox, preserving file bytes. Inclusive frames: Franklin [95,168,1682,737] (1588×570), guardian [250,43,812,1485] (563×1443). Very faint alpha<16 stray pixels must not set their size or floor alignment. Chains, shackles, portal rings, attack warnings, sonic beam and noise pulses are small reusable Phaser graphics. No image background boxes, shaders, runaway particle emitters, accumulating timers or unbounded enemy/event objects.

Camera initially follows player as existing chapters. At release temporarily stop follow, pan to(680,200) over700ms to frame Franklin/player and guardian x790, then resume follow after reveal. Player can reposition after the standard ultimate ends; guardian cannot damage during introduction. Single attack schedule, no overlapping unrelated attacks.

## Charge waves

Four authored waves cycle only while chained and charge<100; maximum3 pending/live enemies. BasicEnemy HP1 and existing visible health bars. Coordinates below are feetY; constructor y=feetY-25 preserves its existing size/offset semantics. Patrols must remain on their supporting surface, with existing enemyPatrolBounds.

| Wave | Spawn x / feetY / type / patrol half-width |
| --- | --- |
| Ground watch | 780/360/normal/90; 1010/360/normal/50 |
| High and low | 240/260/normal/40; 760/360/jumper/60; 1000/360/pointed/50 |
| Crossing watch | 180/360/normal/50; 660/360/pointed/50; 950/260/normal/40 |
| Last watch | 380/360/jumper/50; 880/360/normal/90 |

Wave completion restores half a heart (cap3), then wait900ms before next wave. When full, stop new spawns and prompt U beside Franklin. If U was used away from him, the next wave resumes; there is no finite-enemy softlock. Save chained-stage charge when it changes, not every frame. After death restore saved charge and3 HP; start a fresh wave without preserving half-killed enemies. After release, boss retries start3 HP/0charge and never require another grind.

Every spawn has a700ms visible arrival cue and disabled collision/attack. At both cue and activation it must be at least140 units from player. Unsafe proposed spawns fall back to the farther ground location160 or1070. If player approaches the warned point, relocate and restart the700ms cue; never activate on top of player. Pending enemies count toward the3 limit.

Because waves can continue indefinitely, BasicEnemy must unsubscribe both POST_UPDATE and ultimate-strike listeners, including its shutdown callback, on defeat; perform the same cleanup on shutdown. Preserve existing damage/charge behavior in other levels.

## Hollow Warden

Original painted thin dark guardian: full visible height240 (=4×Duckoman's60), narrow torso, extremely long arms, long legs, small masked head, hollow cyan ribs and purple portal accents. Keep sprite feet at360; flip toward locked attack direction. 32 HP; second phase at<=16. Aerial ribs weak region x±26/y180..270. During gold recovery: jump+K into ribs deals2 and earns10 ultimate charge; nearby U deals8 (horizontal<=210, vertical distance from ribs220<=160). Accepted-hit cooldown450ms. No stomp or thrown damage. No damaging idle body contact or teleport collision; danger exists in the displayed attack shapes. Dash can pass through attack shapes safely; standard player damage invulnerability remains2s.

Inspired by the Warden's sound seeking/sonic attack and Enderman's slender teleports, translated into this game's controls rather than an exact Minecraft simulation. Primary references: [Meet the Warden](https://www.minecraft.net/en-us/article/meet-warden), [Warden ranged attack](https://www.minecraft.net/en-us/article/minecraft-snapshot-22w15a), [Enderman](https://www.minecraft.net/en-us/article/enderman).

### Sensing

Boss listens to movement, dash/jump/slam/ultimate and thrown cake landing. Ordinary moving feet emit a pulse at most every450ms; jump/dash/throw/ultimate emit on accepted input/action. Standing still or holdingS is quiet. Landing cake updates last-heard x so J can distract while player stays quiet. In listen phase only, approach last-heard x at85 units/s; do not continuously aim through silence. After2000ms without noise, a visible sniff pulse samples player x once. HUD HEARD/QUIET makes sensing readable. Windup aims freeze at phase entry.

### Ordered state machine

Use pure tested rules/controller with elapsed delta capped50ms per tick; pause/hidden/dead do not advance, and one transition per tick prevents lag or tab return skipping a warning. Current warning duration is fixed at entry; crossing16HP does not retroactively shorten it. Introduction2000ms -> listen700ms (phase2:550) -> attacks in repeating claw, sonic, portal order. All enter recovery, then next listen.

| Attack | Cue | Active | Recovery |
| --- | --- | --- | --- |
| Claw |900ms (phase2:800), lock direction |240ms, low sweep toward that direction: x+[0..220], y300..360, .5 damage once |1000ms (phase2:900) |
| Sonic |1000ms (phase2:900), lock line from ribs(x,220) through player center; thin cyan warning across arena |180ms, thickness16,1 damage once, piercing terrain |1300ms (phase2:1150) |
| Portal |1100ms (phase2:1000), source and destination glow |transfer220ms with no damage; then new800ms claw cue;240ms sweep |1150ms |

Phase2 sonic fires a second independently aimed900ms cue/180ms beam before recovery. Phase2 portal first shows one grey non-damaging feint600ms, then the full real cue above. At most3 portal graphics; their rings never cause damage. Recovery ribs turn gold with a clear STRIKE indication.

Portal anchors320/960/1640. Choose the farthest eligible anchor from current boss x, tie to lower x: >=220 from player, >=160 from boss, inside arena bounds100..1900. Lock destination during cue. Recheck before transfer: if player came within220, choose another safe anchor, redraw the real cue and restart its complete duration. No instant relocation or unannounced strike. Transfer places feet on the continuous floor; no tracking after the800ms arrival claw cue begins.

Pure helpers must expose safe portal choice, locked attack shapes, beam/rectangle collision, vulnerability/damage gates and phase progression for meaningful tests. Presentation uses those same helpers.

## Persistence and integration

Keep localStorage key duckoman.progress.v1. Schema4 adds fifth scene `rescue`; reuse ChapterProgress shape. Rescue checkpoints[0,180,540]; opened flag0 means Franklin released; bossDefeated means guardian defeated. No secrets/discoveries in this chapter. Fresh first/replay checkpoint0 -> force charge0 and save checkpoint180. Released save uses checkpoint540/charge0/opened[0]. During boss retries never persist farmed boss charge. After boss defeat persist bossDefeated before exit. Final exit sets rescue completed/ended=true/currentScene=rescue; resetChapter replay resets rescue flags/charge while retaining existing records.

Migration versions1/2/3 must preserve all old chapters, discoveries/trials/routes; initialize rescue empty. If old save has crimson completed, unlock rescue and clear old ended flag; old currentScene stays where it was so replay choice remains. Reject version4 records missing rescue and invalid rescue checkpoints/flags, unknown versions or unknown scenes. Extend validation iteration without casting rescue to ChapterKind. Versions1/2 retain their existing migration rules; versions3/4 retain routes. All preview/cheat persistence guards continue to apply.

Crimson exit marks completed/unlocks rescue/currentScene=rescue with ended=false and fades into RescueScene; never replays the Crab or shows the old campaign ending. Keep already-existing completed Crimson state compatible. Boot DEV query chapter=rescue is isolated; add boss=1 preview only when DEV/localhost/devPreview, setting released state ephemeral and player spawn540. Debug level select gets Hollow Prison and Hollow Prison · Warden entries with devPreview; neither writes real progress. Scene does not bypass locks on normal Menu starts.

Menu has5 equal cards: centers64+128*i, panel116×190 center y153; art106×76; wrap104; Continue/Replay centers±26 with widths47, card-only font7px/padding2px so CONTINUE fits; focus120×194; keyboard wraps cards.length. Fifth card Hollow Prison uses new preloaded menu-cistern environmental image and status FRANKLIN: CHAINED/RELEASED/SAVED, existing chained-lock on locked chapter. Do not redesign practice/gallery/journal or add new boss trials this task.

## Acceptance

Test migrations including a completed version3 Crimson ending; charge drain only first entry/replay; reload/death before/after release; impossible release without a real full ultimate near Franklin; wasted ultimate can recharge; bounded safe waves; saved release skips grind on boss retry; boss pause/long-frame warnings; portal safety before and after cue; one attack at a time; locked beam geometry; phase2 second warning; damage only gold recovery; chapter progression/ending/replay and preview isolation. Build/tests and actual rendered assets/initial scene must be verified; gameplay feel remains owner playtest. Leave localhost accessible.
