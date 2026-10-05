import {createRequire} from 'node:module';
import {join} from 'node:path';
import {describe,expect,it,vi} from 'vitest';

vi.mock('phaser',()=>({default:{WEBGL:1,Scale:{FIT:2,CENTER_BOTH:3}}}));
vi.mock('../src/scenes/Gate1Scene',()=>({Gate1Scene:class{}}));
vi.mock('../src/scenes/CastleSecretScene',()=>({CastleSecretScene:class{}}));
vi.mock('../src/scenes/JailScene',()=>({
 JailScene:class{},OutsideScene:class{},CrimsonScene:class{},RegentPracticeScene:class{},CrabPracticeScene:class{},
 JailRoutePracticeScene:class{},OutsideRoutePracticeScene:class{},CrimsonRoutePracticeScene:class{}
}));
vi.mock('../src/systems/renderScale',()=>({canvasSize:()=>({width:1280,height:720})}));
vi.mock('../src/scenes/BootScene',()=>({BootScene:class{}}));
vi.mock('../src/scenes/MenuScene',()=>({MenuScene:class{}}));
vi.mock('../src/scenes/JournalScene',()=>({JournalScene:class{}}));
vi.mock('../src/scenes/RouteSelectScene',()=>({RouteSelectScene:class{}}));
vi.mock('../src/scenes/RescueScene',()=>({RescueScene:class{}}));

import {gameConfig} from '../src/config/gameConfig';

const require=createRequire(import.meta.url);
const PhaserTimeStep=require(join(process.cwd(),'node_modules/phaser/src/core/TimeStep.js')) as new(game:unknown,config:Record<string,unknown>)=>any;

function runTenSeconds(refreshRate:number,jitter:boolean):{elapsed:number;delivered:number} {
 const step=new PhaserTimeStep({},gameConfig.fps as Record<string,unknown>);
 for(let i=0;i<step.deltaSmoothingMax;i++)step.deltaHistory[i]=step._target;
 step.deltaIndex=0;step._coolDown=0;step.delta=0;step.lastTime=0;step.nextFpsUpdate=Number.MAX_SAFE_INTEGER;
 let delivered=0;step.callback=(_time:number,delta:number)=>{delivered+=delta;};
 const intervals=jitter?[.8,1.15,1.05,1]:[1];
 let time=0;
 for(let frame=0;frame<refreshRate*10;frame++){
  time+=(1000/refreshRate)*intervals[jitter?frame%intervals.length:0];
  const advance=step.hasFpsLimit?step.stepLimitFPS:step.step;
  advance.call(step,time);
 }
 return {elapsed:time,delivered};
}

describe('configured Phaser game-loop timing',()=>{
 it('preserves elapsed update time across refresh rates and modest frame jitter',()=>{
  expect(gameConfig.fps?.target).toBe(60);
  for(const refreshRate of [60,75,90,120,144]){
   for(const jitter of [false,true]){
    const {elapsed,delivered}=runTenSeconds(refreshRate,jitter);
    expect(Math.abs(delivered-elapsed),`${refreshRate} Hz, jitter=${jitter}: delivered ${delivered} ms for ${elapsed} ms elapsed`).toBeLessThan(elapsed*.01);
   }
  }
 });
});
