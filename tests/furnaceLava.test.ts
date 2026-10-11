import { describe, expect, it, vi } from 'vitest';
vi.mock('phaser', () => ({ default: { Scenes: { Events: { SHUTDOWN: 'shutdown' } }, BlendModes: { ADD: 1 } } }));
import { FURNACE_BOSS_CHECKPOINT, FURNACE_ROOM_WIDTH, FURNACE_ROOMS } from '../src/data/furnace';
import {
  advanceFurnaceLavaMotion, bodyTouchesFurnaceLava, buildFurnaceLavaRegions,
  furnaceLavaEligibleIntervals, furnaceLavaMotionTouchesSurface, furnaceLavaNextDelay, furnaceLavaPointInIntervals, furnaceLavaSurfaceAt,
  furnaceLavaSweptContact, makeFurnaceLavaMotion, FurnaceLava,
  FURNACE_LAVA_APRON_WIDTH, FURNACE_LAVA_BLOB_POOL_SIZE, FURNACE_LAVA_MAX_DELTA,
  FURNACE_LAVA_PLATFORM_CLEARANCE, FURNACE_LAVA_POOL_WIDTH, FURNACE_LAVA_REFUGE_MARGIN,
  buildFurnaceLavaDividers, buildFurnaceLavaFeeds, FURNACE_LAVA_FEED_MIN_RISE,
} from '../src/systems/FurnaceLava';
import { sceneAssetEntries } from '../src/scenes/SceneAssets';
import furnaceSceneSource from '../src/scenes/FurnaceScene.ts?raw';
import { furnaceRoute, furnaceJumpOptions } from '../src/systems/FurnaceRoute';
import { TUNING } from '../src/config/tuning';
import lavaSource from '../src/systems/FurnaceLava.ts?raw';

class GameObject {
  x=0; y=0; alpha=1; visible=true; tilePositionX=0; tilePositionY=0; destroyed=false; tileScale:any; depth=0; rotation=0; displaySize:any;
  setOrigin(){return this;} setDepth(n:number){this.depth=n;return this;} setAlpha(n:number){this.alpha=n;return this;} setTint(){return this;}
  setBlendMode(){return this;} setPosition(x:number,y:number){this.x=x;this.y=y;return this;} setY(y:number){this.y=y;return this;} setDisplaySize(w:number,h:number){this.displaySize={width:w,height:h};return this;}
  setTileScale(x:number,y:number){this.tileScale={x,y};return this;} setVisible(v:boolean){this.visible=v;return this;} setRotation(n:number){this.rotation=n;return this;}
  destroy(){this.destroyed=true;}
}
function sceneFixture(){
  const listeners=new Map<string,Function[]>(), objects:GameObject[]=[],created:Array<{kind:string,args:any[];object:GameObject}>=[];
  const scene:any={add:{tileSprite:(...args:any[])=>{const o=new GameObject();o.x=args[0];o.y=args[1];objects.push(o);created.push({kind:'tile',args,object:o});return o;},image:(...args:any[])=>{const o=new GameObject();o.x=args[0];o.y=args[1];objects.push(o);created.push({kind:'image',args,object:o});return o;}},events:{once:(e:string,fn:Function)=>listeners.set(e,[...(listeners.get(e)??[]),fn]),off:vi.fn()}};
  return {scene,objects,listeners,created};
}

