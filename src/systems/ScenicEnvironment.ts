import type Phaser from 'phaser';
import type {EnvironmentPlan,Interval} from '../data/worldEnvironment';
import {CONNECTOR_CORE_CENTERS,CONNECTOR_VARIANTS,SCENIC_SCROLL,scenicTiles,scenicWindow} from '../data/scenicZones';

/** Static distinct scenes plus native architectural/organic passages; no camera mutation or update work. */
export function addScenicEnvironment(scene:Phaser.Scene,plan:EnvironmentPlan,bounds?:Interval):void{
  const atlasKey=`world-v3-${plan.kind}-connectors`,atlas=scene.textures.get(atlasKey),image=atlas.getSourceImage();
  const count=CONNECTOR_VARIANTS[plan.kind],cellWidth=image.width/count;
  // Keep each atlas cell's full native fringe. Align its measured opaque core with the seam.
  for(let variant=0;variant<count;variant++){
    const frame=`connector-${variant}`;
    if(!atlas.has(frame))atlas.add(frame,0,variant*cellWidth,0,cellWidth,image.height);
  }
  const top=plan.top-128;
  const connector=(seamX:number,variant:number)=>{
    const cellCenter=(variant+.5)*cellWidth,coreCenter=CONNECTOR_CORE_CENTERS[plan.kind][variant]!;
    return scene.add.image(seamX+cellCenter-coreCenter,top,atlasKey,`connector-${variant}`)
    .setOrigin(.5,0).setScale(plan.farScale).setScrollFactor(SCENIC_SCROLL,1).setDepth(-29)
    .setName('world-environment-connector');
  };
  const zones=scenicWindow(plan.kind,bounds);
  for(const zone of zones){
    const key=`world-v3-${zone.name}`,texture=scene.textures.get(key),source=texture.getSourceImage();
    for(const tile of scenicTiles(plan,zone,source.width,bounds)){
      let frame='__BASE';
      if(tile.sourceX!==0||Math.abs(tile.sourceWidth-source.width)>.00001){
        // Preview edges can cut a different part of this same global tile. Give each
        // crop a stable geometry-based name so a prior full-scene frame is not reused.
        frame=`scenic-tile-${tile.index}-${tile.sourceX.toFixed(3)}-${tile.sourceWidth.toFixed(3)}`;
        if(!texture.has(frame))texture.add(frame,0,tile.sourceX,0,tile.sourceWidth,source.height);
      }
      scene.add.image(tile.x,top,key,frame).setOrigin(0).setScale(plan.farScale)
        .setScrollFactor(SCENIC_SCROLL,1).setDepth(-30).setName('world-environment-far');
      if(tile.repeatJoin)connector(tile.x,zone.connector);
    }
    if(zone.start>0&&(!bounds||zone.start*SCENIC_SCROLL>=bounds[0]*SCENIC_SCROLL-640&&zone.start*SCENIC_SCROLL<=bounds[1]*SCENIC_SCROLL+640)){
      connector(zone.start*SCENIC_SCROLL,zone.connector);
    }
  }
}
