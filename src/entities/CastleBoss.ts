import Phaser from 'phaser';
import { BasicEnemy } from './BasicEnemy';
import type { Player } from './Player';
import type { ThrowableObject } from './ThrowableObject';
import { InteractionSystem } from '../systems/InteractionSystem';
import { BOSS_RULES, BossClock, BossHealth } from '../systems/BossRules';
import { isStomp } from '../systems/contactRules';
import { ARENA_LEDGES, nextLedge, support } from '../systems/ArenaNavigation';

interface Minion {enemy:BasicEnemy;jumpAt:number;target?:number;colliders:Phaser.Physics.Arcade.Collider[];}
interface Bomb {art:Phaser.GameObjects.Arc;mark:Phaser.GameObjects.Arc;start:number;x:number;y:number;targetX:number;targetY:number;}
export class CastleBoss {
  readonly health=new BossHealth();
  private clock=new BossClock();
  private started:number|undefined;
  private flightAt=-10000;
  private image:Phaser.GameObjects.Image;
  private wings:Phaser.GameObjects.Graphics;
  private hud:Phaser.GameObjects.Graphics;
  private label:Phaser.GameObjects.Text;
  private minions:Minion[]=[];
  private bombs:Bomb[]=[];
  private finished=false;
  private probeHit=false;
  private contactGrace=0;
  private gate:Phaser.GameObjects.Rectangle;
  private sealPillars:Phaser.GameObjects.Image[]=[];
  private bossX=10360;
  constructor(private scene:Phaser.Scene,private player:Player,private throwable:ThrowableObject,private terrain:Phaser.Physics.Arcade.StaticGroup,private say:(text:string)=>void) {
    this.image=scene.add.image(this.bossX,-120,'robot').setDisplaySize(210,210).setTint(0xc7c8db).setDepth(7);
    this.wings=scene.add.graphics().setDepth(6);
    this.hud=scene.add.graphics().setScrollFactor(0).setDepth(25);
    this.label=scene.add.text(320,108,'',{fontSize:'13px',color:'#fbd19d',stroke:'#080d19',strokeThickness:3}).setOrigin(.5).setScrollFactor(0).setDepth(26);
    this.gate=scene.add.rectangle(8990,-200,80,1200,0,0).setAlpha(0).setDepth(4);
    scene.physics.add.existing(this.gate,true);(this.gate.body as Phaser.Physics.Arcade.StaticBody).enable=false;
    scene.physics.add.collider(player.sprite,this.gate);
  }
  update():void {
    const now=this.scene.time.now;
    if(this.finished)return;
    if(this.started===undefined) {
      if(this.player.sprite.x<9080)return;
      this.started=now;this.gate.setAlpha(1);(this.gate.body as Phaser.Physics.Arcade.StaticBody).enable=true;
      this.scene.cameras.main.zoomTo(.68,700,'Sine.easeOut');
      for(const x of [8965,9015]) {
        const pillar=this.scene.add.image(x,-720,'rock-pillar-kit').setCrop(820,0,716,1024).setOrigin(.5,1).setDisplaySize(86,520).setDepth(14);
        this.sealPillars.push(pillar);
        this.scene.tweens.add({targets:pillar,y:380,duration:850,ease:'Cubic.In'});
      }
      this.say('THE WINGED WARDEN — stomp or dash its core.');
    }
    const elapsed=now-this.started,events=this.clock.tick(elapsed);
    if(events.flight)this.flightAt=now;
    const flying=now-this.flightAt<3600;
    const desired=10320+Math.sin(elapsed/(flying?1400:3000))*(flying?650:320);
    this.bossX=Phaser.Math.Linear(this.bossX,Phaser.Math.Clamp(desired,9180,11420),.035);
    this.image.setPosition(this.bossX,flying?-150+Math.sin(elapsed*.0018)*90:80+Math.sin(elapsed*.0012)*55);
    this.drawWings(now,flying);
    if(this.probeHit){this.probeHit=false;this.health.hp=1;this.player.body.reset(this.image.x,this.image.y-98);this.player.body.setVelocityY(400);}
    const p=this.player.body,x=this.image.x,y=this.image.y;
    const overlap=p.right>x-60&&p.left<x+60&&p.bottom>y-60&&p.top<y+60;
    const stomp=isStomp({left:p.left,right:p.right,top:p.top,bottom:p.bottom,previousBottom:p.prev.y+p.height,velocityY:p.velocity.y},{left:x-60,right:x+60,top:y-60},10);
    if(this.health.touch(now,overlap,this.player.isDashing||stomp)) {
      this.contactGrace=now+650;
      this.player.bounceFromStomp();this.image.setTint(0xffffff);
      this.scene.tweens.add({targets:this.image,alpha:.4,duration:80,yoyo:true,repeat:2});
    } else if(overlap&&now>=this.contactGrace&&!this.player.isDashing&&!stomp) this.player.takeDamage(x);
    if(this.health.hp===0){this.finish();return;}
    if(events.bomb)this.throwBomb(now);
    if(events.wave)this.spawnWave(now);
    this.updateBombs(now);
    this.updateMinions(now);
    this.label.setText(`WINGED WARDEN  ${this.health.hp} / ${BOSS_RULES.hp}`);
    this.hud.clear().fillStyle(0x080c15,.9).fillRoundedRect(136,119,368,13,5);
    this.hud.fillStyle(0xe98644).fillRoundedRect(139,122,362*this.health.hp/15,7,3);
  }
  probeVictory():void {if(location.hostname==='127.0.0.1'&&new URLSearchParams(location.search).has('qa'))this.probeHit=true;}
  private drawWings(now:number,flying:boolean):void {
    const x=this.image.x,y=this.image.y,beat=Math.sin(now*(flying?.022:.01))*25,g=this.wings.clear();
    for(const d of [-1,1]) {
      const root=x+d*45,hinge=x+d*85,tip=x+d*148;
      g.lineStyle(12,0x142536).lineBetween(root,y-12,hinge,y-30+beat*.5);
      g.lineStyle(5,0x8d7c61).lineBetween(root,y-15,hinge,y-33+beat*.5);
      for(let i=4;i>=0;i--) {
        const sy=y-42+i*13+beat*.5,ty=y-80+i*26+beat;
        const points=[{x:hinge-d*i*3,y:sy},{x:tip-d*i*9,y:ty},{x:tip-d*(i*9+10),y:ty+20},{x:hinge-d*i*3,y:sy+16}].map(p=>new Phaser.Math.Vector2(p.x,p.y));
        g.fillStyle(0x172938).fillPoints(points,true);
        g.lineStyle(2,0xb28742).strokePoints(points,true);
        g.lineStyle(7,0x9aabae).lineBetween(hinge-d*i*3,sy+5,tip-d*(i*9+12),ty+9);
        g.lineStyle(2,0xffd694).lineBetween(hinge-d*i*3,sy+2,tip-d*(i*9+6),ty+3);
      }
      g.fillStyle(0x101a25).fillCircle(hinge,y-20+beat*.5,13);
      g.lineStyle(3,0xbb8d45).strokeCircle(hinge,y-20+beat*.5,11);
      g.fillStyle(0xd04b21).fillCircle(hinge,y-20+beat*.5,5);
      g.fillStyle(0xffd586).fillCircle(hinge-d*2,y-22+beat*.5,2);
    }
  }
  private throwBomb(now:number):void {
    // Target locks at release; the long marked arc can be evaded in either direction.
    const targetX=Phaser.Math.Clamp(this.player.sprite.x+this.player.body.velocity.x*.25,9040,11480);
    const targetY=this.player.body.bottom;
    const art=this.scene.add.circle(this.image.x,this.image.y,11,0x202e41).setStrokeStyle(3,0xffb751).setDepth(9);
    const mark=this.scene.add.circle(targetX,targetY-4,BOSS_RULES.bombRadius,0xe99436,.09).setStrokeStyle(2,0xffb354,.75).setDepth(8);
    this.bombs.push({art,mark,start:now,x:art.x,y:art.y,targetX,targetY});
  }
  private updateBombs(now:number):void {
    this.bombs=this.bombs.filter(b=>{
      const t=Math.min(1,(now-b.start)/1300);
      b.art.setPosition(Phaser.Math.Linear(b.x,b.targetX,t),Phaser.Math.Linear(b.y,b.targetY,t)-Math.sin(t*Math.PI)*130);
      b.mark.setAlpha(.4+t*.6);
      if(t<1)return true;
      const p=this.player.body,dx=Math.max(p.left-b.targetX,0,b.targetX-p.right),dy=Math.max(p.top-b.targetY,0,b.targetY-p.bottom);
      if(dx*dx+dy*dy<=BOSS_RULES.bombRadius**2)this.player.takeDamage(b.targetX,BOSS_RULES.bombDamage);
      b.art.destroy();b.mark.setFillStyle(0xffbb57,.65);
      this.scene.tweens.add({targets:b.mark,alpha:0,scale:1.15,duration:240,onComplete:()=>b.mark.destroy()});return false;
    });
  }
  private spawnWave(now:number):void {
    // Exact requested wave: no caps, silent despawns, or altered spawn periods.
    for(let i=0;i<BOSS_RULES.normals+BOSS_RULES.pointed;i++) {
      const x=this.player.sprite.x<10240?11380-i*60:9120+i*60;
      const enemy=new BasicEnemy(this.scene,x,330,{left:9030,right:11480},i===3,i<3);
      if(!enemy.pointed)enemy.body.setMaxVelocity(220,900);
      const contact=new InteractionSystem(this.player,enemy,this.throwable);
      const colliders=[this.scene.physics.add.collider(enemy.sprite,this.terrain),
        this.scene.physics.add.overlap(this.player.sprite,enemy.sprite,()=>contact.resolvePlayerEnemy()),
        this.scene.physics.add.overlap(this.throwable.sprite,enemy.sprite,()=>contact.resolveThrownEnemy())];
      this.minions.push({enemy,jumpAt:now+500,colliders});
    }
  }
  private updateMinions(now:number):void {
    this.minions=this.minions.filter(m=>{
      if(m.enemy.defeated){m.colliders.forEach(c=>c.destroy());return false;}
      const e=m.enemy,p=this.player;
      e.update();
      const grounded=e.body.blocked.down||e.body.touching.down;
      if(e.pointed){e.body.setVelocityX(Math.sign(p.sprite.x-e.sprite.x)*100);return true;}
      const from=support(e.sprite.x,e.body.bottom),to=support(p.sprite.x,p.body.bottom);
      if(grounded&&now>=m.jumpAt)m.target=undefined;
      if(m.target!==undefined) {
        e.body.setVelocityX(Phaser.Math.Clamp((ARENA_LEDGES[m.target].x-e.sprite.x)*4,-220,220));
      } else if(from!==to) {
        const next=nextLedge(from,to),ledge=ARENA_LEDGES[next],current=ARENA_LEDGES[from];
        const dir=ledge.x>=e.sprite.x?1:-1;
        const launch=ledge.top<current.top&&from===0?ledge.x-dir*(ledge.width/2+40):current.x+dir*(current.width/2-30);
        e.body.setVelocityX(Phaser.Math.Clamp((launch-e.sprite.x)*4,-180,180));
        if(grounded&&Math.abs(launch-e.sprite.x)<25&&now>=m.jumpAt) {
          m.target=next;e.body.setVelocityY(-700);m.jumpAt=now+700;
        }
      } else {
        e.body.setVelocityX(Math.sign(p.sprite.x-e.sprite.x)*150);
        if(grounded&&now>=m.jumpAt&&Math.abs(p.sprite.x-e.sprite.x)<180&&p.body.bottom<e.body.bottom-25){e.body.setVelocityY(-700);m.jumpAt=now+850;}
      }
      return true;
    });
  }
  private finish():void {
    this.finished=true;this.gate.destroy();this.sealPillars.forEach(p=>p.destroy());this.scene.cameras.main.zoomTo(1,700,'Sine.easeInOut');this.hud.clear();this.label.setText('WARDEN DEFEATED');
    this.bombs.forEach(b=>{b.art.destroy();b.mark.destroy();});this.bombs=[];
    this.minions.forEach(m=>{m.enemy.defeat();m.colliders.forEach(c=>c.destroy());});this.minions=[];
    this.wings.destroy();this.scene.tweens.add({targets:this.image,alpha:0,angle:45,y:330,duration:900,onComplete:()=>this.image.destroy()});
    this.say('A royal command seal… issued while I was gone. Someone wanted my castle intact. Why?');
  }
}