describe('Furnace authored world-space lava',()=>{
  const regions=buildFurnaceLavaRegions();
  it('covers every 480px room segment and has a separate preboss apron',()=>{
    expect(regions).toHaveLength(34);
    for(let i=0;i<33;i++)expect(regions[i]).toMatchObject({left:i*FURNACE_LAVA_POOL_WIDTH,right:(i+1)*FURNACE_LAVA_POOL_WIDTH});
    expect(regions[33]).toMatchObject({left:FURNACE_BOSS_CHECKPOINT,right:FURNACE_BOSS_CHECKPOINT+FURNACE_LAVA_APRON_WIDTH});
    expect(regions.map(r=>r.surfaceY)).toEqual([456,336,456,456,328,176,176,64,176,176,129,-124,-124,-236,-124,-124,4,176,176,129,-48,-124,-236,-124,-124,4,176,176,224,456,456,409,456,456]);
    expect(regions[0].surfaceY).not.toBe(regions[1].surfaceY);
    console.log('BAD SURFS',regions.filter(r=>r.surfaceY<0||r.surfaceY>=700));expect(regions.some(r=>r.surfaceY>=700)).toBe(false);
  });

  it('keeps every authored platform and lift lower extreme at least 32px above its basin',()=>{
    for(let roomIndex=0;roomIndex<FURNACE_ROOMS.length;roomIndex++){
      const room=FURNACE_ROOMS[roomIndex],base=roomIndex*FURNACE_ROOM_WIDTH;
      const supports=[{left:base,right:base+192,top:room.entryTop,height:64,lift:false},{left:base+1352,right:base+1440,top:room.exitTop,height:64,lift:false},...room.steps.map((p,i)=>({left:base+p.x-p.width/2,right:base+p.x+p.width/2,top:p.top,height:48,lift:room.machines.some(m=>m.step===i&&m.type==='lift')}))];
      for(const support of supports){
        const extremeBottom=support.top+(support.lift?65:0)+support.height;
        for(const region of regions.slice(roomIndex*3,roomIndex*3+3))if(support.left<region.right&&support.right>region.left)expect(region.surfaceY-extremeBottom).toBeGreaterThanOrEqual(32);
      }
    }
    expect(regions[33].surfaceY-424).toBe(32);
  });

  it('uses exact lethal surface edges and only kills when body bottom reaches the surface',()=>{
    const r=regions[0],above={left:r.left+4,right:r.left+20,top:r.surfaceY-20,bottom:r.surfaceY-1};
    expect(bodyTouchesFurnaceLava(above,regions)).toBe(false);
    expect(bodyTouchesFurnaceLava({...above,bottom:r.surfaceY},regions)).toBe(true);
    const farEdge=regions[regions.length-1].right;expect(bodyTouchesFurnaceLava({...above,left:farEdge,right:farEdge+15,bottom:r.surfaceY},regions)).toBe(false);
    expect(bodyTouchesFurnaceLava({...above,left:r.left-12,right:r.left,bottom:r.surfaceY},regions)).toBe(false);
  });



  it('uses full deep imagery, an exact 48px native surface tile, and nonphysical masonry dividers',()=>{
    const {scene,created}=sceneFixture(),player:any={body:{left:-20,right:20,top:0,bottom:20,center:{x:0,y:10}},takeDamage:vi.fn()};
    const lava=new FurnaceLava(scene,player,()=>.5),deep=created.find(o=>o.args[4]==='furnace-lava-basin'),surface=created.find(o=>o.args[4]==='furnace-lava-surface'),dividers=created.filter(o=>o.args[4]==='identity-crimson');
    expect(deep?.args).toHaveLength(5);expect(deep?.object.tileScale).toEqual({x:.5,y:.5});
    expect(surface?.object.tileScale).toEqual({x:48/180,y:48/180});
    const layouts=buildFurnaceLavaDividers(regions);
    expect(dividers.length).toBe(layouts.length);
    expect(dividers.every(d=>d.args[5]==='foundation'&&d.object.depth===-14)).toBe(true);lava.destroy();
  });

  it('supports all 23 unequal basins to world bottom and feeds every rise toward the higher reservoir',()=>{
    const walls=buildFurnaceLavaDividers(regions),feeds=buildFurnaceLavaFeeds(regions);
    expect(walls.length).toBe(regions.slice(0,-1).filter((r,i)=>r.surfaceY!==regions[i+1].surfaceY).length);
    expect(walls.every(w=>w.bottom===700&&w.height===700-w.top&&w.x%FURNACE_LAVA_POOL_WIDTH===0)).toBe(true);
    expect(feeds.length).toBe(23);
    expect(Math.min(...feeds.map(f=>f.lowerSurfaceY-f.upperSurfaceY))).toBe(47);
    for(const feed of feeds){
      const index=regions.findIndex(r=>r.right===feed.x),left=regions[index],right=regions[index+1];
      expect(feed.highSide).toBe(left.surfaceY<right.surfaceY?'left':'right');
      expect(feed.upperSurfaceY).toBe(Math.min(left.surfaceY,right.surfaceY));
      expect(feed.lowerSurfaceY-feed.upperSurfaceY).toBeGreaterThanOrEqual(FURNACE_LAVA_FEED_MIN_RISE);
      expect(feed.pumpY).toBe(feed.lowerSurfaceY+22);expect(feed.outletY).toBe(feed.upperSurfaceY+12);
      expect(feed.conduitHeight).toBe(feed.lowerSurfaceY-feed.upperSurfaceY-23);
      expect(feed.outletX).toBe(feed.x+(feed.highSide==='left'?-9:9));
      expect(feed.outletY-12).toBeGreaterThanOrEqual(feed.upperSurfaceY);
    }
    expect(sceneAssetEntries('furnace').some(a=>a.key==='furnace-lava-feed')).toBe(true);
    expect(sceneAssetEntries('rescue').some(a=>a.key==='furnace-lava-feed')).toBe(false);
    const {scene,created}=sceneFixture(),player:any={body:{left:-20,right:20,top:0,bottom:20,center:{x:0,y:10}},takeDamage:vi.fn()},lava=new FurnaceLava(scene,player,()=>.5);
    const art=created.filter(o=>o.args.includes('furnace-lava-feed')),pumpCount=feeds.length;
    expect(art.filter(o=>o.kind==='tile').length).toBe(pumpCount*3);
    for(const feed of (lava as any).feeds){
      expect(feed.molten.x).toBe(feed.layout.x);expect(feed.molten.y).toBe(feed.layout.conduitY);
      expect(feed.casingLeft.depth).toBe(-13);expect(feed.casingRight.depth).toBe(-13);expect(feed.molten.depth).toBe(-13.1);
      expect(feed.pump.depth).toBe(-12);expect(feed.outlet.depth).toBe(-12);
      expect(feed.outlet.x).toBe(feed.layout.outletX);
      expect(feed.outlet.visible).toBe(true);expect(feed.pump.displaySize).toEqual({width:42,height:42});expect(feed.outlet.displaySize).toEqual({width:32,height:24});
      const outlet=created.find(o=>o.object===feed.outlet);expect(outlet?.args[3]).toBe(feed.layout.highSide==='left'?'outletLeft':'outletRight');
    }
    const pipe=(lava as any).feeds[0];expect(pipe.casingLeft.tilePositionY).toBe(0);expect(pipe.casingRight.tilePositionY).toBe(0);expect(pipe.molten.tilePositionY).toBe(0);
    lava.update(50);expect(pipe.casingLeft.tilePositionY).toBe(0);expect(pipe.casingRight.tilePositionY).toBe(0);expect(pipe.molten.tilePositionY).toBeGreaterThan(0);expect(pipe.gear.rotation).toBeGreaterThan(0);
    const before=pipe.molten.tilePositionY;lava.suspend();lava.update(5000);expect(pipe.casingLeft.tilePositionY).toBe(0);expect(pipe.casingRight.tilePositionY).toBe(0);expect(pipe.molten.tilePositionY).toBe(before);
    lava.destroy();expect(created.every(o=>o.object.destroyed)).toBe(true);
  });

  it('tests neighboring surface retirement at the blob current world X',()=>{
    expect(furnaceLavaSurfaceAt(479,regions)).toBe(regions[0].surfaceY);
    expect(furnaceLavaSurfaceAt(480,regions)).toBe(regions[1].surfaceY);
    const motion:any={x:480,y:340,surfaceY:regions[0].surfaceY};
    expect(motion.y+7< motion.surfaceY).toBe(true);
    expect(furnaceLavaMotionTouchesSurface(motion,regions)).toBe(true);
    const {scene}=sceneFixture(),player:any={body:{left:2000,right:2046,top:0,bottom:50,center:{x:2023,y:25}},takeDamage:vi.fn()};const lava=new FurnaceLava(scene,player,()=>.5),blob=(lava as any).blobs[0];
    blob.active=true;Object.assign(blob.motion,{x:479.5,y:340,vx:60,vy:0,ageMs:0,surfaceY:regions[0].surfaceY,ttlMs:5000});blob.previousX=479.5;blob.previousY=340;blob.image.setVisible(true);lava.update(16);
    expect(blob.motion.x).toBeGreaterThan(480);expect(blob.active).toBe(false);lava.destroy();
  });

  it('preserves at least one safe jump for every authored edge at 30, 60 and 120 FPS',()=>{
    for(const fps of [30,60,120])for(let roomIndex=0;roomIndex<FURNACE_ROOMS.length;roomIndex++){
      const route=furnaceRoute(roomIndex),solids=[...route,{x:1396,top:FURNACE_ROOMS[roomIndex].exitTop,width:88}];
      for(let edge=1;edge<route.length;edge++){
        const options=furnaceJumpOptions(route[edge-1],route[edge],fps,solids);
        const safe=(jump:any)=>jump.samples.every((sample:any)=>!bodyTouchesFurnaceLava({left:roomIndex*FURNACE_ROOM_WIDTH+sample.x-TUNING.player.bodyWidth/2,right:roomIndex*FURNACE_ROOM_WIDTH+sample.x+TUNING.player.bodyWidth/2,top:sample.feet-TUNING.player.bodyHeight,bottom:sample.feet},regions));
        expect(options.some(safe),`room ${roomIndex+1}, edge ${edge-1}, ${fps} FPS`).toBe(true);
      }
    }
  },30000);

  it('holds eruption origins outside permanent refuge margins and player exclusion',()=>{
    const r=regions[0],playerX=300,intervals=furnaceLavaEligibleIntervals(r,playerX);
    expect(intervals.length).toBeGreaterThan(0);
    for(const interval of intervals){
      expect(interval.left).toBeGreaterThanOrEqual(r.left);expect(interval.right).toBeLessThanOrEqual(r.right);
      expect(interval.right<=playerX-80||interval.left>=playerX+80).toBe(true);
      for(const refuge of r.refugetops)expect(interval.right<=refuge.left||interval.left>=refuge.right).toBe(true);
    }
    expect(furnaceLavaPointInIntervals(intervals,()=>0)).toBe(intervals[0].left);
    expect(furnaceLavaPointInIntervals([],()=>.5)).toBeUndefined();
    expect(FURNACE_LAVA_REFUGE_MARGIN).toBe(64);
    const neighborCross=regions[3];expect(neighborCross.refugetops.some(s=>s.left===neighborCross.left&&s.right===neighborCross.left+64)).toBe(true);
  });

  it('randomizes delay, origin, arc and horizontal motion within deliberate bounds',()=>{
    expect(furnaceLavaNextDelay(()=>0)).toBe(3500);expect(furnaceLavaNextDelay(()=>1)).toBeLessThan(7500);
    const low=makeFurnaceLavaMotion(100,456,()=>0),high=makeFurnaceLavaMotion(300,456,()=>.999);
    expect(low.x).toBe(100);expect(high.x).toBe(300);expect(low.y).toBe(448);expect(low.vy).toBeLessThan(-360);expect(high.vy).toBeGreaterThan(-465);
    expect(low.vx).toBe(-35);expect(high.vx).toBeLessThan(35);
    advanceFurnaceLavaMotion(low,5000);expect(low.ageMs).toBe(FURNACE_LAVA_MAX_DELTA);expect(low.y).toBeLessThan(448);
  });

  it('sweeps the visible inset core against the target to avoid tunneling',()=>{
    const target={left:100,right:120,top:100,bottom:130};
    expect(furnaceLavaSweptContact(0,115,240,115,target)).toBe(true);
    expect(furnaceLavaSweptContact(0,80,240,80,target)).toBe(false);
    expect(furnaceLavaSweptContact(0,115,80,115,target)).toBe(false);
  });

  it('shows a prelaunch tell, damages only on blob contact, caps/reuses blobs and cleans up',()=>{
    const {scene,objects,listeners}=sceneFixture(),takeDamage=vi.fn(()=>true);
    const randomValues=[0,0,0,.5,.5,.5,.5,.5,.5,.5,.5];let randomIndex=0;const random=()=>randomValues[randomIndex++]??.5;
    const player:any={body:{left:285,right:315,top:390,bottom:430,center:{x:300,y:410}},takeDamage};
    const lava=new FurnaceLava(scene,player,random);
    expect((lava as any).blobs).toHaveLength(FURNACE_LAVA_BLOB_POOL_SIZE);
    expect((lava as any).blobs.every((b:any)=>!b.active)).toBe(true);
    const tick=(ms:number)=>{for(let left=ms;left>0;){const step=Math.min(FURNACE_LAVA_MAX_DELTA,left);lava.update(step);left-=step;}};
    tick(3500);expect(takeDamage).not.toHaveBeenCalled();expect((lava as any).warnings.some((w:any)=>w.image.visible)).toBe(true);
    const warning=(lava as any).warnings.find((w:any)=>w.image.visible),warnX=warning.x;
    tick(699);expect(takeDamage).not.toHaveBeenCalled();expect((lava as any).blobs.some((b:any)=>b.active)).toBe(false);
    tick(1);expect(takeDamage).not.toHaveBeenCalled();expect((lava as any).blobs.some((b:any)=>b.active)).toBe(true);expect((lava as any).blobs.filter((b:any)=>b.active).every((b:any)=>b.motion.x===warnX)).toBe(true);
    const blob=(lava as any).blobs.find((b:any)=>b.active);blob.motion.x=player.body.center.x;blob.motion.y=player.body.center.y;blob.motion.vx=0;blob.motion.vy=0;blob.motion.surfaceY=1000;blob.previousX=player.body.center.x;blob.previousY=player.body.center.y;
    lava.update(16);expect(takeDamage).toHaveBeenCalledWith(player.body.center.x,.5);expect(blob.active).toBe(false);
    const ttlBlob=(lava as any).blobs.find((b:any)=>!b.active);ttlBlob.active=true;Object.assign(ttlBlob.motion,{x:500,y:100,vx:0,vy:0,ageMs:4999,surfaceY:1000,ttlMs:5000});ttlBlob.previousX=500;ttlBlob.previousY=100;ttlBlob.image.setVisible(true);lava.update(16);expect(ttlBlob.active).toBe(false);
    const count=objects.length;for(let i=0;i<30;i++)lava.update(50);expect(objects).toHaveLength(count);
    for(const fn of listeners.get('shutdown')??[])fn();expect(objects.every(o=>o.destroyed)).toBe(true);lava.update(50);
  });

  it('cancels a warning if the player enters its exclusion before launch',()=>{
    const {scene}=sceneFixture(),takeDamage=vi.fn(()=>true),player:any={body:{left:285,right:315,top:390,bottom:430,center:{x:300,y:410}},takeDamage};
    const lava=new FurnaceLava(scene,player,()=>0),tick=(ms:number)=>{for(let left=ms;left>0;){const step=Math.min(FURNACE_LAVA_MAX_DELTA,left);lava.update(step);left-=step;}};
    tick(3500);const warning=(lava as any).warnings.find((w:any)=>w.image.visible);expect(warning.x).toBe(380);player.body.center.x=340;player.body.left=325;player.body.right=355;tick(700);
    expect((lava as any).blobs.every((b:any)=>!b.active)).toBe(true);expect(warning.image.visible).toBe(false);expect(takeDamage).not.toHaveBeenCalled();lava.destroy();
  });

  it('suspends timers and blobs and drops the first resume delta',()=>{
    const {scene}=sceneFixture(),takeDamage=vi.fn(()=>true),player:any={body:{left:285,right:315,top:390,bottom:430,center:{x:300,y:410}},takeDamage};
    const lava=new FurnaceLava(scene,player,()=>0),tick=(ms:number)=>{for(let left=ms;left>0;){const step=Math.min(FURNACE_LAVA_MAX_DELTA,left);lava.update(step);left-=step;}};
    tick(3500);const warning=(lava as any).warnings.find((w:any)=>w.image.visible);expect(warning.remainingMs).toBe(700);lava.suspend();lava.update(5000);expect(warning.remainingMs).toBe(700);expect((lava as any).blobs.every((b:any)=>!b.active)).toBe(true);
    lava.update(50);expect(warning.remainingMs).toBe(650);expect((lava as any).blobs.every((b:any)=>!b.active)).toBe(true);tick(650);const blob=(lava as any).blobs.find((b:any)=>b.active);expect(blob).toBeDefined();
    lava.update(50);const before={x:blob.motion.x,y:blob.motion.y,ageMs:blob.motion.ageMs},delay=(lava as any).waitMs;lava.suspend();lava.update(5000);expect(blob.motion).toMatchObject(before);expect((lava as any).waitMs).toBe(delay);
    lava.update(16);expect(blob.motion.ageMs).toBe(before.ageMs+16);expect((lava as any).waitMs).toBe(delay-16);lava.destroy();
  });

  it('has no camera dependency or screen-fixed lava and integrates suspension and lethal result into the existing paths',()=>{
    expect(lavaSource).not.toMatch(/camera|scrollFactor|worldView/i);
    expect(furnaceSceneSource).toContain('new FurnaceLava(this,this.player)');
    expect(furnaceSceneSource).toContain('const lavaContact=this.lava?.update(delta)??false');
    expect(furnaceSceneSource).toContain('if(lavaContact||this.player.body.bottom>FURNACE_FALL_LIMITS[index])');expect(furnaceSceneSource).toContain('this.lava?.suspend()');
  });
});
