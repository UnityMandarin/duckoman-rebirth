import { describe, expect, it, vi } from 'vitest';

vi.mock('phaser', () => ({ default: {
  Scenes: { Events: { SHUTDOWN: 'shutdown', PAUSE: 'pause', RESUME: 'resume', POST_UPDATE:'postupdate' } },
  Math: { Clamp: (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n)) },
} }));

import { FranklinFox } from '../src/entities/FranklinFox';
import { FRANKLIN_POSES } from '../src/systems/FranklinPresentation';
import { createFranklinController, FRANKLIN_VISUAL } from '../src/systems/FranklinFireFoxRules';
vi.stubGlobal('document', { visibilityState: 'visible', addEventListener: vi.fn(), removeEventListener: vi.fn() });

class Display {
  x = 0; y = 0; width = 0; height = 0; visible = true; rotation = 0; flipX = false; text = ''; destroyed = false;
  alpha = 1; texture = ''; frame = ''; originX = 0.5; originY = 0.5;
  setOrigin(x: number, y = x) { this.originX = x; this.originY = y; return this; } setDisplaySize(w: number, h: number) { this.width = w; this.height = h; return this; }
  getBounds(){return {left:this.x-this.width*this.originX,right:this.x+this.width*(1-this.originX),top:this.y-this.height*this.originY,bottom:this.y+this.height*(1-this.originY)};}
  setDepth() { return this; } setScrollFactor() { return this; } setPosition(x: number, y: number) { this.x = x; this.y = y; return this; }
  setY(y: number) { this.y = y; return this; } setRotation(r: number) { this.rotation = r; return this; }
  setFlipX(v: boolean) { this.flipX = v; return this; } setVisible(v: boolean) { this.visible = v; return this; }
  setTexture(texture:string,frame:string) {this.texture=texture;this.frame=frame;return this;}
  setAlpha(v:number) { this.alpha=v; return this; }
  setText(v: string) { this.text = v; return this; } clearTint() { return this; } destroy() { this.destroyed = true; return this; }
  cropWidth=0;setCrop(_x:number,_y:number,w:number,_h:number){this.cropWidth=w;return this;}
  setSize(w: number, h: number) { this.width = w; this.height = h; return this; }
}
class Graphics extends Display {
  clear() { return this; } fillStyle() { return this; } fillCircle() { return this; } fillRect() { return this; }
  fillRoundedRect() { return this; } lineStyle() { return this; } lineBetween() { return this; } strokeRect() { return this; }
  strokeRoundedRect() { return this; } strokeCircle() {return this;}
}
class Events {
  handlers = new Map<string, Set<(...args: any[]) => void>>();
  on(name: string, fn: (...args: any[]) => void) { const set = this.handlers.get(name) ?? new Set(); set.add(fn); this.handlers.set(name, set); return this; }
  once(name: string, fn: (...args: any[]) => void) { const wrapper = (...args: any[]) => { this.off(name, wrapper); fn(...args); }; return this.on(name, wrapper); }
  off(name: string, fn: (...args: any[]) => void) { this.handlers.get(name)?.delete(fn); return this; }
  emit(name: string, ...args: any[]) { for (const fn of this.handlers.get(name) ?? []) fn(...args); }
}
function fixture(takeDamage = false, intro = false, beat?:any) {
  const events = new Events();
  const created: Display[] = [];
  const scene: any = {
    add: {
      image: (x: number, y: number, texture = '', frame = '') => { const visual = new Display(); visual.x = x; visual.y = y; visual.texture = texture; visual.frame = frame; created.push(visual); return visual; },
      text: (_x: number, _y: number, text: string) => { const x = new Display(); x.text = text; created.push(x); return x; },
      graphics: () => { const x = new Graphics(); created.push(x); return x; },
      circle: (x: number, y: number) => { const a = new Display(); a.x = x; a.y = y; created.push(a); return a; },
      rectangle: (x: number, y: number, w: number, h: number) => { const a = new Display(); a.x = x; a.y = y; a.width = w; a.height = h; created.push(a); return a; },
    },
    textures:{exists:()=>true},
    events,
    sys: { isActive: () => true },
    time: { now: 0 },
    physics: { world: { isPaused: false } },
    cameras: { main: { width:640,height:400,setScroll:vi.fn(),shake: vi.fn(),flash:vi.fn(),zoomTo:vi.fn(),setZoom:vi.fn(),pan:vi.fn(),stopFollow:vi.fn(),startFollow:vi.fn().mockReturnThis(),setDeadzone:vi.fn().mockReturnThis() } },
  };
  const player: any = {
    active: true, usingUltimate: false, isDashing: false, health: 3,
    body: { center: { x: 1000, y: 320 }, left: 982, right: 1018, top: 280, bottom: 360, velocity: { x: 0, y: 0 }, setVelocityY(v: number) { this.velocity.y = v; } },
    chargeUltimate: vi.fn(), takeDamage: vi.fn(() => takeDamage), bounceFromStomp: vi.fn(),
    dashHits: vi.fn(() => true), dashImpact: vi.fn(), bounceFromDash: vi.fn(),
  };
  const rescued = vi.fn();
  const fox = new FranklinFox(scene, player, rescued,790,beat);
  if(!intro&&!beat){fox.controller.phase='pounce-cue';fox['applyPose']();}
  const step = (delta = 50) => { scene.time.now += delta; fox.update(delta); };
  return { fox, player, scene, events, created, rescued, step };
}

