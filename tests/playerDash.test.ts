import {describe,it,expect,vi} from 'vitest';
vi.mock('phaser',()=>({default:{}}));
import {Player} from '../src/entities/Player';
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
 it('jumping cancels the dash and carries dash speed until reversed',()=>{
  const {player,body}=playerFixture();
  Object.assign(player,{jumpAssist:new JumpAssist()});body.blocked.down=true;
  player.update({...input,jumpPressed:false},16);
  player.sprite.scene.time.now=1100;player.update({...input,dashPressed:false},16);
  expect(player.isDashing).toBe(false);expect(body.allowGravity).toBe(true);
  expect(body.velocity).toEqual({x:TUNING.player.dashSpeed,y:TUNING.player.jumpVelocity});
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
 it('keeps striking through the dash-hit bounce so piled-up enemies break instead of hurting',()=>{
  const {player}=playerFixture();player.update({...input,jumpPressed:false},16);
  player.bounceFromDash();
  expect(player.isDashing).toBe(false);expect(player.dashStriking).toBe(true);
  player.sprite.scene.time.now+=TUNING.player.dashBounce.lockTime;
  expect(player.dashStriking).toBe(false);
 });
 it('refuses a second dash in the same airborne period',()=>{
  const {player}=playerFixture();player.update(input,16);
  player.sprite.scene.time.now=3000;player.update(input,16);
  expect(player.isDashing).toBe(false);
 });
});
