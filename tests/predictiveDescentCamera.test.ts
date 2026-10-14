import {describe,expect,it} from 'vitest';
import {descentCameraTarget,DESCENT_CAMERA,PredictiveDescentCamera} from '../src/systems/predictiveDescentCamera';
import {DESCENT_PREDICTION,type DescentPrediction} from '../src/systems/descentPrediction';

const prediction=(state:DescentPrediction['state'],targetId?:string):DescentPrediction=>({state,targetId,targetX:100,targetY:300,interceptMs:500,actorX:100,actorY:180,risk:false});

describe('predictive descent camera framing',()=>{
  it('uses projected worldView coordinates and keeps a scale-2 target equivalent',()=>{
    const scale1=descentCameraTarget({y:0,height:400,logicalHeight:400,baseZoom:1,zoom:1,offsetY:0},{actorTop:100,actorBottom:160,targetBottom:360});
    const scale2=descentCameraTarget({y:0,height:400,logicalHeight:400,baseZoom:2,zoom:2,offsetY:0},{actorTop:100,actorBottom:160,targetBottom:360});
    expect(scale2.zoomRatio).toBe(scale1.zoomRatio);expect(scale2.offsetY).toBe(scale1.offsetY);
  });
  it('selects lookdown first and stops at the .80 minimum with visibility status',()=>{
    const fitting=descentCameraTarget({x:0,width:640,y:0,height:400,logicalHeight:400,baseZoom:1,zoom:1,offsetY:0},{actorTop:100,actorBottom:160,targetBottom:340,targetLeft:100,targetRight:180});
    expect(fitting.zoomRatio).toBe(DESCENT_CAMERA.fitZoomRatio);expect(fitting.offsetY).not.toBe(0);expect(fitting.visible).toBe(true);
    const tooTall=descentCameraTarget({y:0,height:400,logicalHeight:400,baseZoom:1,zoom:1,offsetY:0},{actorTop:0,actorBottom:60,targetBottom:400});
    expect(tooTall.zoomRatio).toBe(DESCENT_CAMERA.minZoomRatio);expect(tooTall.visible).toBe(false);
  });
  it('reports when camera bounds prevent the requested safe-band placement',()=>{
    const bounded=descentCameraTarget({y:0,height:400,logicalHeight:400,baseZoom:1,zoom:1,offsetY:0,boundsTop:0,boundsBottom:1840},{actorTop:100,actorBottom:160,targetBottom:350});
    expect(bounded.offsetY).toBe(-50);expect(bounded.visible).toBe(false);
  });
  it('uses the feasible actor and landing interval instead of assuming screen Y 164',()=>{
    const fit=descentCameraTarget({x:0,width:640,y:0,height:400,logicalHeight:400,baseZoom:1,zoom:1,offsetY:0},{actorTop:100,actorBottom:160,targetBottom:360,targetLeft:120,targetRight:200});
    expect(fit.zoomRatio).toBe(DESCENT_CAMERA.minZoomRatio);expect(fit.visible).toBe(true);
    const edgeFit=descentCameraTarget({x:0,width:640,y:0,height:400,logicalHeight:400,baseZoom:1,zoom:1,offsetY:0},{actorTop:164,actorBottom:224,targetBottom:414,targetLeft:120,targetRight:200});
    expect(edgeFit.visible).toBe(true);expect(edgeFit.zoomRatio).toBe(DESCENT_CAMERA.minZoomRatio);
  });
  it('rechecks horizontal touchdown fit at each prospective zoom ratio',()=>{
    const view={x:0,width:400,y:0,height:400,logicalHeight:400,baseZoom:1,zoom:1,offsetY:0};
    const fit=descentCameraTarget(view,{actorTop:100,actorBottom:160,targetBottom:300,targetLeft:365,targetRight:600});
    expect(fit.zoomRatio).toBe(DESCENT_CAMERA.fitZoomRatio);
    expect(fit.visible).toBe(true);
    const hidden=descentCameraTarget(view,{actorTop:100,actorBottom:160,targetBottom:300,targetLeft:500,targetRight:700});
    expect(hidden.visible).toBe(false);
  });
  it('requires a useful touchdown width and an on-screen associated hazard',()=>{
    const view={x:0,width:640,y:0,height:400,logicalHeight:400,baseZoom:1,zoom:1,offsetY:0};
    expect(descentCameraTarget(view,{actorTop:100,actorBottom:150,targetBottom:300,targetLeft:700,targetRight:760}).visible).toBe(false);
    expect(descentCameraTarget(view,{actorTop:100,actorBottom:150,targetBottom:300,targetLeft:100,targetRight:150,hazardLeft:700,hazardRight:720}).visible).toBe(false);
  });
  it('keeps normal traversal neutral and boss ownership causes no camera changes',()=>{
    const camera=new PredictiveDescentCamera(),view={y:0,height:400,logicalHeight:400,baseZoom:1,zoom:1,offsetY:0},frame={actorTop:100,actorBottom:150,targetBottom:null};
    const normal=camera.update(prediction('none'),view,frame,1000,true,true);expect(normal.zoomRatio).toBe(1);expect(normal.offsetY).toBe(0);expect(normal.state).toBe('approach');
    camera.setOwner('boss');const boss=camera.update(prediction('landing','p8'),view,frame,16,true,true);expect(boss.state).toBe('boss');expect(boss.zoomRatio).toBe(1);expect(boss.offsetY).toBe(0);
  });
  it('blends active framing and clears upward-jump framing after invalidation hysteresis',()=>{
    const camera=new PredictiveDescentCamera(),view={y:0,height:400,logicalHeight:400,baseZoom:1,zoom:1,offsetY:0},frame={actorTop:120,actorBottom:180,targetBottom:360};
    const active=camera.update(prediction('landing','p8'),view,frame,16,true,true);expect(active.state).toBe('framing');
    for(let i=0;i<40;i++)camera.update(prediction('approach'),view,frame,50,true,true);
    expect(camera.zoomRatio).toBeCloseTo(1,2);expect(camera.offsetY).toBeCloseTo(0,0);expect(camera.state).toBe('normal');
  });
  it('holds the complete target record during 150 ms invalidation',()=>{
    const camera=new PredictiveDescentCamera(),view={x:0,width:640,y:0,height:400,logicalHeight:400,baseZoom:1,zoom:1,offsetY:0},frame={actorTop:120,actorBottom:180,targetBottom:360,targetLeft:150,targetRight:250};
    camera.update({...prediction('landing','r8:ledge:3'),targetY:340,targetX:200},view,frame,16,true,true);
    camera.update(prediction('none'),view,{...frame,actorTop:200,actorBottom:260,targetBottom:null,targetLeft:undefined,targetRight:undefined},50,true,true);
    camera.update(prediction('none'),view,{...frame,actorTop:200,actorBottom:260,targetBottom:null,targetLeft:undefined,targetRight:undefined},50,true,true);
    const held=camera.update(prediction('none'),view,{...frame,actorTop:200,actorBottom:260,targetBottom:null},50,true,true);
    expect(held.targetId).toBe('r8:ledge:3');expect(held.targetY).toBe(340);expect(held.risk).toBe(false);expect(held.state).toBe('framing');
  });
  it('keeps exponential response stable across 30, 60 and 120 Hz steps',()=>{
    const run=(delta:number,count:number)=>{const camera=new PredictiveDescentCamera(),view={x:0,width:640,y:0,height:400,logicalHeight:400,baseZoom:1,zoom:1,offsetY:0},frame={actorTop:120,actorBottom:180,targetBottom:360,targetLeft:150,targetRight:250};for(let i=0;i<count;i++)camera.update(prediction('landing','r8:ledge:3'),view,frame,delta,true,true);return camera;};
    const a=run(1000/30,30),b=run(1000/60,60),c=run(1000/120,120);
    expect(Math.abs(a.offsetY-b.offsetY)).toBeLessThan(1);expect(Math.abs(b.offsetY-c.offsetY)).toBeLessThan(1);
  });
  it('solves the actual follow-target and deadzone projection at 30, 60 and 120 Hz',()=>{
    const run=(delta:number,count:number)=>{
      const camera=new PredictiveDescentCamera(),view={x:0,width:640,y:0,height:400,logicalHeight:400,baseZoom:1,zoom:1,offsetY:0,followTargetY:145,deadzoneHeight:130};
      const frame={actorTop:115,actorBottom:175,targetBottom:313,targetLeft:180,targetRight:270};
      let actualTop=0,firstFitMs:number|null=null;
      for(let i=0;i<count;i++){
        const status=camera.update(prediction('landing','outside:10:ledge:3'),view,frame,delta,true,true);
        const worldHeight=view.height/status.zoomRatio;
        actualTop=view.followTargetY-(status.offsetY+worldHeight/2+view.deadzoneHeight/2);
        const actorScreenTop=(frame.actorTop-actualTop)/worldHeight*view.logicalHeight;
        const actorScreenBottom=(frame.actorBottom-actualTop)/worldHeight*view.logicalHeight;
        const targetScreenBottom=(frame.targetBottom-actualTop)/worldHeight*view.logicalHeight;
        if(firstFitMs===null&&actorScreenTop>=120&&actorScreenBottom<=370&&targetScreenBottom<=370)firstFitMs=(i+1)*delta;
      }
      return {camera,actualTop,firstFitMs};
    };
    const a=run(1000/30,30),b=run(1000/60,60),c=run(1000/120,120);
    for(const result of [a,b,c])expect(result.firstFitMs).not.toBeNull();
    expect(Math.abs(a.actualTop-b.actualTop)).toBeLessThan(1);expect(Math.abs(b.actualTop-c.actualTop)).toBeLessThan(1);
    const target=descentCameraTarget({x:0,width:640,y:0,height:400,logicalHeight:400,baseZoom:1,zoom:1,offsetY:0,followTargetY:145,deadzoneHeight:130},{actorTop:115,actorBottom:175,targetBottom:313,targetLeft:180,targetRight:270});
    const solvedTop=145-(target.offsetY+400/target.zoomRatio/2+65);
    expect(Math.abs(solvedTop-a.actualTop)).toBeLessThan(1);
  });
  it('settles inside the accepted band 300 ms before a 160-unit walk or sprint edge',()=>{
    const simulate=(speed:200|300,hz:30|60|120)=>{
      const dt=1000/hz,approachDistance=Math.max(DESCENT_PREDICTION.approachMin,Math.min(DESCENT_PREDICTION.approachMax,speed*DESCENT_PREDICTION.approachSeconds)),leadWindowMs=approachDistance/speed*1000,camera=new PredictiveDescentCamera(),centerY=108,deadzoneHeight=130;
      const view={x:0,width:640,y:0,height:400,logicalHeight:400,baseZoom:1,zoom:1,offsetY:0,followTargetY:centerY,deadzoneHeight};
      const frame={actorTop:78,actorBottom:138,targetBottom:286,targetLeft:180,targetRight:270};
      let actualTop=centerY-400/2-deadzoneHeight/2,firstActualFitMs:number|null=null;
      for(let t=dt;t<=leadWindowMs+1e-6;t+=dt){
        const status=camera.update(prediction('landing','outside:10:ledge:3'),view,frame,dt,true,true),worldHeight=400/status.zoomRatio;
        const desiredTop=centerY-(status.offsetY+worldHeight/2+deadzoneHeight/2);
        actualTop+=(desiredTop-actualTop)*.12;
        const actorTop=(frame.actorTop-actualTop)/worldHeight*400,actorBottom=(frame.actorBottom-actualTop)/worldHeight*400,targetBottom=(frame.targetBottom-actualTop)/worldHeight*400;
        if(firstActualFitMs===null&&actorTop>=120&&actorBottom<=370&&targetBottom<=370)firstActualFitMs=t;
      }
      const worldHeight=400/camera.zoomRatio,actorTop=(frame.actorTop-actualTop)/worldHeight*400,actorBottom=(frame.actorBottom-actualTop)/worldHeight*400,targetBottom=(frame.targetBottom-actualTop)/worldHeight*400;
      return {firstActualFitMs,leadMs:firstActualFitMs===null?null:leadWindowMs-firstActualFitMs,actorTop,actorBottom,targetBottom,actualTop,offset:camera.offsetY};
    };
    for(const speed of [200,300] as const)for(const hz of [30,60,120] as const){
      const result=simulate(speed,hz);
      expect(result.leadMs??-1,JSON.stringify({speed,hz,...result})).toBeGreaterThanOrEqual(300);
    }
  });
  it('suspends without catch-up and supports reset/destroy lifecycle',()=>{
    const camera=new PredictiveDescentCamera(),view={y:0,height:400,logicalHeight:400,baseZoom:1,zoom:1,offsetY:0},frame={actorTop:100,actorBottom:150,targetBottom:350};
    camera.update(prediction('landing','p8'),view,frame,16,true,true);camera.suspend();const held=camera.update(prediction('landing'),view,frame,5000,true,true);
    expect(held.state).toBe('suspended');expect(held.offsetY).not.toBe(0);camera.resume();const resumed=camera.update(prediction('landing','p8'),view,frame,5000,true,true);expect(resumed.offsetY).toBe(held.offsetY);camera.reset();expect(camera.zoomRatio).toBe(1);expect(camera.offsetY).toBe(0);camera.destroy();expect(camera.update(prediction('landing'),view,frame,16,true,true).zoomRatio).toBe(1);
  });
});
