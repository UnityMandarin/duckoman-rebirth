import {afterEach,describe,expect,it,vi} from 'vitest';
const {ultimateSpy}=vi.hoisted(()=>({ultimateSpy:vi.fn()}));
vi.mock('phaser',()=>({default:{Math:{Clamp:(v:number,min:number,max:number)=>Math.max(min,Math.min(max,v))}}}));
vi.mock('../src/systems/UltimateSwing',()=>({playUltimateSwing:ultimateSpy}));
import {dashFillCrop,drawDashMeter,drawSwordMeter,heartFillAmount} from '../src/systems/ChapterHud';
import {ChapterHud} from '../src/systems/ChapterHud';
import {alignSwordMeterFill,setSwordMeterCharge,SWORD_METER} from '../src/systems/SwordMeterArt';

describe('original chapter HUD art',()=>{
 it('preserves clipped fractional heart fills',()=>{
  expect(heartFillAmount(2.5,0)).toBe(1);expect(heartFillAmount(2.5,1)).toBe(1);
  expect(heartFillAmount(2.5,2)).toBe(.5);expect(heartFillAmount(2.5,3)).toBe(0);
 });
 it('crops the original sword blade through its aperture at zero, partial, and full charge',()=>{
  const fill={setCrop:vi.fn()};
  setSwordMeterCharge(fill as never,0);expect(fill.setCrop).toHaveBeenLastCalledWith(0,340,0,44);
  setSwordMeterCharge(fill as never,.5);expect(fill.setCrop).toHaveBeenLastCalledWith(0,340,1086,44);
  setSwordMeterCharge(fill as never,1);expect(fill.setCrop).toHaveBeenLastCalledWith(0,340,2172,44);
  // Spending an ultimate empties this same original fill crop.
  setSwordMeterCharge(fill as never,0);expect(fill.setCrop).toHaveBeenLastCalledWith(0,340,0,44);
 });
 it('keeps the sword fill aligned inside the native frame and uses the dash atlas width',()=>{
  const fill={setOrigin:vi.fn().mockReturnThis(),setPosition:vi.fn().mockReturnThis(),setDisplaySize:vi.fn().mockReturnThis(),setCrop:vi.fn().mockReturnThis()};
  alignSwordMeterFill(fill as never);
  const scaleY=SWORD_METER.fillHeight/44;
  expect(fill.setOrigin).toHaveBeenCalledWith(0);
  expect(fill.setPosition).toHaveBeenCalledWith(SWORD_METER.fillX,SWORD_METER.fillY-340*scaleY);
  expect(fill.setDisplaySize).toHaveBeenCalledWith(SWORD_METER.fillWidth,724*scaleY);
  expect(fill.setCrop).toHaveBeenCalledWith(0,340,0,44);
  expect(dashFillCrop(0)).toBe(0);expect(dashFillCrop(.4)).toBe(202);expect(dashFillCrop(1)).toBe(505);
 });
 it('draws the unwarped frame and the matching partial source aperture in the local glass foreground',()=>{
  for(const [charge,sourceWidth,destWidth] of [[0,0,0],[.5,1086,93.5],[1,2172,187]] as const){
   const draws=vi.fn(),ctx={clearRect:vi.fn(),drawImage:draws,globalAlpha:1};
   drawSwordMeter(ctx as never,'frame' as never,'fill' as never,charge);
   if(charge>0)expect(draws).toHaveBeenNthCalledWith(1,'fill',0,340,sourceWidth,44,37,25.5,destWidth,9.5);
   expect(draws).toHaveBeenLastCalledWith('frame',0,0,300,64);
  }
 });
 it('draws the native dash atlas slices with partial width and disabled alpha',()=>{
  const draws=vi.fn(),alphaWrites:number[]=[];let alpha=1;const ctx={clearRect:vi.fn(),drawImage:draws,get globalAlpha(){return alpha;},set globalAlpha(value:number){alpha=value;alphaWrites.push(value);}};
  drawDashMeter(ctx as never,'atlas' as never,.4,true);
  expect(draws.mock.calls[0]?.slice(0,7)).toEqual(['atlas',561,472,202,140,0,0]);expect(draws.mock.calls[0]?.[7]).toBeCloseTo(38.8);expect(draws.mock.calls[0]?.[8]).toBe(13);
  expect(ctx.globalAlpha).toBe(1);
  expect(alphaWrites).toEqual([.5,1]);
  expect(draws).toHaveBeenLastCalledWith('atlas',23,472,503,140,0,0,97,13);
 });
});

