import {describe,expect,it} from 'vitest';
import {projectMenuBoard,pullbackTarget} from '../src/systems/spatialMenuGeometry';

describe('spatial menu camera geometry',()=>{
 it('centers the live duck at the settled foreground center with nonzero scroll and anisotropic zoom',()=>{
  const duck={x:4217,y:286},qx=.68,qy=.51,target=pullbackTarget(duck.x,duck.y,qx,qy);
  expect((duck.x-target.scrollX)*qx).toBeCloseTo(145);
  expect((duck.y-target.scrollY)*qy).toBeCloseTo(290);
  const board={x:duck.x+100/qx,y:duck.y-265/qy},screen=projectMenuBoard(board.x,board.y,target.scrollX,target.scrollY,qx,qy,qx,qy);
  expect(screen.x).toBeCloseTo(245);expect(screen.y).toBeCloseTo(25);expect(screen.scaleX).toBe(1);expect(screen.scaleY).toBe(1);
 });
 it('scales a world-anchored board with zoom while preserving the projected location',()=>{
  const anchor={x:1500,y:2200},start={x:800,y:1600,qx:1.2,qy:.9},settled={qx:.816,qy:.612};
  const initial=projectMenuBoard(anchor.x,anchor.y,start.x,start.y,start.qx,start.qy,settled.qx,settled.qy),end=projectMenuBoard(anchor.x,anchor.y,start.x,start.y,settled.qx,settled.qy,settled.qx,settled.qy);
  expect(initial.scaleX).toBeCloseTo(1.470588);expect(initial.scaleY).toBeCloseTo(1.470588);expect(end.scaleX).toBe(1);expect(end.scaleY).toBe(1);
 });
});

describe('spatial menu transition state',()=>{
 it('gates actions until ready and permits only one early close',async()=>{
  const {SpatialMenuTransition}=await import('../src/systems/spatialMenuGeometry');
  const transition=new SpatialMenuTransition();expect(transition.canAct).toBe(false);transition.setProgress(.1);expect(transition.beginClose()).toBe(160);expect(transition.beginClose()).toBeUndefined();expect(transition.canAct).toBe(false);expect(transition.finishClose()).toBe(true);expect(transition.finishClose()).toBe(false);
 });
 it('restores normalized zoom using the current render scale and retains camera flags',async()=>{
  const {restoreCamera}=await import('../src/systems/spatialMenuGeometry');
  const snapshot={scrollX:741,scrollY:912,zoomX:1.4,zoomY:.85,lerpX:.14,lerpY:.12,useBounds:true,visibility:[true,false,true]};
  expect(restoreCamera(snapshot,2)).toEqual({scrollX:741,scrollY:912,zoomX:2.8,zoomY:1.7,lerpX:.14,lerpY:.12,useBounds:true,visibility:[true,false,true]});
 });
 it('interpolates scroll and normalized zoom while applying the current pixel scale',async()=>{
  const {cameraAtProgress}=await import('../src/systems/spatialMenuGeometry');
  expect(cameraAtProgress(100,200,1.2,.8,300,500,.816,.544,.5,2)).toEqual({scrollX:200,scrollY:350,zoomX:2.016,zoomY:1.344});
 });
});

describe('spatial menu DOM and lifecycle gates',()=>{
 it('enables unlocked controls only when ready while retaining progress locks',async()=>{
  const {gateMenuControls}=await import('../src/systems/spatialMenuGeometry');const controls=[{dataset:{locked:'false'},disabled:false},{dataset:{locked:'true'},disabled:false},{dataset:{},disabled:false}];
  gateMenuControls(controls,false);expect(controls.map(c=>c.disabled)).toEqual([true,true,true]);gateMenuControls(controls,true);expect(controls.map(c=>c.disabled)).toEqual([false,true,false]);
 });
 it('removes every lifecycle callback after nested visibility changes across two instances',async()=>{
  const {bindMenuVisibilityLifecycle}=await import('../src/systems/spatialMenuGeometry');const listeners=new Map<string,Set<()=>void>>();const events={on:(e:string,f:()=>void)=>{const set=listeners.get(e)??new Set();set.add(f);listeners.set(e,set);},off:(e:string,f:()=>void)=>{listeners.get(e)?.delete(f);}};
  for(let cycle=0;cycle<2;cycle++){const calls:string[]=[];const cleanup=bindMenuVisibilityLifecycle(events,()=>calls.push('hide-pause'),()=>calls.push('hide-sleep'),()=>calls.push('show-resume'),()=>calls.push('show-wake'));expect([...listeners.values()].reduce((n,set)=>n+set.size,0)).toBe(4);for(const event of ['pause','sleep','resume','wake'])for(const fn of listeners.get(event)??[])fn();expect(calls).toEqual(['hide-pause','hide-sleep','show-resume','show-wake']);cleanup();cleanup();expect([...listeners.values()].reduce((n,set)=>n+set.size,0)).toBe(0);}
 });
 it('keeps the same screen plane across game widths',async()=>{
  const {spatialMenuLayout}=await import('../src/systems/spatialMenuGeometry');expect(spatialMenuLayout(398)).toEqual({narrow:true,finalY:25,width:340,height:266});expect(spatialMenuLayout(481)).toEqual({narrow:false,finalY:25,width:340,height:266});
 });
});

