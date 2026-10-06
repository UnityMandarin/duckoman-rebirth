import {describe,expect,it,vi} from 'vitest';
import {addCheckpointVisual} from '../src/systems/CheckpointVisual';

function fixture(originY:number,coreYRatio=.65,initiallyActive=false,haloColor=0xffc95f,coreColor=0xffefb0){
 const shape=()=>({x:0,y:0,visible:true,alpha:0,scale:1,destroy:vi.fn(),setDepth:vi.fn().mockReturnThis(),setPosition(x:number,y:number){this.x=x;this.y=y;return this;},setVisible(value:boolean){this.visible=value;return this;},setAlpha(value:number){this.alpha=value;return this;},setScale(value:number){this.scale=value;return this;},fillStyles:[] as [number,number][],fillStyle(color:number,alpha:number){this.fillStyles.push([color,alpha]);return this;},fillEllipse:vi.fn().mockReturnThis()});
 const created:ReturnType<typeof shape>[]=[];
 const tweenAdd=vi.fn((_:unknown)=>({stop:vi.fn()}));
 const scene={add:{graphics:vi.fn(()=>{const item=shape();created.push(item);return item;}),ellipse:vi.fn((x:number,y:number)=>{const item=shape();item.x=x;item.y=y;created.push(item);return item;})},tweens:{add:tweenAdd}};
 const handlers=new Map<string,{handler:()=>void;context:unknown}>();
 const marker={x:100,y:200,displayHeight:54,originY,depth:4,active:true,tint:undefined as number|undefined,once:vi.fn((event:string,handler:()=>void,context:unknown)=>handlers.set(event,{handler,context})),setTint(value:number){this.tint=value;return this;},clearTint(){this.tint=undefined;return this;}};
 const visual=addCheckpointVisual(scene as never,marker as never,{coreYRatio,haloColor,coreColor,initiallyActive});
 return {visual,scene,marker,created,handlers,tweenAdd};
}

describe('checkpoint activation visual',()=>{
 it('shows a dim inactive marker and lights its core at the origin-aware lamp position',()=>{
  const f=fixture(.5);
  expect(f.marker.tint).toBe(0x626875);
  expect(f.created.map(shape=>shape.visible)).toEqual([false,false]);
  expect(f.created.map(shape=>shape.y)).toEqual([208.1,208.1]);
  f.visual.activate();
  expect(f.marker.tint).toBeUndefined();
  expect(f.created.map(shape=>shape.visible)).toEqual([true,true]);
  expect(f.created[0]!.alpha).toBe(.95);
  expect(f.tweenAdd).toHaveBeenCalledTimes(1);
  expect(f.tweenAdd.mock.calls[0]![0]).toMatchObject({alpha:.55,scale:1,duration:450,ease:'Cubic.Out'});
  f.visual.activate();
  expect(f.tweenAdd).toHaveBeenCalledTimes(1);
 });

 it('restores a saved active marker statically without replaying its pulse',()=>{
  const f=fixture(1,.37,true,0xff443b,0xffb18b);
  expect(f.marker.tint).toBeUndefined();
  expect(f.created.map(shape=>shape.visible)).toEqual([true,true]);
  expect(f.created.map(shape=>shape.y)).toEqual([165.98,165.98]);
  expect(f.created[0]!.alpha).toBe(.55);
  expect(f.created[0]!.fillStyles).toEqual([[0xff443b,.07],[0xff443b,.12],[0xff443b,.2]]);
  expect(f.created[1]!.fillStyles).toEqual([]);
  expect(f.created[1]!.x).toBe(100);
  expect(f.created[1]!.y).toBeCloseTo(165.98);
  expect(f.tweenAdd).not.toHaveBeenCalled();
 });

 it('places the jail rest core and uses the warm palette',()=>{
  const f=fixture(.5,.60,false,0xffc95f,0xffefb0);
  expect(f.created.map(shape=>shape.y)).toEqual([205.4,205.4]);
  expect(f.created[0]!.fillStyles).toEqual([[0xffc95f,.07],[0xffc95f,.12],[0xffc95f,.2]]);
 });

 it('destroys both overlays and stops the pulse with the marker',()=>{
  const f=fixture(.5);
  f.visual.activate();
  const stop=f.tweenAdd.mock.results[0]!.value.stop;
  const destroy=f.handlers.get('destroy');
  expect(destroy).toBeDefined();
  destroy!.handler.call(destroy!.context);
  expect(stop).toHaveBeenCalledOnce();
  expect(f.created.every(shape=>shape.destroy.mock.calls.length===1)).toBe(true);
 });
});
