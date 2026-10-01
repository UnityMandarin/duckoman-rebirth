import Phaser from 'phaser';

/** Routes HUD/world objects after add-time scroll-factor setup, with work only for new objects. */
export class SceneLayerRouter {
 private readonly pending=new Set<Phaser.GameObjects.GameObject>();
 private readonly added=(object:Phaser.GameObjects.GameObject):void=>{this.pending.add(object);};
 private readonly flush=():void=>{for(const object of this.pending){const item=object as Phaser.GameObjects.GameObject&{scrollFactorX?:number};item.cameraFilter=item.scrollFactorX===0?this.scene.cameras.main.id:this.hud.id;}this.pending.clear();};
 constructor(private readonly scene:Phaser.Scene,private readonly hud:Phaser.Cameras.Scene2D.Camera){
  scene.events.on(Phaser.Scenes.Events.ADDED_TO_SCENE,this.added);scene.events.on(Phaser.Scenes.Events.POST_UPDATE,this.flush);
  for(const object of scene.children.list)this.pending.add(object);this.flush();
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN,()=>{scene.events.off(Phaser.Scenes.Events.ADDED_TO_SCENE,this.added);scene.events.off(Phaser.Scenes.Events.POST_UPDATE,this.flush);this.pending.clear();});
 }
}
