import {describe,it,expect,vi} from 'vitest';
vi.mock('phaser',()=>({default:{}}));
import {Player} from '../src/entities/Player';
import {PlayerAbilities} from '../src/systems/PlayerAbilities';
import {TUNING} from '../src/config/tuning';

function playerFixture(){
 const body={velocity:{x:0,y:400},blocked:{down:false},touching:{down:false},allowGravity:true,
  setAllowGravity(value:boolean){this.allowGravity=value;return this;},
  setVelocity(x:number,y:number){this.velocity={x,y};return this;},
  setVelocityX(x:number){this.velocity.x=x;return this;},
  setVelocityY(y:number){this.velocity.y=y;return this;},
  setAcceleration(){return this;},setEnable(){return this;}};
 const player=Object.create(Player.prototype) as Player;
 Object.assign(player,{body,sprite:{x:100,scene:{time:{now:1000}}},visual:{setAlpha:vi.fn()},lifeState:'ACTIVE',health:3,facing:1,
  ultimateUntil:0,abilities:new PlayerAbilities(TUNING.player),airTuck:{update:()=>false},
  jumpAssist:{recordPress:vi.fn(),canJump:()=>false},invulnerableUntil:0});
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
});
