import {describe,expect,it} from 'vitest';
import {CameraQaTelemetry,visibleCameraQaSurfaceIds} from '../src/systems/cameraQaTelemetry';

describe('camera QA fit attribution',()=>{
 it('does not count null or current-support targets as a launch fit',()=>{
  const tracker=new CameraQaTelemetry();tracker.sample(10,true,'r13:ledge:2','r13:ledge:2',['r13:ledge:2']);tracker.sample(20,true,'r13:ledge:2',null,['r13:ledge:2']);
  expect(tracker.sample(30,false,null,null,['r13:ledge:2'])).toEqual({launchT:30,source:'r13:ledge:2',target:null,firstFitT:null,leadMs:null});
 });
 it('keeps a continuous landing visibility interval when rig selection changes',()=>{
  const tracker=new CameraQaTelemetry();tracker.sample(100,true,'r10:ledge:2',null,['r10:ledge:3']);tracker.sample(120,true,'r10:ledge:2','r10:ledge:4',['r10:ledge:3','r10:ledge:4']);
  expect(tracker.sample(340,false,null,'r10:ledge:3',['r10:ledge:3','r10:ledge:4'])).toEqual({launchT:340,source:'r10:ledge:2',target:'r10:ledge:3',firstFitT:100,leadMs:240});
 });
 it('resets an interval only after the surface actually leaves the projected view',()=>{
  const tracker=new CameraQaTelemetry();tracker.sample(100,true,'source',null,['landing']);tracker.sample(150,true,'source','other',['other']);tracker.sample(180,true,'source','landing',['landing']);
  expect(tracker.sample(300,false,null,'landing',['landing'])?.firstFitT).toBe(180);
 });
 it('includes actual viewport fit, usable width, and associated spike visibility',()=>{
  const view={x:0,y:0,width:640,height:400,logicalWidth:640,logicalHeight:400},actor={top:150,bottom:200},surfaces=[
   {id:'good',left:100,right:300,top:300,enabled:true,landing:true},
   {id:'narrow',left:100,right:150,top:300,enabled:true,landing:true},
   {id:'disabled',left:100,right:300,top:300,enabled:false,landing:true},
   {id:'spiked',left:320,right:500,top:300,enabled:true,landing:true},
  ];
  expect(visibleCameraQaSurfaceIds(view,actor,surfaces,[{left:330,right:490,top:310,bottom:340,active:true,kind:'spike'}])).toEqual(['good','spiked']);
  // Raised landing is not made unsafe by floor spikes far beneath it, even when those spikes are offscreen.
  expect(visibleCameraQaSurfaceIds(view,actor,surfaces,[{left:330,right:490,top:390,bottom:420,active:true,kind:'spike'}])).toEqual(['good','spiked']);
  expect(visibleCameraQaSurfaceIds(view,{top:100,bottom:200},surfaces)).toEqual([]);
 });
});
