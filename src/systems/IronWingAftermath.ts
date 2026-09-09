import Phaser from 'phaser';
import type {Player} from '../entities/Player';

export function gearExplosion(scene:Phaser.Scene,x:number,y:number,count=20):void {
  const flash=scene.add.circle(x,y,12,0xffedb0).setDepth(40);
  scene.tweens.add({targets:flash,scale:9,alpha:0,duration:350,onComplete:()=>flash.destroy()});
  for(let i=0;i<count;i++){
    const gear=scene.add.graphics().setPosition(x,y).setDepth(35);
    gear.fillStyle(i%2?0xbd9049:0x9aafbd).fillCircle(0,0,7).fillStyle(0x111b27).fillCircle(0,0,3);
    for(let j=0;j<8;j++){const a=j*Math.PI/4;gear.fillStyle(0xc69c55).fillRect(Math.cos(a)*7-2,Math.sin(a)*7-2,4,4);}
    scene.tweens.add({targets:gear,x:x+Phaser.Math.Between(-160,160),y:y-Phaser.Math.Between(30,130),angle:180,duration:240,onComplete:()=>{
      scene.tweens.add({targets:gear,y:360,angle:550,alpha:0,duration:650,onComplete:()=>gear.destroy()});
    }});
  }
}

export class IronWingAftermath {
  private eye:Phaser.GameObjects.Arc;
  private hint:Phaser.GameObjects.Text;
  private picked=false;
  private activated=false;
  get transitioning():boolean{return this.activated;}
  constructor(private scene:Phaser.Scene,private player:Player,x:number,y:number,terrain:Phaser.Physics.Arcade.StaticGroup){
    gearExplosion(scene,x,y);
    this.eye=scene.add.circle(x,y-25,12,0xe02a21).setStrokeStyle(4,0xffc66a).setDepth(18);
    scene.physics.add.existing(this.eye);
    const body=this.eye.body as Phaser.Physics.Arcade.Body;
    body.setCircle(12).setGravityY(900).setVelocity(0,-180).setBounce(.25).setCollideWorldBounds(true);
    scene.physics.add.collider(this.eye,terrain);
    this.hint=scene.add.text(x,y-50,'',{fontSize:'12px',color:'#ffdf60',stroke:'#090c15',strokeThickness:4}).setOrigin(.5).setDepth(25);
    this.eye.setInteractive({useHandCursor:true}).on('pointerdown',()=>{if(this.picked)this.activate();});
  }
  update(pressed:boolean):void {
    if(this.activated)return;
    if(!this.picked&&this.player.active&&Phaser.Math.Distance.Between(this.eye.x,this.eye.y,this.player.sprite.x,this.player.sprite.y)<55){
      this.picked=true;(this.eye.body as Phaser.Physics.Arcade.Body).enable=false;
      this.hint.setText('J · Press the core eye');
      return; // Picking up and using require separate input.
    }
    if(this.picked){
      this.eye.setPosition(this.player.sprite.x+this.player.facing*24,this.player.sprite.y-22);
      this.hint.setPosition(this.player.sprite.x,this.player.sprite.y-60);
      if(pressed)this.activate();
    }
  }
  private activate():void {
    if(this.activated||!this.player.active)return;
    this.activated=true;this.hint.destroy();
    gearExplosion(this.scene,this.eye.x,this.eye.y,10);this.eye.destroy();
    this.scene.physics.world.pause();
    this.scene.cameras.main.flash(150,255,175,90);
    this.scene.time.delayedCall(180,()=>{
      const camera=this.scene.cameras.main;
      camera.fadeOut(120,0,0,0);
      this.scene.time.delayedCall(120,()=>this.scene.time.delayedCall(2000,()=>{
        this.scene.scene.start('jail',{infiniteHealth:this.player.infiniteHealth});
      }));
    });
  }
}
