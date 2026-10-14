import {describe,expect,it} from 'vitest';
import {predictDescent,predictedSurfaceMotionOffset,resetDescentPrediction,type DescentPrediction,type DescentPredictionInput,type PredictSurface} from '../src/systems/descentPrediction';

function fixture(overrides:Partial<DescentPredictionInput>={}){
  const surfaces:PredictSurface[]=[
    {id:'support',room:8,left:0,right:100,top:100,bottom:132,enabled:true},
    {id:'landing',room:8,left:120,right:220,top:140,bottom:172,enabled:true},
  ];
  return {surfaces,input:{x:75,y:80,vx:0,vy:0,halfWidth:12,halfHeight:20,grounded:true,supportId:'support',horizontal:1 as const,sprint:false,jumpAvailable:true,dashing:false,dashRemainingMs:0,gravity:1471.5,maxFall:900,runSpeed:200,sprintSpeed:300,surfaces,hazards:[],...overrides} as DescentPredictionInput,out:{state:'none',targetX:0,targetY:0,interceptMs:0,actorX:0,actorY:0,risk:false} as DescentPrediction};
}

describe('predictive descent trajectory',()=>{
  it('keeps a low-speed near-floor spawn settling frame neutral but preserves real falls',()=>{
    const f=fixture({grounded:false,supportId:undefined,horizontal:0,vy:20,x:50,y:79,surfaces:[{id:'spawn-floor',room:8,left:0,right:120,top:100,bottom:132,enabled:true}]});
    expect(predictDescent(f.input,f.out).state).toBe('none');
    f.input.y=-350;f.input.vy=900;
    expect(predictDescent(f.input,f.out).state).toBe('landing');
    expect(f.out.targetId).toBe('spawn-floor');
  });
  it('approaches a support edge within the bounded authored approach distance',()=>{
    const f=fixture({x:100,surfaces:[{id:'support',room:8,left:0,right:500,top:100,bottom:132,enabled:true},{id:'landing',room:8,left:520,right:620,top:120,bottom:152,enabled:true}]});
    expect(predictDescent(f.input,f.out).state).toBe('approach');expect(f.out.actorX).toBe(320);
  });
  it('predicts the earliest reachable lower surface after walking or jumping off an edge',()=>{
    const f=fixture(),result=predictDescent(f.input,f.out);
    expect(result.state).toBe('landing');expect(result.targetId).toBe('landing');expect(result.interceptMs).toBeGreaterThan(0);expect(result.targetY).toBe(140);
  });
  it('excludes a disabled landing surface and does not invent a target',()=>{
    const f=fixture();f.surfaces[1]!.enabled=false;const result=predictDescent(f.input,f.out);
    expect(result.state).toBe('danger');expect(result.targetId).toBeUndefined();expect(result.interceptMs).toBe(1250);
  });
  it('marks a reachable spike or pit overlap as risky without suppressing the landing',()=>{
    const f=fixture({hazards:[{id:'spikes',left:125,right:180,top:90,bottom:130,active:true,kind:'spike'}]});
    const result=predictDescent(f.input,f.out);expect(result.state).toBe('landing');expect(result.risk).toBe(true);expect(result.riskKind).toBe('spike');
  });
  it('uses the current phase of moving surfaces deterministically without mutating it',()=>{
    const f=fixture({grounded:false,horizontal:0,vy:250,x:100,y:40});
    const moving:PredictSurface={id:'lift',room:8,left:0,right:220,top:120,bottom:152,enabled:true,motion:{axis:'y',base:120,phase:0,clockMs:0}};
    f.surfaces.splice(0,2,moving);const before={...moving.motion},first=predictDescent(f.input,f.out).targetId;
    const second=predictDescent(f.input,f.out).targetId;expect(first).toBe('lift');expect(second).toBe(first);expect(moving.motion).toEqual(before);
  });
  it('anchors a moving support to its live nonzero phase before forecasting the next phase',()=>{
    const motion={axis:'y' as const,base:100,phase:Math.PI/2,clockMs:0},offset=predictedSurfaceMotionOffset(motion);
    expect(offset).toBeCloseTo(65);const f=fixture({x:75,y:145,grounded:true,supportId:'moving',horizontal:1,surfaces:[{id:'moving',room:8,left:0,right:100,top:100+offset,bottom:132+offset,enabled:true,motion},{id:'lower',room:8,left:140,right:240,top:250,bottom:282,enabled:true}]});
    expect(predictDescent(f.input,f.out).state).toBe('landing');expect(f.out.targetId).toBe('lower');
  });
  it('does not frame stationary support or equal and higher blocking surfaces',()=>{
    const f=fixture({horizontal:0});expect(predictDescent(f.input,f.out).state).toBe('none');
    f.input.horizontal=1;f.surfaces[1]!.top=100;f.surfaces[1]!.bottom=132;expect(predictDescent(f.input,f.out).state).toBe('none');
    f.surfaces[1]!.left=150;f.surfaces[1]!.top=80;f.surfaces[1]!.bottom=112;
    f.surfaces.push({id:'lower-behind-blocker',room:8,left:150,right:250,top:160,bottom:192,enabled:true});
    expect(predictDescent(f.input,f.out).state).toBe('none');
  });
  it('marks a true pit kill-line trajectory dangerous without labeling a raised bridge risky',()=>{
    const pit={id:'pit',left:100,right:260,top:190,bottom:190,active:true,kind:'pit' as const};
    const f=fixture({hazards:[pit]});f.surfaces[1]!.enabled=false;
    expect(predictDescent(f.input,f.out)).toMatchObject({state:'danger',risk:true,riskKind:'pit'});
    f.surfaces[1]!.enabled=true;f.surfaces[1]!.top=145;f.surfaces[1]!.bottom=177;
    expect(predictDescent(f.input,f.out)).toMatchObject({state:'landing',risk:false});
  });
  it('resets reusable output records between targets',()=>{
    const f=fixture();predictDescent(f.input,f.out);expect(f.out.targetId).toBe('landing');
    f.input.horizontal=0;f.input.grounded=false;f.input.vy=0;predictDescent(f.input,f.out);resetDescentPrediction(f.out);
    expect(f.out.state).toBe('none');expect(f.out.targetId).toBeUndefined();expect(f.out.risk).toBe(false);
  });
});
