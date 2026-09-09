import Phaser from 'phaser';
import {Player} from '../entities/Player';
import {InputController} from '../systems/InputController';

export class JailScene extends Phaser.Scene {
  private player!:Player;
  private controls!:InputController;
  constructor(){super('jail');}
  create(data:{infiniteHealth?:boolean}):void {
    this.physics.world.resume();this.physics.world.setBounds(0,0,960,400);
    this.cameras.main.setBounds(0,0,960,400).setZoom(1).setBackgroundColor(0x03070e);
    this.add.image(480,200,'jail-cell').setDisplaySize(1200,440).setDepth(-10);
    const floor=this.add.rectangle(480,380,960,40,0x07111b,.7);
    this.physics.add.existing(floor,true);
    this.player=new Player(this,420,332.5);this.player.infiniteHealth=!!data.infiniteHealth;
    this.physics.add.collider(this.player.sprite,floor);
    for(const x of [110,850]){
      const wall=this.add.rectangle(x,180,16,360,0x101a24).setStrokeStyle(3,0x405363);
      this.physics.add.existing(wall,true);this.physics.add.collider(this.player.sprite,wall);
    }
    this.controls=new InputController(this);
    this.cameras.main.startFollow(this.player.sprite,true,.12,.1).setDeadzone(180,180).fadeIn(700);
    this.add.text(320,45,'My own jail… who has the keys?',{fontFamily:'Georgia',fontSize:'17px',color:'#dfd5b9',stroke:'#020509',strokeThickness:5}).setOrigin(.5).setScrollFactor(0).setDepth(20);
    this.add.text(320,375,'A/D move · L jump · K dash · S crouch',{fontSize:'11px',color:'#a3b0bf'}).setOrigin(.5).setScrollFactor(0).setDepth(20);
    this.game.canvas.focus();
  }
  update(_time:number,delta:number):void {
    const input=this.controls.read();
    if(input.godModePressed)this.player.infiniteHealth=!this.player.infiniteHealth;
    this.player.update(input,delta);
  }
}
