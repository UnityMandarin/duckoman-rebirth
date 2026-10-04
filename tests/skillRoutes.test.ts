import {describe,it,expect} from 'vitest';
import {SKILL_ROUTES,isSkillRouteId,skillRoute} from '../src/data/skillRoutes';
import {encounterFor} from '../src/data/chapterChallenges';
import {chapterPlatforms,SECTION_WIDTH} from '../src/data/chapters';
import {TUNING} from '../src/config/tuning';

describe('authored skill routes',()=>{
 it('defines the nine approved courses with exact names, chapters, sections, and steps',()=>{
  expect(SKILL_ROUTES.map(({id,name,chapter,section,stepIndexes})=>[id,name,chapter,section,stepIndexes])).toEqual([
   ['jail-laundry','Laundry Leap','jail',2,[1,2,3]],['jail-vault','Vault Switchback','jail',5,[2,3,4]],['jail-drain','Drain Dash','jail',9,[1,2,3]],
   ['outside-market','Market Momentum','outside',3,[1,2,3]],['outside-wind','Wind Lines','outside',7,[1,2,3]],['outside-stonewater','Stonewater Beat','outside',14,[1,2,4]],
   ['crimson-avenue','Occupation Run','crimson',1,[1,2,3]],['crimson-parade','Parade Counterflow','crimson',4,[1,2,3]],['crimson-crown','Crown Circuit','crimson',8,[1,2,4]]
  ]);
 });
 it('safely recognizes and looks up IDs',()=>{expect(isSkillRouteId('jail-laundry')).toBe(true);expect(isSkillRouteId('unknown')).toBe(false);expect(isSkillRouteId(null)).toBe(false);expect(skillRoute('outside-wind')?.goal).toContain('Wind');expect(skillRoute('unknown')).toBeUndefined();});
 it('uses each authored hazard cue as its compact course goal',()=>{for(const route of SKILL_ROUTES){const encounter=encounterFor(route.chapter,route.section);const cue={rest:'A quiet road',presses:'Wait for the red line',crumble:'Cracked ledges break',relay:'Jump, land, dash',crossfire:'Red lines mark falling stone',ambush:'Choose your landing',ascent:'Climb, turn, cross',descent:'Follow the descent and watch your landing',ferry:'Ride, then jump',lift:'Ride up, then step off',gust:'Wind bends jumps; dash holds course',conveyor:'Arrows show the moving floor',shutters:'Fading ledges will vanish'}[encounter!.type];expect(route.goal).toBe(cue);}});
 it('references three distinct existing steps with feasible consecutive transitions',()=>{for(const route of SKILL_ROUTES){const start=route.section*SECTION_WIDTH,steps=chapterPlatforms(route.chapter).filter(ledge=>ledge.height<60&&ledge.x>=start&&ledge.x<start+SECTION_WIDTH);const selected=route.stepIndexes.map(index=>steps[index]);expect(selected.every(Boolean),route.id).toBe(true);expect(new Set(selected).size,route.id).toBe(3);for(let i=1;i<selected.length;i++){const source=selected[i-1]!,target=selected[i]!,rise=(source.y-source.height/2)-(target.y-target.height/2),v=-TUNING.player.jumpVelocity,g=TUNING.player.gravity,discriminant=v*v-2*g*rise;expect(discriminant,route.id).toBeGreaterThanOrEqual(0);const airtime=(v+Math.sqrt(discriminant))/g,gap=Math.max(0,Math.abs(target.x-source.x)-(target.width+source.width)/2-TUNING.player.bodyWidth),reach=airtime*TUNING.player.sprintSpeed+TUNING.player.dashSpeed*TUNING.player.dashDuration/1000;expect(gap,`${route.id} step ${i}`).toBeLessThanOrEqual(reach);}}});
});