describe('Franklin Fox runtime', () => {
  it('breaks only the exposed chip with ultimate and performs the same reunion once',()=>{
    const f=fixture();f.player.usingUltimate=true;const tryHit=vi.fn(()=>true),strike={player:f.player,tryHit};
    for(const phase of ['intro','collapse','final-cue','final-charge','crash']){f.fox.controller.phase=phase as any;f.events.emit('ultimate-strike',strike);}
    expect(tryHit).not.toHaveBeenCalled();expect(f.rescued).not.toHaveBeenCalled();
    f.fox.controller.phase='safe-chip';f.fox.controller.cleanCrashes=3;f.fox['applyPose']();f.events.emit('ultimate-strike',strike);f.events.emit('ultimate-strike',strike);
    expect(tryHit).toHaveBeenCalledWith(f.fox,f.fox.chipTarget);expect(f.rescued).toHaveBeenCalledOnce();expect(f.fox.phase).toBe('rescued');expect(f.player.bounceFromStomp).not.toHaveBeenCalled();expect(f.fox['rescueMs']).toBe(0);f.events.emit('shutdown');
  });
  it('tears down idempotently after Phaser already removed the main camera',()=>{
    const f=fixture();f.fox.controller.phase='barrage-cue';f.fox['draw']();const follow=f.scene.cameras.main.startFollow;f.scene.cameras.main=undefined;
    expect(()=>f.events.emit('shutdown')).not.toThrow();expect(f.created.every(object=>object.destroyed)).toBe(true);
    for(const event of ['ultimate-strike','postupdate','pause','resume','shutdown'])expect(f.events.handlers.get(event)?.size??0).toBe(0);
    const clock=f.fox['visualClock'];expect(()=>{f.fox['destroy'](true);f.fox.update(50);f.events.emit('shutdown');}).not.toThrow();expect(f.fox['visualClock']).toBe(clock);expect(follow).not.toHaveBeenCalled();
  });
  it('keeps a gallery eye scope on its frozen target with no pooled object growth',()=>{
    const f=fixture(false,true,'barrage'),count=f.created.length;expect(f.fox.image.flipX).toBe(true);f.step();const dotX=f.fox['laserReticle'].x,dotY=f.fox['laserReticle'].y;
    f.player.body.center.x=1500;f.player.body.center.y=180;f.step();expect(f.fox['laserReticle'].x).toBe(dotX);expect(f.fox['laserReticle'].y).toBe(dotY);expect(f.fox['laserBeam'].x).toBe(f.fox['eyePoint'].x);expect(f.fox['laserEmitter'].visible).toBe(true);
    for(let i=0;i<20;i++)f.step();expect(f.fox['laserEmitter'].visible).toBe(false);expect(f.created).toHaveLength(count);f.events.emit('shutdown');
  });
  it('faces Duckoman during stationary emotion without changing locked attack directions',()=>{
    const f=fixture(false,true);
    for(const phase of ['intro','resistance','overdrive','collapse','safe-chip','rescued'])for(const playerX of [540,1000]){
      f.fox.controller.phase=phase as any;f.fox.controller.direction=1;f.player.body.center.x=playerX;f.fox['applyPose']();
      expect(f.fox.image.flipX).toBe(playerX<790);expect(f.fox.controller.direction).toBe(1);
      expect(f.fox.chipImage.flipX).toBe(playerX<790);expect(f.fox['eyePoint'].x<790).toBe(playerX<790);
    }
    for(const phase of ['pounce-cue','pounce','tail-cue','final-cue','final-charge']){
      f.fox.controller.phase=phase as any;f.fox.controller.direction=1;f.player.body.center.x=540;f.fox['moveFox'](0);expect(f.fox.image.flipX).toBe(false);expect(f.fox.controller.direction).toBe(1);
    }
    f.fox.controller.phase='barrage-cue';f.fox.controller.aimX=1000;f.fox['moveFox'](0);expect(f.fox.image.flipX).toBe(false);f.events.emit('shutdown');
  });
  it('uses pooled image tail and cyan brace warnings with exact direction and cleanup',()=>{
    const f=fixture(),tail=f.fox['tailWarning'],brace=f.fox['resistanceWarning'],count=f.created.length;
    expect((tail as any).texture).toBe('franklin-tail-warning');expect((brace as any).texture).toBe('franklin-resistance-warning');
    for(const direction of [-1,1]){
      f.fox.controller={...createFranklinController(),phase:'tail-cue',direction,aimX:790};f.fox['draw']();
      expect(tail.visible).toBe(true);expect(brace.visible).toBe(false);expect(tail.x).toBe(790);expect(tail.y).toBe(348);expect(tail.originX).toBe(0);expect(tail.width).toBe(180);expect(tail.height).toBe(6);expect(tail.rotation).toBe(direction<0?Math.PI:0);expect(tail.x+Math.cos(tail.rotation)*180).toBeCloseTo(790+direction*180);
    }
    f.fox.controller.phase='resistance';f.fox.image.x=1200;f.fox['draw']();expect(tail.visible).toBe(false);expect(brace.visible).toBe(true);expect(brace.x).toBe(1165);expect(brace.y).toBe(358);expect(brace.width).toBe(65);expect(brace.height).toBe(6);
    f.events.emit('pause');expect(brace.visible).toBe(false);expect(tail.visible).toBe(false);
    f.fox['inactive']=false;f.fox.controller.phase='tail-cue';f.fox['draw']();f.player.active=false;f.step();expect(tail.visible).toBe(false);expect(brace.visible).toBe(false);
    expect(f.created).toHaveLength(count);f.events.emit('shutdown');expect((tail as any).destroyed).toBe(true);expect((brace as any).destroyed).toBe(true);
  });
  it('maps intro framing to half speed and holds reunion input for 4200 actual milliseconds',()=>{
    const f=fixture(false,true);f.fox.controller.elapsed=9150;f.step();expect(f.fox['cameraFollowing']).toBe(true);expect(f.fox.cinematicLocked).toBe(true);
    f.fox.controller.elapsed=10700;f.step();expect(f.fox.phase).toBe('intro');f.step();expect(f.fox.controller).toMatchObject({phase:'pounce-cue',elapsed:0});
    f.fox.controller.phase='rescued';f.fox['initializeReunion']();for(let i=0;i<83;i++)f.step();expect(f.fox.cinematicLocked).toBe(true);f.step();expect(f.fox.cinematicLocked).toBe(false);expect(f.fox['rescueMs']).toBeCloseTo(2800);f.events.emit('shutdown');
  });
  it('crops authored image HP without rescaling and keeps intro text scoped and cleaned',()=>{
    const f=fixture(false,true);const fill=f.fox.healthFill as any;
    for(const hp of [32,16,1]){f.fox.controller.hp=hp;f.fox['updateHud']();expect(fill.cropWidth).toBe(202*hp/32);expect(fill.width).toBe(202);}
    f.fox.controller.elapsed=400;f.fox['updateHud']();expect(f.fox['introText'].visible).toBe(true);expect(f.fox['introText'].alpha).toBe(1);
    f.fox.controller.elapsed=9700;f.fox['updateHud']();expect(f.fox['introText'].alpha).toBe(.5);
    f.fox.controller.phase='barrage-cue';f.fox['updateHud']();expect(f.fox['introText'].visible).toBe(false);
    f.fox.controller.phase='rescued';f.fox['updateHud']();expect(fill.cropWidth).toBe(0);expect(fill.visible).toBe(false);
    f.events.emit('shutdown');expect((f.fox['introText'] as any).destroyed).toBe(true);
  });
  it('shares the frozen clamped projectile ray with pooled laser images and hides on fire and pause',()=>{
    for(const aimX of [0,1900])for(const aimY of [-2000,2000]){
      const f=fixture();f.fox.controller={...createFranklinController(),phase:'barrage-cue',aimX,aimY,elapsed:200};f.step();
      const ray={...f.fox['fireballRay']},beam=f.fox['laserBeam'],reticle=f.fox['laserReticle'];expect(beam.visible).toBe(true);expect(Math.abs(Math.atan2(ray.dy,Math.abs(ray.dx)))).toBeCloseTo(.7);
      expect(beam.x).toBe(f.fox['eyePoint'].x);expect(beam.y).toBe(f.fox['eyePoint'].y);expect(f.fox['laserEmitter'].x).toBe(beam.x);expect(f.fox['laserEmitter'].y).toBe(beam.y);const distance=Math.min(ray.length,Math.abs(aimX-ray.x)/Math.abs(ray.dx));expect(reticle.x).toBeCloseTo(ray.x+ray.dx*distance);expect(reticle.y).toBeCloseTo(ray.y+ray.dy*distance);
      if(aimY>320)expect(ray.endY).toBeCloseTo(360);
      f.player.body.center.x=100;f.player.body.center.y=100;f.fox['spawnFireball']();const shot=f.fox['fireballs'][0];expect(shot.vy/shot.vx).toBeCloseTo(ray.dy/ray.dx);
      f.fox.controller.phase='barrage';f.fox['draw']();expect(beam.visible).toBe(false);f.fox.controller.phase='barrage-cue';f.fox['draw']();f.events.emit('pause');expect(beam.visible).toBe(false);expect(reticle.visible).toBe(false);
      f.events.emit('shutdown');expect((beam as any).destroyed).toBe(true);expect((reticle as any).destroyed).toBe(true);
    }
  });
  it('cannot skip intro with damage or a stomp, freezes its clock while paused, and restores follow before combat', () => {
    const f=fixture(false,true);expect(f.fox.cinematicLocked).toBe(true);expect(f.fox.damage('ultimate')).toBe(false);
    f.fox.controller.elapsed=850;f.step(50);expect(f.fox['acting'].core).toBe(0);
    const pans=f.scene.cameras.main.pan.mock.calls.length;f.scene.physics.world.isPaused=true;f.step(50);expect(f.fox.controller.elapsed).toBe(900);expect(f.scene.cameras.main.pan.mock.calls.length).toBe(pans);
    f.scene.physics.world.isPaused=false;f.step(50);expect(f.fox.controller.elapsed).toBe(900);
    for(let i=0;i<198;i++)f.step(50);expect(f.fox.controller).toMatchObject({phase:'pounce-cue',elapsed:0});expect(f.fox.cinematicLocked).toBe(false);expect(f.scene.cameras.main.startFollow).toHaveBeenCalled();
    f.events.emit('shutdown');expect(f.events.handlers.get('postupdate')?.size).toBe(0);
  });

  it('keeps damage flinch visual and uses one actual drawn chip target through pose, flip and detach',()=>{
    const f=fixture();const bounds={...f.fox['bodyBounds']()};expect(f.fox.damage('throw')).toBe(true);f.step(16);expect(f.fox.image.frame).toBe('hurt');expect(f.fox['bodyBounds']()).toEqual(bounds);
    f.player.body.center.x=540;f.fox.controller={...createFranklinController(),phase:'safe-chip',direction:-1,cleanCrashes:3};f.step(50);
    expect((f.fox.chipTarget.left+f.fox.chipTarget.right)/2).toBe(f.fox.chipImage.x);expect((f.fox.chipTarget.top+f.fox.chipTarget.bottom)/2).toBe(f.fox.chipImage.y);
    expect(f.fox.chipTarget.right-f.fox.chipTarget.left).toBe(22);expect(f.fox.chipTarget.bottom-f.fox.chipTarget.top).toBe(18);expect(f.fox.image.flipX).toBe(true);
    f.events.emit('shutdown');
  });

  it('loops developer beats without damage, projectiles, completion or extra objects',()=>{
    for(const beat of ['intro','overdrive','resistance','tail','crash','safe-chip','rescued']){
      const f=fixture(true,true,beat);const count=f.created.length;for(let i=0;i<150;i++)f.step(50);
      expect(f.fox.damage('ultimate')).toBe(false);expect(f.player.takeDamage).not.toHaveBeenCalled();expect(f.rescued).not.toHaveBeenCalled();expect(f.created).toHaveLength(count);expect(f.fox['fireballs'].every((shot:any)=>shot.remainingMs===0)).toBe(true);f.events.emit('shutdown');
    }
  });

  it('restores inactive camera only on entry and keeps presentation clocks stopped',()=>{
    const f=fixture(false,true);f.step(50);f.scene.physics.world.isPaused=true;f.step(50);
    const follow=f.scene.cameras.main.startFollow.mock.calls.length,zoom=f.scene.cameras.main.setZoom.mock.calls.length,clock=f.fox['visualClock'];
    for(let i=0;i<10;i++)f.step(50);
    expect(f.scene.cameras.main.startFollow.mock.calls.length).toBe(follow);expect(f.scene.cameras.main.setZoom.mock.calls.length).toBe(zoom);expect(f.fox['visualClock']).toBe(clock);expect(f.fox.controller.elapsed).toBe(50);
    f.scene.physics.world.isPaused=false;f.step(50);expect(f.fox.controller.elapsed).toBe(50);f.events.emit('shutdown');
  });

  it('emphasizes either actual wall only in safe crash recovery and restores follow 250ms before the cue',()=>{
    for(const wall of [155,1845]){
      const f=fixture();f.fox.image.x=wall;f.fox.controller={...createFranklinController(),phase:'crash',elapsed:200,cleanCrashes:1};f.step(50);
      const [left,top]=f.scene.cameras.main.setScroll.mock.calls.at(-1);expect(wall).toBeGreaterThanOrEqual(left);expect(wall).toBeLessThanOrEqual(left+640/1.1);expect(330).toBeGreaterThanOrEqual(top);expect(f.fox.controller.cleanCrashes).toBe(1);
      f.fox.controller.elapsed=900;f.step(50);expect(f.fox['cameraFollowing']).toBe(true);expect(f.fox.controller.phase).toBe('crash');f.fox.controller.elapsed=1150;f.step(50);expect(f.fox.controller).toMatchObject({phase:'final-cue',elapsed:0});expect(f.fox['cameraFollowing']).toBe(true);f.events.emit('shutdown');
    }
  });

  it('uses the real exposed chip origin and the same reunion position in rescued gallery',()=>{
    const f=fixture(false,true,'rescued');expect(f.fox['breakX']).toBeGreaterThan(700);expect(f.fox['breakY']).toBeGreaterThan(300);
    expect(f.fox['rescueStartX']).toBe(790);expect(f.fox['rescueEndX']).toBe(935);f.step(50);const fragment=f.fox['fragments'][2];expect(fragment.visible).toBe(true);expect(fragment.x).toBeGreaterThan(700);
    for(let i=0;i<75;i++)f.step(50);expect(f.fox.image.x).toBeCloseTo(935);expect(f.rescued).not.toHaveBeenCalled();f.events.emit('shutdown');
  });

  it('renders the chip image at the mirrored chip anchor and hides and destroys it on rescue', () => {
    const f = fixture();
    f.fox.image.x = 920;
    f.fox.image.setFlipX(true);
    f.fox['draw']();
    const bounds = f.fox.chipTarget;
    expect(f.fox.chipImage.visible).toBe(true);
    expect(f.fox.chipImage.flipX).toBe(true);
    expect(f.fox.chipImage.x).toBeCloseTo((bounds.left + bounds.right) / 2);
    expect(f.fox.chipImage.y).toBeCloseTo((bounds.top + bounds.bottom) / 2);
    f.fox.controller = { ...f.fox.controller, phase: 'rescued', rescued: true };
    f.fox['draw']();
    expect(f.fox.chipImage.visible).toBe(false);
    f.events.emit('shutdown');
    expect((f.fox.chipImage as any).destroyed).toBe(true);
  });

  it('shows a wall-bounce impact at the wall reached when the next cue turns toward Duckoman', () => {
    const f = fixture();
    f.fox.image.x = 1845;
    f.fox.controller = { ...createFranklinController(), phase: 'wallbounce', direction: 1, phase2: true };
    f.step();
    expect(f.fox.controller).toMatchObject({ phase: 'pounce-cue', direction: -1 });
    const impact = f.created.find(object => object.texture === 'franklin-wall-impact');
    expect(impact?.visible).toBe(true);
    expect(impact?.x).toBe(1845);
    f.events.emit('shutdown');
  });

  it('backs away while facing the frozen barrage target', () => {
    const f = fixture();
    f.fox.controller = { ...createFranklinController(), phase: 'barrage-cue', direction: -1, aimX: 1000, elapsed: 100 };
    f.step();
    expect(f.fox.image.x).toBeLessThan(790);
    expect(f.fox.image.flipX).toBe(false);
    f.events.emit('shutdown');
  });

  it('matches Duckoman visible size and awards one hit reward per accepted attack', () => {
    const f = fixture();
    expect(f.fox.image.width).toBe(FRANKLIN_VISUAL.referenceWidth);
    expect(f.fox.image.height).toBeCloseTo(66 * FRANKLIN_POSES.crouch.height / FRANKLIN_POSES.crouch.width);
    expect(f.fox['bodyBounds']()).toMatchObject({ left: 767, right: 813, top: 320, bottom: 360 });
    expect(f.scene.cameras.main.setZoom).toHaveBeenCalled();
    expect(f.fox.damage('dash')).toBe(true);
    expect(f.fox.damage('stomp')).toBe(false);
    f.scene.time.now = 400;
    expect(f.fox.damage('stomp')).toBe(true);
    f.scene.time.now = 800;
    expect(f.fox.damage('throw')).toBe(true);
    f.scene.time.now = 1200;
    expect(f.fox.damage('ultimate')).toBe(true);
    expect(f.fox.hp).toBe(27);
    expect(f.player.chargeUltimate).toHaveBeenCalledTimes(4);
    expect(f.player.chargeUltimate).toHaveBeenCalledWith(10);
    f.events.emit('shutdown');
  });

  it('keeps dash damage and reward single-counted and checks cake hits against the moving body', () => {
    const f = fixture();
    expect(f.fox.checkDash(f.player)).toBe(true);
    expect(f.fox.hp).toBe(31);
    expect(f.player.chargeUltimate).toHaveBeenCalledTimes(1);
    f.fox.image.x = 1400;
    expect(f.fox.overlapsCake(1400, 320)).toBe(true);
    expect(f.fox.overlapsCake(790, 320)).toBe(false);
    f.events.emit('shutdown');
  });

  it('stomps Franklin before contact damage and bounces Duckoman', () => {
    const f = fixture();
    Object.assign(f.player.body, { left: 780, right: 800, top: 234, bottom: 260, velocity: { x: 0, y: -30 } });
    f.step(16);
    Object.assign(f.player.body, { left: 780, right: 800, top: 294, bottom: 326, velocity: { x: 0, y: 80 } });
    f.step(16);
    expect(f.fox.hp).toBe(31);
    expect(f.player.bounceFromStomp).toHaveBeenCalledTimes(1);
    expect(f.player.takeDamage).not.toHaveBeenCalled();
    f.events.emit('shutdown');
  });

  it('frames both friends during reunion and turns Franklin toward Duckoman',()=>{
    const f=fixture(false,true,'rescued');f.player.body.center.x=540;
    f.step(50);expect(f.fox.image.flipX).toBe(true);expect(f.scene.cameras.main.setScroll).toHaveBeenCalled();
    const [scrollX]=f.scene.cameras.main.setScroll.mock.calls.at(-1)!;
    const zoom=f.scene.cameras.main.setZoom.mock.calls.at(-1)![0];
    expect((540-scrollX)*zoom).toBeGreaterThan(0);expect((790-scrollX)*zoom).toBeLessThan(640);
    for(let i=0;i<83;i++)f.step(50);expect(f.scene.cameras.main.startFollow).toHaveBeenCalled();
    f.events.emit('shutdown');
  });

  it('keeps control-light images attached, dims them during resistance, and removes them after rescue',()=>{
    const f=fixture(false,true);
    expect(f.fox['eyeLight'].visible).toBe(false);
    f.fox.controller.phase='resistance';f.fox.controller.elapsed=400;f.step(16);
    const eye=f.fox['eyeLight'] as any,chip=f.fox['chipLight'] as any;
    expect(eye.alpha).toBeCloseTo(.08);expect(eye.x).toBeCloseTo(f.fox['eyePoint'].x);expect(eye.y).toBeCloseTo(f.fox['eyePoint'].y);
    expect(chip.x).toBeCloseTo(f.fox.chipImage.x);expect(chip.y).toBeCloseTo(f.fox.chipImage.y);
    f.fox.controller.phase='overdrive';f.fox.controller.elapsed=400;f.step(16);expect(eye.alpha).toBe(1);
    f.fox.controller.phase='rescued';f.step(16);expect(eye.visible).toBe(false);expect(chip.visible).toBe(false);
    f.events.emit('shutdown');expect(eye.destroyed).toBe(true);expect(chip.destroyed).toBe(true);
  });

  it('uses finite pooled fireballs and clears them on pause before they can damage the player', () => {
    const f = fixture(true);
    f.fox.controller = { ...createFranklinController(), phase: 'barrage-cue', elapsed: 650, aimX: 805, aimY: 320 };
    f.step(50);
    expect(f.fox['fireballs'].filter((shot: any) => shot.remainingMs > 0)).toHaveLength(1);
    f.events.emit('pause');
    expect(f.fox['fireballs'].every((shot: any) => shot.remainingMs === 0 && !shot.image.visible)).toBe(true);
    expect(f.player.takeDamage).not.toHaveBeenCalled();
    f.events.emit('shutdown');
    expect(f.created.every(gameObject => gameObject.destroyed)).toBe(true);
  });

  it('preallocates the six authored effect pools and keeps each visual attached to its collision shape', () => {
    const f = fixture();
    const images = f.created.filter(object => object.texture.startsWith('franklin-'));
    expect(images.filter(object => object.texture === 'franklin-pounce-trail')).toHaveLength(8);
    expect(images.filter(object => object.texture === 'franklin-fireball')).toHaveLength(8);
    expect(images.filter(object => object.texture === 'franklin-tail-wave')).toHaveLength(1);
    expect(images.filter(object => object.texture === 'franklin-flame-pillar')).toHaveLength(7);
    expect(images.filter(object => object.texture === 'franklin-wall-impact')).toHaveLength(1);
    expect(images.filter(object => object.texture === 'franklin-chip-charge')).toHaveLength(1);
    expect(images.filter(object=>object.texture.includes('poses')).every(object=>Object.keys(FRANKLIN_POSES).includes(object.frame))).toBe(true);
    f.fox.controller = { ...createFranklinController(), phase: 'tail', elapsed: 50, aimX: 800, direction: -1 };
    f.step();
    const wave = images.find(object => object.texture === 'franklin-tail-wave')!;
    expect(wave.visible).toBe(true);
    expect(wave.width).toBe(60);
    expect(wave.height).toBe(28);
    expect(wave.flipX).toBe(true);
    expect(wave.x).toBeCloseTo(800 - 100 * 340 / 1000);

    f.fox.controller = { ...createFranklinController(), phase: 'pillars', elapsed: 100, hazards: [600, 900, 1200] };
    f.step();
    const pillars = f.fox['pillarImages'].map((effect:any)=>effect.image);
    expect(pillars.filter(object => object.visible)).toHaveLength(3);
    expect(pillars[0]).toMatchObject({ x: 600, y: 290, width: 44, height: 140 });

    f.fox.controller = { ...createFranklinController(), phase: 'final-charge', direction: 1 };
    f.step();
    const wake = images.find(object => object.texture === 'franklin-chip-charge')!;
    expect(wake.visible).toBe(true);
    expect(wake.width).toBe(80);
    expect(wake.height).toBeCloseTo(80 * 376 / 1816);
    expect(wake.flipX).toBe(false);
    const pooledCount=f.created.length;f.step();expect(f.created).toHaveLength(pooledCount);
    f.events.emit('shutdown');
    expect(images.every(object => object.destroyed)).toBe(true);
  });

  it('anchors the bright fireball core at the same mirrored center used for collision', () => {
    const f = fixture(false);
    f.fox.controller = { ...createFranklinController(), phase: 'barrage-cue', elapsed: 650, aimX: 1800, aimY: 320 };
    f.step();
    const right = f.created.find(object => object.texture === 'franklin-fireball' && object.visible)!;
    expect(right).toBeDefined();
    expect(right.originX).toBe(0.72);
    expect(right.originY).toBe(0.56);
    expect(right.width).toBeCloseTo(18 * 1019 / 669);
    expect(right.height).toBe(18);
    f.fox.controller = { ...createFranklinController(), phase: 'barrage-cue', elapsed: 650, aimX: 0, aimY: 320 };
    f.step();
    const left = f.created.filter(object => object.texture === 'franklin-fireball' && object.visible)[1];
    expect(left.flipX).toBe(true);
    expect(left.originX).toBe(0.28);
    f.events.emit('shutdown');
  });

  it('moves a pooled fireball into the player rectangle and applies one accepted hit', () => {
    const f = fixture(true);
    Object.assign(f.player.body, { left: 790, right: 812, top: 300, bottom: 340 });
    f.fox.controller = { ...createFranklinController(), phase: 'barrage-cue', elapsed: 650, aimX: 800, aimY: 320 };
    f.step(50);
    expect(f.player.takeDamage).toHaveBeenCalledTimes(1);
    expect(f.fox['fireballs'].every((shot: any) => shot.remainingMs === 0)).toBe(true);
    f.events.emit('shutdown');
  });

  it('keeps attack poses at the player-sized reference dimensions and locks the final charge direction', () => {
    const f = fixture();
    f.fox.controller = { ...createFranklinController(), phase: 'pounce-cue', elapsed: 0 };
    f.step(50);
    expect(f.fox.image.frame).toBe('crouch');
    expect(f.fox.image.width).toBeLessThanOrEqual(66*1.1);
    expect(f.fox.image.height).toBeCloseTo(66*FRANKLIN_POSES.crouch.height/FRANKLIN_POSES.crouch.width*f.fox['acting'].sy);
    f.fox.controller = { ...f.fox.controller, phase: 'collapse', elapsed: 2150 };
    f.step(50);
    expect(f.fox.controller.phase).toBe('final-cue');
    const locked = f.fox.controller.direction;
    f.player.body.center.x = locked > 0 ? 0 : 2000;
    for (let i = 0; i < 20; i += 1) f.step(50);
    expect(f.fox.controller.phase).toBe('final-charge');
    expect(f.fox.controller.direction).toBe(locked);
    expect(f.fox.image.width).toBe(FRANKLIN_VISUAL.referenceWidth);
    expect(f.fox.image.height).toBeCloseTo(66*FRANKLIN_POSES.lunge.height/FRANKLIN_POSES.lunge.width*f.fox['acting'].sy);
    f.events.emit('shutdown');
  });

  it('requires three wall crashes and a descending stomp on the real mirrored chip anchor; callback fires once', () => {
    const f = fixture(false);
    for (let hit = 0; hit < 13; hit += 1) {
      f.scene.time.now = hit * 400;
      expect(f.fox.damage('ultimate')).toBe(true);
      if (hit === 7) expect(f.fox.controller.phase2).toBe(true);
    }
    expect(f.fox.controller).toMatchObject({ hp: 6, phase: 'collapse' });
    for (let i = 0; i < 100 && f.fox.controller.phase !== 'final-charge'; i += 1) f.step();
    expect(f.fox.phase).toBe('final-charge');
    expect(f.rescued).not.toHaveBeenCalled();
    f.fox.controller.direction = 1;
    f.fox.image.x = 1840;
    f.step();
    expect(f.fox.controller).toMatchObject({ phase: 'crash', cleanCrashes: 1 });
    for (let crash = 1; crash < 3; crash += 1) {
      while ((f.fox.controller.phase as string) !== 'final-charge') f.step();
      for (let i = 0; i < 100 && (f.fox.controller.phase as string) !== 'crash'; i += 1) f.step();
      expect(f.fox.controller.cleanCrashes).toBe(crash + 1);
    }
    while ((f.fox.controller.phase as string) !== 'safe-chip') f.step();
    const chip = {...f.fox.chipTarget};
    const centerX = (chip.left + chip.right) / 2;
    Object.assign(f.player.body, { left: centerX - 9, right: centerX + 9, top: chip.top - 30, bottom: chip.top - 5, velocity: { x: 0, y: -20 } });
    f.step();
    Object.assign(f.player.body, { top: chip.top - 6, bottom: chip.top + 2, velocity: { x: 0, y: 100 } });
    f.step();
    f.step();
    expect(f.fox.controller.phase).toBe('rescued');
    expect(f.fox.isAlive).toBe(true);
    expect(f.fox.isCombatActive).toBe(false);
    expect(f.fox.image.visible).toBe(true);
    expect(f.rescued).toHaveBeenCalledTimes(1);
    expect(f.scene.cameras.main.flash).toHaveBeenCalledWith(60,255,225,175);
    expect(f.scene.cameras.main.startFollow).toHaveBeenCalled();
    f.events.emit('shutdown');
  });

  it('restarts a full cue after pause and clears all objects on shutdown', () => {
    const f = fixture();
    f.fox.controller = { ...createFranklinController(), phase: 'tail', elapsed: 250 };
    f.events.emit('pause');
    f.step();
    expect(f.fox.controller).toMatchObject({ phase: 'tail-cue', elapsed: 0 });
    expect(f.fox['previousPlayerBottom']).toBe(f.player.body.bottom);
    f.events.emit('shutdown');
    expect((f.fox.image as any).destroyed).toBe(true);
    expect((f.fox.graphics as any).destroyed).toBe(true);
  });
});
