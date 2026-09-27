import {describe,it,expect,vi} from 'vitest';
import {Dashable} from '../src/entities/Dashable';
import type {Player} from '../src/entities/Player';
import type {Rect} from '../src/systems/contactRules';

class Target extends Dashable {
 bounds:Rect|null={left:0,right:10,top:0,bottom:10};
 hits:{x:number;y:number}[]=[];
 protected dashBounds(){return this.bounds;}
 protected onDash(_player:Player,impulse:{x:number;y:number}){this.hits.push(impulse);}
}

function playerStub(hitting:boolean){
 return {dashHits:vi.fn(()=>hitting),dashVelocity:{x:440,y:0},bounceFromDash:vi.fn()} as unknown as Player&{bounceFromDash:ReturnType<typeof vi.fn>};
}

describe('Dashable',()=>{
 it('applies the dash and bounces the player off when the dash connects',()=>{
  const target=new Target(),player=playerStub(true);
  expect(target.checkDash(player)).toBe(true);
  expect(target.hits).toEqual([{x:440,y:0}]);
  expect(player.bounceFromDash).toHaveBeenCalledOnce();
 });
 it('does nothing when the dash misses',()=>{
  const target=new Target(),player=playerStub(false);
  expect(target.checkDash(player)).toBe(false);
  expect(target.hits).toEqual([]);
  expect(player.bounceFromDash).not.toHaveBeenCalled();
 });
 it('cannot be dashed once it has no bounds',()=>{
  const target=new Target(),player=playerStub(true);target.bounds=null;
  expect(target.checkDash(player)).toBe(false);
  expect(player.bounceFromDash).not.toHaveBeenCalled();
 });
 it('bounces the player even when the hit itself is ignored',()=>{
  const player=playerStub(true);
  class Invulnerable extends Target {protected onDash(){}}
  new Invulnerable().receiveDash(player);
  expect(player.bounceFromDash).toHaveBeenCalledOnce();
 });
});