class TestEvents {
 listeners=new Map<string,Set<(...args:unknown[])=>void>>();
 on(name:string,fn:(...args:unknown[])=>void):this{const set=this.listeners.get(name)??new Set();set.add(fn);this.listeners.set(name,set);return this;}
 off(name:string,fn:(...args:unknown[])=>void):this{this.listeners.get(name)?.delete(fn);return this;}
 emit(name:string):void{for(const fn of [...(this.listeners.get(name)??[])])fn();}
}
class TestElement {
 className='';classNames=new Set<string>();children:TestElement[]=[];selectors=new Map<string,TestElement>();style:Record<string,string>={};hidden=false;textContent='';title='';width=0;height=0;removed=false;inner='';clientWidth=640;
 classList={add:(v:string)=>this.classNames.add(v),remove:(v:string)=>this.classNames.delete(v),toggle:(v:string,on?:boolean)=>{const state=on??!this.classNames.has(v);if(state)this.classNames.add(v);else this.classNames.delete(v);return state;}};
 set innerHTML(value:string){this.inner=value;for(const selector of ['.game-hud-sword','.game-hud-ultimate','.game-hud-dash','.game-hud-duck']){const item=new TestElement();if(selector==='.game-hud-sword'){item.width=600;item.height=128;}if(selector==='.game-hud-dash'){item.width=194;item.height=26;}this.selectors.set(selector,item);}}
 get innerHTML():string{return this.inner;}
 setAttribute():void{}
 appendChild<T extends TestElement>(el:T):T{this.children.push(el);return el;}
 querySelector(selector:string):TestElement|null{return this.selectors.get(selector)??null;}
 remove():void{this.removed=true;}
 getContext():CanvasRenderingContext2D{return {clearRect:vi.fn(),drawImage:vi.fn(),setTransform:vi.fn(),globalAlpha:1} as never;}
}
const observer={disconnect:vi.fn()};
let restoreHudSword:((visible:boolean)=>void)|undefined;
afterEach(()=>{vi.unstubAllGlobals();ultimateSpy.mockReset();observer.disconnect.mockReset();restoreHudSword=undefined;});

describe('DOM glass foreground lifecycle',()=>{
 it('hides/restores the glass layer and footer, refreshes sword charge on return, and disconnects on shutdown',()=>{
  const root=new TestElement(),events=new TestEvents();root.querySelector=()=>null;
  const elements=root.children;
  vi.stubGlobal('document',{getElementById:()=>root,createElement:()=>new TestElement()});
  let resizeCallback:(()=>void)|undefined;
  vi.stubGlobal('ResizeObserver',class {constructor(callback:()=>void){resizeCallback=callback;}observe=vi.fn();disconnect=observer.disconnect;});
  const texture={getSourceImage:()=>({}),has:()=>true,add:vi.fn()};
  const scene={events,time:{now:0},registry:{get:()=>[]},textures:{get:()=>texture,exists:()=>true},add:{image:()=>new DrawObject(),text:()=>new DrawObject()}};
  const player={health:3,ultimateCharge:100,usingUltimate:false,dashCharge:1,dashDisabled:false};
  ultimateSpy.mockImplementation((_scene,_player,hud)=>{restoreHudSword=hud.setVisible;});
  const hud=new ChapterHud(scene as never,player as never),layer=elements[0],controls=elements[1];
  expect(resizeCallback).toBeTypeOf('function');expect(layer.className).toBe('game-hud-dom');expect(controls.className).toBe('game-controls');
  events.emit('pause');expect(layer.hidden).toBe(true);expect(controls.hidden).toBe(true);
  events.emit('resume');expect(layer.hidden).toBe(false);expect(controls.hidden).toBe(false);
  hud.useUltimate();player.ultimateCharge=0;restoreHudSword?.(false);expect(layer.classNames.has('ultimate-in-flight')).toBe(true);
  restoreHudSword?.(true);expect(layer.classNames.has('ultimate-in-flight')).toBe(false);
  events.emit('shutdown');expect(layer.removed).toBe(true);expect(controls.removed).toBe(true);expect(observer.disconnect).toHaveBeenCalledOnce();expect(events.listeners.get('pause')?.size??0).toBe(0);
 });
});

class DrawObject {
 setOrigin():this{return this;}setPosition():this{return this;}setDisplaySize():this{return this;}setCrop():this{return this;}
 setScrollFactor():this{return this;}setDepth():this{return this;}setVisible():this{return this;}setAlpha():this{return this;}
 setY():this{return this;}setText():this{return this;}
}