describe('menu pointer and gaze',()=>{
 it('converts centered game rectangles independently of pixel density',async()=>{const {menuPointer}=await import('../src/systems/spatialMenuGeometry');expect(menuPointer(660,395,{left:500,top:220,width:320})).toEqual({x:320,y:350});expect(menuPointer(980,745,{left:500,top:220,width:960})).toEqual({x:320,y:350});});
 it('keeps facing in the center deadzone and clamps tilt for either side',async()=>{const {menuGazeTarget}=await import('../src/systems/spatialMenuGeometry');expect(menuGazeTarget(20,-100,180).turn).toBe(180);expect(menuGazeTarget(25,-100,180).turn).toBe(0);expect(menuGazeTarget(-25,-100,0).turn).toBe(180);expect(menuGazeTarget(30,-1e8,0).tilt).toBeCloseTo(-.22);expect(menuGazeTarget(-30,-1e8,0).tilt).toBeCloseTo(.22);expect(menuGazeTarget(30,1e8,0).tilt).toBe(.12);});
 it('smooths based on time and caps stalled frame deltas',async()=>{const {smoothMenuGaze}=await import('../src/systems/spatialMenuGeometry');const start={turn:0,tilt:-.12},target={turn:180,tilt:.1};const a=smoothMenuGaze(start,target,40),half=smoothMenuGaze(start,target,20),b=smoothMenuGaze(half,target,20);expect(a.turn).toBeCloseTo(b.turn);expect(a.tilt).toBeCloseTo(b.tilt);expect(smoothMenuGaze(start,target,1000)).toEqual(smoothMenuGaze(start,target,50));expect(a.turn).toBeGreaterThan(0);expect(a.turn).toBeLessThan(180);});
});

it('owns only one demand update and removes it on settle, pause, close or cleanup',async()=>{const {DemandMenuUpdates}=await import('../src/systems/spatialMenuGeometry');let listeners=0;const updates=new DemandMenuUpdates(()=>listeners++,()=>listeners--);expect(listeners).toBe(0);updates.wake();updates.wake();expect(listeners).toBe(1);updates.stop();updates.stop();expect(listeners).toBe(0);updates.wake();expect(listeners).toBe(1);updates.stop();expect(listeners).toBe(0);expect(updates.active).toBe(false);});

describe('foreground duck rendering transaction',()=>{
 it('uses a small double-density backing without changing native display dimensions',async()=>{const {menuDuckBacking}=await import('../src/systems/spatialMenuGeometry');expect(menuDuckBacking(66,60)).toEqual({width:380,height:346});expect(menuDuckBacking(200,180)).toEqual({width:400,height:360});});
 it('keeps standalone metrics independent of render scale and projects the actual scene duck',async()=>{const {menuDuckSize}=await import('../src/systems/spatialMenuGeometry');for(const scale of [1,2]){const menuPixelZoom=.68,q=menuPixelZoom/scale;expect(menuDuckSize(66,60,q,q,1,false)).toEqual({width:190,height:174});const sceneQ=.68;const live=menuDuckSize(66,60,sceneQ*scale/scale,.51*scale/scale,1,true);expect(live.width).toBe(190);expect(live.height).toBeCloseTo(190*60/66);}expect(menuDuckSize(66,60,1.2,.9,0,true)).toEqual({width:79.2,height:54});});
 it('restores exactly the captured visibility after early close and repeated cleanup',async()=>{const {MenuDuckVisibility}=await import('../src/systems/spatialMenuGeometry');for(const original of [true,false]){const writes:boolean[]=[];const visual={visible:original,setVisible(value:boolean){this.visible=value;writes.push(value);}};const transaction=new MenuDuckVisibility(visual,()=>true);expect(transaction.original).toBe(original);transaction.conceal();expect(visual.visible).toBe(false);transaction.restore();transaction.restore();transaction.conceal();expect(visual.visible).toBe(original);expect(writes).toEqual([false,original]);}});
 it('does not restore a visual destroyed with its parent',async()=>{const {MenuDuckVisibility}=await import('../src/systems/spatialMenuGeometry');let alive=true;let writes=0;const visual={visible:true,setVisible(value:boolean){this.visible=value;writes++;}};const transaction=new MenuDuckVisibility(visual,()=>alive);transaction.conceal();alive=false;transaction.restore();expect(writes).toBe(1);});
 it('updates gaze in place with the same result as the pure calculation',async()=>{const {smoothMenuGaze}=await import('../src/systems/spatialMenuGeometry');const gaze={turn:17,tilt:-.03},target={turn:180,tilt:.12};const expected=smoothMenuGaze(gaze,target,16);expect(smoothMenuGaze(gaze,target,16,gaze)).toBe(gaze);expect(gaze).toEqual(expected);});
});

