import {describe,expect,it} from 'vitest';
import {TUNING} from '../src/config/tuning';
import {encounterFor,advanceWindDrift} from '../src/data/chapterChallenges';

// Conservative edge-to-edge jumps: the player's centre starts/lands 20px
// inside each ledge. No coyote jump, relic, boost or ground-dash momentum.
function flight(rise:number,wind:number,direction:number,dashAt?:number){
 const dt=1/TUNING.simulation.physicsFps;
 let y=0,x=0,minimumY=0,drift=0;
 let vy:number=TUNING.player.jumpVelocity;
 for(let frame=0;frame<180;frame++){
  const seconds=frame*dt;
  const dashing=dashAt!==undefined&&seconds>=dashAt&&seconds<dashAt+TUNING.player.dashDuration/1000;
  if(dashing){vy=0;drift=0;x+=TUNING.player.dashSpeed*dt;}
  else{
   vy=Math.min(TUNING.player.maxFallVelocity,vy+TUNING.player.gravity*dt);
   y+=vy*dt;
   drift=advanceWindDrift(drift,wind<0?-1:1,Math.abs(wind)*.9,dt,true,170);
   x+=(TUNING.player.sprintSpeed+drift*direction)*dt;
  }
  minimumY=Math.min(minimumY,y);
  if(minimumY<=-rise&&vy>0&&y>=-rise)return {reach:x,ms:(frame+1)*dt*1000};
 }
 return {reach:0,ms:Infinity};
}

describe('authored disappearing-platform route fairness',()=>{
 it('allows every affected forward jump with ordinary sprint or a forgiving air dash',()=>{
  let count=0,dashCount=0;
  for(const kind of ['jail','outside','crimson'] as const){
   for(let room=0;room<(kind==='jail'?12:kind==='outside'?22:10);room++){
    const encounter=encounterFor(kind,room)!;
    const disappearing=new Set(encounter.moving?.filter(m=>m.type==='crumble'||m.type==='shutters').map(m=>m.step));
    for(let step=0;step<encounter.steps.length-1;step++){
     if(!disappearing.has(step)&&!disappearing.has(step+1))continue;
     count++;
     const a=encounter.steps[step],b=encounter.steps[step+1],rise=a[1]-b[1];
     const required=Math.max(0,Math.abs(b[0]-a[0])-(a[2]+b[2])/2)+40;
     const wind=(encounter.wind?.direction??0)*(encounter.wind?.strength??0),direction=Math.sign(b[0]-a[0]);
     const ordinary=flight(rise,wind,direction);
     const takeoffRunMs=Math.max(0,a[2]/2-20)/TUNING.player.sprintSpeed*1000;
     expect(rise,`${kind} ${room}: ${step} -> ${step+1}`).toBeLessThan(TUNING.player.jumpVelocity**2/(2*TUNING.player.gravity));
     if(ordinary.reach-required>=40){
      expect(ordinary.ms+takeoffRunMs+300+200).toBeLessThan(2000); // centre-to-edge run + reaction + recovery
      continue;
     }
     dashCount++;
     // The tight Crimson switchback tolerates a 200ms dash-input window,
     // rather than requiring the single apex frame. Dash must be charged;
     // players can wait on a solid platform for the existing cooldown.
     const apex=-TUNING.player.jumpVelocity/TUNING.player.gravity;
     for(const offset of [-.1,-.05,0,.05,.1]){
      const dashed=flight(rise,wind,direction,apex+offset);
      expect(dashed.reach-required).toBeGreaterThan(40);
      expect(dashed.ms+takeoffRunMs+300+200).toBeLessThan(2000);
     }
    }
   }
  }
  expect(count).toBe(23);
  expect(dashCount).toBe(1);
 });
});
