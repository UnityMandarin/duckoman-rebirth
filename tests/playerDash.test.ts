import {describe,it,expect,vi} from 'vitest';
vi.mock('phaser',()=>({default:{}}));
import {dashEffectRotation,Player} from '../src/entities/Player';
import {PlayerAbilities} from '../src/systems/PlayerAbilities';
import {JumpAssist} from '../src/systems/JumpAssist';
import {TUNING} from '../src/config/tuning';

function playerFixture(){
 const body={velocity:{x:0,y:400},blocked:{down:false},touching:{down:false},allowGravity:true,
  setAllowGravity(value:boolean){this.allowGravity=value;return this;},
  setVelocity(x:number,y:number){this.velocity={x,y};return this;},
  setVelocityX(x:number){this.velocity.x=x;return this;},
  setVelocityY(y:number){this.velocity.y=y;return this;},
  setAcceleration(){return this;},setEnable(){return this;},setSize(){return this;},setOffset(){return this;}};
 const player=Object.create(Player.prototype) as Player;
 Object.assign(player,{body,sprite:{x:100,scene:{time:{now:1000}}},visual:{setAlpha:vi.fn()},lifeState:'ACTIVE',health:3,facing:1,
  ultimateUntil:0,abilities:new PlayerAbilities(TUNING.player),airTuck:{update:()=>false},
  jumpAssist:{recordPress:vi.fn(),canJump:()=>false},invulnerableUntil:0,appliedSpeedScale:1});
 return {player,body};
}
const input={horizontal:1 as const,down:false,downPressed:false,dashPressed:true,sprintPressed:false,jumpPressed:true,jumpReleased:false,anyResetInput:false};
describe('horizontal dash integration',()=>{
 it('cancels vertical velocity and gravity, including simultaneous jump input',()=>{
  const {player,body}=playerFixture();player.update(input,16);
  expect(body.allowGravity).toBe(false);expect(body.velocity).toEqual({x:TUNING.player.dashSpeed,y:0});
 });
 it('restores gravity when dash expires',()=>{
  const {player,body}=playerFixture();player.update(input,16);
  player.sprite.scene.time.now=1400;player.update({...input,dashPressed:false,jumpPressed:false},16);
  expect(body.allowGravity).toBe(true);
 });
 it('restores gravity on a stomp or damage interruption',()=>{
  const {player,body}=playerFixture();player.update(input,16);player.bounceFromStomp();
  expect(body.allowGravity).toBe(true);expect(body.velocity.y).toBeLessThan(0);
  player.sprite.scene.time.now=2000;player.update(input,16);player.takeDamage(200);
  expect(body.allowGravity).toBe(true);expect(player.isDashing).toBe(false);
 });
  it('jumping cancels the dash lock but keeps the hitbox for the dash duration',()=>{
  const {player,body}=playerFixture();
  Object.assign(player,{jumpAssist:new JumpAssist()});body.blocked.down=true;
  Object.assign(body,{center:{x:100,y:200}});
  player.update({...input,jumpPressed:false},16);
  player.sprite.scene.time.now=1100;player.update({...input,dashPressed:false},16);
  expect(player.isDashing).toBe(true);expect(player.dashEffectActive).toBe(true);
  expect(player.dashHits({left:100,right:140,top:180,bottom:220})).toBe(true);
  expect(body.allowGravity).toBe(true);
  expect(body.velocity).toEqual({x:TUNING.player.dashSpeed,y:TUNING.player.jumpVelocity});
  expect(dashEffectRotation(body.velocity,1)).toBeLessThan(0);
  player.sprite.scene.time.now=1000+TUNING.player.dashDuration;
  expect(player.isDashing).toBe(false);expect(player.dashEffectActive).toBe(false);
  expect(player.dashHits({left:100,right:140,top:180,bottom:220})).toBe(false);
  body.blocked.down=false;
  player.sprite.scene.time.now=1500;player.update({...input,horizontal:0 as never,dashPressed:false,jumpPressed:false},16);
  expect(body.velocity.x).toBe(TUNING.player.dashSpeed);
  player.update({...input,horizontal:-1 as never,dashPressed:false,jumpPressed:false},16);
  expect(body.velocity.x).toBe(-TUNING.player.maxRunSpeed);
 });
 it('dash hitbox is a circle around the body that only hits while dashing',()=>{
  const {player,body}=playerFixture();Object.assign(body,{center:{x:100,y:200}});
  const reach=TUNING.player.dashHitboxRadius;
  const target={left:100+reach-5,right:100+reach+40,top:180,bottom:220};
  expect(player.dashHits(target)).toBe(false);
  player.update({...input,jumpPressed:false},16);
  expect(player.dashHits(target)).toBe(true);
  expect(player.dashHits({...target,left:100+reach+5})).toBe(false);
 });
 it('aims the dash crescent along travel, steeper on a boosted jump',()=>{
  expect(dashEffectRotation({x:TUNING.player.dashSpeed,y:0},1)).toBe(0);
  expect(dashEffectRotation({x:-TUNING.player.dashSpeed,y:0},-1)).toBe(Math.PI);
  const jump=dashEffectRotation({x:TUNING.player.dashSpeed,y:TUNING.player.jumpVelocity},1);
  const boost=dashEffectRotation({x:TUNING.player.dashSpeed,y:TUNING.player.boostedJumpVelocity},1);
  expect(jump).toBeLessThan(0);
  expect(boost).toBeLessThan(jump);
 });
 it('refuses a second dash in the same airborne period',()=>{
  const {player}=playerFixture();player.update(input,16);
  player.sprite.scene.time.now=3000;player.update(input,16);
  expect(player.isDashing).toBe(false);
 });
});