it('uses one finite progress value for screen angle and proportional closing',async()=>{const {menuBoardAngles,SpatialMenuTransition}=await import('../src/systems/spatialMenuGeometry');expect(menuBoardAngles(0)).toEqual({z:2,y:-18});expect(menuBoardAngles(1)).toEqual({z:6,y:-28});const transition=new SpatialMenuTransition();transition.setProgress(.5);expect(transition.beginClose()).toBe(325);});
it('keeps the projected tilted panel corners within the logical stage at both game widths',async()=>{const {menuBoardAngles,spatialMenuLayout}=await import('../src/systems/spatialMenuGeometry');const angles=menuBoardAngles(1),yAngle=angles.y*Math.PI/180,zAngle=angles.z*Math.PI/180;for(const width of [398,1100]){const layout=spatialMenuLayout(width);for(const x of [0,layout.width])for(const y of [0,layout.height]){const localY=y-layout.height/2,turnedX=x*Math.cos(yAngle),depth=-x*Math.sin(yAngle),rotatedX=turnedX*Math.cos(zAngle)-localY*Math.sin(zAngle),rotatedY=turnedX*Math.sin(zAngle)+localY*Math.cos(zAngle),perspective=900/(900-depth),screenX=245+rotatedX*perspective,screenY=25+layout.height/2+rotatedY*perspective;expect(screenX).toBeGreaterThan(0);expect(screenX).toBeLessThan(640);expect(screenY).toBeGreaterThan(0);expect(screenY).toBeLessThan(400);}}});

describe('zoom first, reveal second',()=>{
 it('smoothly separates camera approach from panel reveal',async()=>{const {menuTransitionPhases}=await import('../src/systems/spatialMenuGeometry');for(const [p,zoom,reveal] of [[0,0,0],[.31,.5,0],[.62,1,0],[.81,1,.5],[1,1,1]]){const phases=menuTransitionPhases(p);expect(phases.zoomPhase).toBeCloseTo(zoom);expect(phases.revealPhase).toBeCloseTo(reveal);}expect(menuTransitionPhases(-1)).toEqual({zoomPhase:0,revealPhase:0});expect(menuTransitionPhases(2)).toEqual({zoomPhase:1,revealPhase:1});});
 it('increases actual normalized camera zoom from a non-default snapshot at current render scale',async()=>{const {menuTransitionPhases,MENU_ZOOM_FACTOR,cameraAtProgress,pullbackTarget,projectMenuBoard}=await import('../src/systems/spatialMenuGeometry');const start={x:2011,y:802,qx:1.3,qy:.9},duck={x:2200,y:960},qx=start.qx*MENU_ZOOM_FACTOR,qy=start.qy*MENU_ZOOM_FACTOR,target=pullbackTarget(duck.x,duck.y,qx,qy);let previous=start.qx;for(const progress of [.01,.1,.31,.5,.62,.81,1]){const phases=menuTransitionPhases(progress),camera=cameraAtProgress(start.x,start.y,start.qx,start.qy,target.scrollX,target.scrollY,qx,qy,phases.zoomPhase,2);expect(camera.zoomX/2).toBeGreaterThan(start.qx);expect(camera.zoomX/2).toBeGreaterThanOrEqual(previous);previous=camera.zoomX/2;if(phases.revealPhase>0){expect(camera.zoomX/2).toBeCloseTo(qx);expect(camera.scrollX).toBeCloseTo(target.scrollX);}}const board=projectMenuBoard(duck.x+100/qx,duck.y-265/qy,target.scrollX,target.scrollY,qx,qy,qx,qy);expect(board.x).toBeCloseTo(245);expect(board.y).toBeCloseTo(25);expect((duck.x-target.scrollX)*qx).toBeCloseTo(145);expect((duck.y-target.scrollY)*qy).toBeCloseTo(290);});
 it('holds close-up during reverse reveal and reverses partial opening without a phase jump',async()=>{const {menuTransitionPhases,SpatialMenuTransition,menuDuckSize}=await import('../src/systems/spatialMenuGeometry');for(const p of [1,.81,.7,.62])expect(menuTransitionPhases(p).zoomPhase).toBe(1);for(const p of [.31,.7]){const transition=new SpatialMenuTransition();transition.setProgress(p);const before=menuTransitionPhases(transition.progress);expect(transition.beginClose()).toBe(Math.max(160,650*p));expect(menuTransitionPhases(transition.progress)).toEqual(before);}const start=menuDuckSize(66,60,1.3,.9,0,true),settled=menuDuckSize(66,60,1.3,.9,menuTransitionPhases(.62).zoomPhase,true);expect(start.width).toBeCloseTo(85.8);expect(settled.width).toBe(190);expect(menuDuckSize(66,60,1.3,.9,menuTransitionPhases(0).zoomPhase,true)).toEqual(start);});
});
