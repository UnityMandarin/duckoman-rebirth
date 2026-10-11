import {describe,it,expect} from 'vitest';
import {createRegentState,damageRegent,tickRegent,REGENT_RULES,REGENT_PHASE_TWO_SEQUENCE,regentChargeBounds,regentSweepBounds,regentRootBounds,regentWaveBounds,regentRootAnchors,resumeRegentCue,regentCameraZoom} from '../src/systems/AntlerRegentRules';
const snapshot={bossX:900,playerX:700,arenaLeft:0,arenaRight:2500};
function advanceTo(state:ReturnType<typeof createRegentState>,phase:string){let s=state;for(let i=0;i<600&&s.phase!==phase;i++)s=tickRegent(s,50,snapshot);return s;}
describe('Antler Regent deterministic encounter rules',()=>{
 it('triggers Royal Fury exactly once at five HP and begins its authored chain at charge',()=>{
  const phaseTwo=damageRegent(createRegentState(),5);expect(phaseTwo.phase).toBe('roar');expect(phaseTwo.phaseTwo).toBe(true);expect(phaseTwo.sequenceIndex).toBe(0);expect(phaseTwo.durationMs).toBe(1200);
  const after=damageRegent({...phaseTwo,phase:'idle',elapsedMs:0,durationMs:0},1);expect(after.phase).toBe('stagger');expect(after.phaseTwo).toBe(true);expect(damageRegent(after,0)).toEqual(after);
 });
 it('never skips a cue and gives equivalent attack order at 30, 60 and 120 updates per second',()=>{
  const run=(hz:number)=>{let s=createRegentState(10,0);const edges:string[]=[];let prev='';for(let i=0;i<hz*24;i++){s=tickRegent(s,1000/hz,snapshot);if(s.phase!==prev){edges.push(s.phase);prev=s.phase;}}return edges;};
  const a=run(30),b=run(60),c=run(120);for(const edges of [a,b,c]){expect(edges).toContain('charge-cue');expect(edges).toContain('charge-active');expect(edges).toContain('sweep-cue');expect(edges).toContain('slam-cue');expect(edges).toContain('thorn-cue');}
  expect(a.slice(0,15)).toEqual(b.slice(0,15));expect(b.slice(0,15)).toEqual(c.slice(0,15));
 });
 it('interrupts hazards on hit, resumes active moves with a full readable cue, and freezes on gaps',()=>{
  const active=advanceTo(createRegentState(10,0),'charge-active');const resumed=resumeRegentCue(active);expect(resumed.phase).toBe('charge-cue');expect(resumed.elapsedMs).toBe(0);expect(resumed.durationMs).toBe(REGENT_RULES.chargeCueMs);
  const paused=tickRegent(active,500,{...snapshot,paused:true});expect(paused.phase).toBe(active.phase);expect(paused.elapsedMs).toBe(active.elapsedMs);
  const stagger=damageRegent(active,1);expect(stagger.phase).toBe('stagger');expect(stagger.activeRoots).toEqual([]);
 });
 it('keeps lane hazards inside the authored arena and leaves broad clear root lanes',()=>{
  const a=regentRootAnchors(1000,3480,0),b=regentRootAnchors(1000,3480,1);expect(a.length).toBeGreaterThan(0);expect(b.length).toBeGreaterThan(0);expect(new Set([...a,...b]).size).toBe(a.length+b.length);expect([...a,...b].every(x=>x>=1300&&x<=3280)).toBe(true);
  for(const x of [...a,...b]){const r=regentRootBounds(x);expect(r.right-r.left).toBe(52);expect(r.bottom-r.top).toBe(80);}
  const sweep=regentSweepBounds(800,1);expect(sweep.top).toBe(296);expect(sweep.bottom).toBe(360);const charge=regentChargeBounds(800,1,0,2500);expect(charge.top).toBe(296);expect(charge.bottom).toBe(360);const wave=regentWaveBounds(500,1);expect(wave.right-wave.left).toBe(64);expect(wave.bottom-wave.top).toBe(24);
 });
 it('clamps camera framing and preserves the visible sweep as a low, jumpable band',()=>{expect(regentCameraZoom(100)).toBe(.68);expect(regentCameraZoom(3000,2480)).toBeCloseTo(640/2480);expect(REGENT_RULES.waveWidth/REGENT_RULES.waveSpeed*1000).toBeCloseTo(267,0);});
 it('uses fixed phase-two combos and recovers only after each whole combo',()=>{expect(REGENT_PHASE_TWO_SEQUENCE).toEqual(['charge','sweep','slam','thorns','charge','thorns','sweep']);let s=damageRegent(createRegentState(10,0),5);s={...s,phase:'idle',elapsedMs:0,durationMs:0};const edges:string[]=[];let previous='';for(let i=0;i<1500&&edges.filter(edge=>edge==='recovery').length<2;i++){s=tickRegent(s,50,snapshot);if(s.phase!==previous){edges.push(s.phase);previous=s.phase;}}const phase2=edges.slice(edges.indexOf('charge-cue'));expect(phase2.slice(0,14)).toEqual(['charge-cue','charge-active','charge-brake','sweep-cue','sweep-active','recovery','idle','slam-cue','slam-air','slam-pulse','slam-waves','thorn-cue','thorn-active','thorn-withdraw']);expect(phase2.filter(edge=>edge==='recovery')).toHaveLength(2);});
 it('retains the same thorn lanes through a lifecycle re-cue and clamps a sweep to arena bounds',()=>{let s=damageRegent(createRegentState(10,0),5);s={...s,phase:'idle',elapsedMs:0,durationMs:0};s=advanceTo(s,'thorn-active');const anchors=[...s.activeRoots],parity=s.rootParity,resumed=resumeRegentCue(s);expect(resumed.phase).toBe('thorn-cue');expect(resumed.activeRoots).toEqual(anchors);expect(resumed.rootParity).toBe(parity);const sweep=regentSweepBounds(10,-1,0,2500);expect(sweep.left).toBe(0);expect(sweep.right).toBe(10);});
});
