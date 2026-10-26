import Phaser from 'phaser';
import type { InputSnapshot } from './InputController';
import type { CampaignScene } from './progress';
import {loadProgress,saveProgress} from './progress';
import {campaignRunEligible} from './debug/debugSettings';
import {addIdentityBlock} from './ChapterVisuals';
import type {ThrowableObject} from '../entities/ThrowableObject';
import {SECTION_WIDTH,type ChapterKind} from '../data/chapters';
import {resolveAdventurePlacementPlan} from './adventurePlacements';
import {AdventurePauseLease,canOperatePump,completeWaterRoute,conversationEscapeConsumed,relayCanActivate,type WaterRouteMethod} from './adventureRules';
import type {Player} from '../entities/Player';

const PUMP_ROOM=4,PUMP_BASE=PUMP_ROOM*SECTION_WIDTH;


/** Return safe authored support anchors for each chapter's recurring cast. */
type Person={key:string;name:string;x:number;y:number;lines:string[]};
const cast:Record<CampaignScene,Person[]>={
 'gate-1':[{key:'pippit',name:'Pippit',x:780,y:310,lines:['Pippit: Palace locksmith. Currently specializing in locks that should know better.','Duckoman: The guards turned on everyone.','Pippit: Then we get everyone out. Kindness first; lockpicks second.']}],
 jail:[{key:'pippit',name:'Pippit',x:720,y:320,lines:['Pippit: These cells are filling with people transferred from the roads.','Duckoman: Someone planned this.','Pippit: I can open the doors. You make sure nobody gets left behind.']},{key:'tamsin',name:'Tamsin',x:1640,y:330,lines:['Tamsin: They keep moving the captives before anyone can count them.','Duckoman: We will keep counting.','Tamsin: Good. A name remembered is a person they have not erased.']}],
 outside:[{key:'nella',name:'Nella',x:0,y:0,lines:['Nella: The pump is dry, and the little ones are sleeping in the barn.','Duckoman: I can reach the valve—or toss my cake into that relay.','Nella: Either way, bring the water back. Franklin took refugees in when his own stores were low.']}],
 crimson:[{key:'tamsin',name:'Tamsin',x:700,y:310,lines:['Tamsin: Franklin’s land is occupied. Their siege gears feed from that freight line.','Duckoman: So we jam the line.','Tamsin: Orrin built a bypass. I will hold the route while you reach it.']},{key:'orrin',name:'Orrin',x:2210,y:325,lines:['Orrin: That machine is loud enough to frighten its own bolts loose.','Duckoman: Can we turn it around?','Orrin: We can make it miss the next shot. That is a start.']}],
 rescue:[],
 stormworks:[{key:'orrin',name:'Orrin',x:0,y:0,lines:['Orrin: The relay can carry a message as well as power.','Duckoman: Then let’s tell the refugees the road is open.','Orrin: And ask our neighbors across the eastern border if they can help.']}],
 'crown-edge':[{key:'bramble',name:'Bramble',x:0,y:0,lines:['Bramble: I map roads people are told not to take. This one ends at Meese territory.','Duckoman: What is beyond the border?','Bramble: Someone has sealed it. But the invitation came from inside.']},{key:'rune',name:'Rune',x:0,y:0,lines:['Rune: Message delivered. The Meese border guards are expecting you.','Duckoman: That is a long way from home.','Rune: Good thing you brought friends. The road is only beginning.']}]
};

/** Optional, proximity-based conversations. No campaign effects until a real story flag is recorded. */
export class AdventureDirector {
 private people:Phaser.GameObjects.Image[]=[];private dialoguePeople:Person[]=[]; private prompt:Phaser.GameObjects.Text; private panel?:Phaser.GameObjects.GameObject[];
 private pump?:{lever:Phaser.GameObjects.Image;relay:Phaser.GameObjects.Image;water:Phaser.GameObjects.Image;bridge:Phaser.GameObjects.Image;bridgeBody:Phaser.GameObjects.Rectangle;done:boolean};
 private devices:{id:string;lever:Phaser.GameObjects.Image;relay:Phaser.GameObjects.Image;lamp:Phaser.GameObjects.Image;body:Phaser.GameObjects.Rectangle;done:boolean;leverX:number;leverY:number}[]=[];
 private shortcut?:{art:Phaser.GameObjects.Image;body:Phaser.GameObjects.Rectangle};
 private active?:{person:Person;beat:number}; private f:Phaser.Input.Keyboard.Key; private enter:Phaser.Input.Keyboard.Key; private esc:Phaser.Input.Keyboard.Key;
 private qaStatus?:HTMLElement;private relayActivations=0;
 private readonly pauseLease=new AdventurePauseLease();
 private placementPlan!:ReturnType<typeof resolveAdventurePlacementPlan>;
 private shuttingDown=false;
 constructor(private scene:Phaser.Scene,private chapter:CampaignScene,private player:Player,private cake?:ThrowableObject){
  const kb=scene.input.keyboard!;this.f=kb.addKey(Phaser.Input.Keyboard.KeyCodes.F);this.enter=kb.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);this.esc=kb.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
  const consumeEscape=(event:KeyboardEvent)=>{if(conversationEscapeConsumed(this.talking)){event.preventDefault();event.stopImmediatePropagation();}};kb.on('keydown-ESC',consumeEscape);scene.events.once(Phaser.Scenes.Events.SHUTDOWN,()=>kb.off('keydown-ESC',consumeEscape));
  this.prompt=scene.add.text(0,0,'F · TALK',{fontFamily:'system-ui',fontSize:'13px',color:'#fff0bd',backgroundColor:'#28343c',padding:{x:8,y:5}}).setOrigin(.5).setScrollFactor(0).setDepth(120).setVisible(false);
  const savedStory=loadProgress(),known=new Set([...savedStory.knownPeople,...this.localStringIds('people')]),flags=new Set([...savedStory.storyFlags,...this.localStringIds('flags')]);this.dialoguePeople=cast[chapter].map(p=>({...p,lines:[...p.lines]}));
  if(chapter==='jail'&&flags.has('jail-captive-route')&&this.dialoguePeople[0])this.dialoguePeople[0].lines=['Pippit: Transfer cells are open. The captives can reach the safer passage now.','Duckoman: They can move together.','Pippit: That is how we keep track of one another.'];
  else if(chapter==='jail'&&known.has('pippit')&&this.dialoguePeople[0])this.dialoguePeople[0].lines=['Pippit: You got those first cells open. Look at us, running a rescue network.','Duckoman: Nobody gets moved where we cannot find them.','Pippit: I will keep a list. You keep making doors behave.'];
  if(chapter==='crimson'&&flags.has('crimson-freight-bypass')&&this.dialoguePeople[0])this.dialoguePeople[0].lines=['Tamsin: The freight bypass is holding. Their siege gears are cut off from our supplies.','Duckoman: And the road is clear for Franklin’s people.','Tamsin: We keep it open until every family is safe.'];
  else if(chapter==='crimson'&&known.has('tamsin')&&this.dialoguePeople[0])this.dialoguePeople[0].lines=['Tamsin: Pippit says the escaped prisoners are helping one another now.','Duckoman: They are not alone anymore.','Tamsin: Then let’s make sure Franklin’s people can say the same.'];
  if(chapter==='stormworks'&&flags.has('stormworks-signal')&&this.dialoguePeople[0])this.dialoguePeople[0].lines=['Orrin: The relay is carrying our message. The upper service crossing is powered too.','Duckoman: Refugees and friends across the border know the road is open.','Orrin: I will keep listening for their reply.'];
  else if(chapter==='stormworks'&&flags.has('rescue-franklin-rescued')&&this.dialoguePeople[0])this.dialoguePeople[0].lines=['Orrin: Franklin’s friends have a safe roof again. This relay reaches even farther.','Duckoman: Tell the refugees the road is open.','Orrin: And ask across the border if they can help.'];
  if(chapter==='crown-edge'&&flags.has('stormworks-signal')&&this.dialoguePeople[0])this.dialoguePeople[0].lines=['Bramble: Orrin’s signal made it all this way. The border sent an invitation back.','Duckoman: We should answer it.','Bramble: The map goes on beyond the seal.'];
  if(chapter==='crown-edge'&&flags.has('crown-edge-border-beacon-lit')&&this.dialoguePeople[1])this.dialoguePeople[1].lines=['Rune: Both beacons are answering. The Meese border guards are expecting you.','Duckoman: Then we will meet them as friends.','Rune: Good. This road is only beginning.'];
  this.resolveSafePlacements();for(const p of this.dialoguePeople){const tex='adventure-npcs';if(!scene.textures.exists(tex)||!scene.textures.get(tex).has(p.key))throw new Error(`Missing authored adventure NPC frame: ${p.key}`);const frame=scene.textures.get(tex).get(p.key),height=64,width=height*frame.width/frame.height;const im=scene.add.image(p.x,p.y,tex,p.key).setOrigin(.5,1).setDisplaySize(width,height).setDepth(5);this.people.push(im);}
  if(chapter==='outside')this.createPumpPuzzle();
  if(chapter==='jail')this.createCaptiveRoute();
  if(chapter==='crimson')this.createFreightBypass();
  if(chapter==='stormworks')this.createSignalPuzzle();
  if(chapter==='crown-edge')this.createBorderBeacons();
  this.installLocalQa();
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN,()=>{this.shuttingDown=true;this.destroy();});
 }
 get talking():boolean{return !!this.active;}
 private resolveSafePlacements(){
  this.placementPlan=resolveAdventurePlacementPlan(this.chapter);const points=this.placementPlan.people;this.dialoguePeople.forEach((p,i)=>{const point=points[i];if(point){p.x=point.x;p.y=point.top;}});
 }
 update(input:InputSnapshot):boolean{
  this.updatePumpRelay();
  this.updateAdventureDevices();
  this.updatePeople();
  if(this.active){if(Phaser.Input.Keyboard.JustDown(this.esc)){this.close();return true;}if(Phaser.Input.Keyboard.JustDown(this.f)||Phaser.Input.Keyboard.JustDown(this.enter)){if(this.active.beat+1>=this.active.person.lines.length)this.close();else this.showBeat(this.active.beat+1);}return true;}
  if(!this.scene.sys.isActive()||!this.player.active||!this.player.canAct||this.player.usingUltimate||this.player.lifeState==='DEAD')return false;
  const foot=this.player.body.bottom;let near:Person|undefined;for(const p of this.dialoguePeople)if(Math.abs(p.x-this.player.sprite.x)<72&&Math.abs(p.y-foot)<76){near=p;break;}
  const activeDevice=this.devices.find(d=>!d.done&&Math.abs(this.player.sprite.x-d.leverX)<64&&Math.abs(foot-d.leverY)<70);
  const nearLever=!!this.pump&&canOperatePump(this.player.sprite.x,this.player.sprite.y,this.pump.done);
  this.prompt.setVisible(!!near||nearLever||!!activeDevice);if(near||nearLever||activeDevice){this.prompt.setText(nearLever||activeDevice?'F · OPERATE':'F · TALK').setPosition(320,346);if(Phaser.Input.Keyboard.JustDown(this.f)){if(nearLever){this.restoreWater('valve');return true;}if(activeDevice){this.activateDevice(activeDevice,'lever');return true;}if(near){this.active={person:near,beat:0};this.open();return true;}}}
  return false;
 }
 private open():boolean {if(!this.active)return false;const acquired=this.pauseLease.acquire({sceneActive:this.scene.sys.isActive(),physicsPaused:this.scene.physics.world.isPaused,playerActive:this.player.active,canAct:this.player.canAct,usingUltimate:this.player.usingUltimate,dead:this.player.lifeState==='DEAD'},()=>this.scene.physics.world.pause());if(!acquired){this.active=undefined;return false;}this.prompt.setVisible(false);const bg=this.scene.add.rectangle(320,345,520,88,0x172329,.96).setStrokeStyle(2,0xd6b87e).setScrollFactor(0).setDepth(121);const text=this.scene.add.text(92,310,'',{fontFamily:'Georgia',fontSize:'15px',color:'#fff1d2',wordWrap:{width:450},lineSpacing:4}).setScrollFactor(0).setDepth(122);const hint=this.scene.add.text(540,375,'F / ENTER · NEXT     ESC · CLOSE',{fontFamily:'system-ui',fontSize:'10px',color:'#c9c0ad'}).setOrigin(1,.5).setScrollFactor(0).setDepth(122);this.panel=[bg,text,hint];this.showBeat(0);return true;}
 private showBeat(beat:number){if(!this.active||!this.panel)return;this.active.beat=beat;(this.panel[1] as Phaser.GameObjects.Text).setText(this.active.person.lines[beat]);}
 private createPumpPuzzle(){
  const complete=this.currentStoryFlags().includes('outside-water-restored');
  if(complete&&this.dialoguePeople[0])this.dialoguePeople[0].lines=['Nella: The pump is running and the shortcut is holding. The barn is warm again.','Duckoman: A little water goes a long way.','Nella: So does remembering who needed it.'];
  const {lever:leverPoint,relay:relayPoint}=this.placementPlan.devices['outside-water-restored']!;
  const lever=this.scene.add.image(leverPoint.x,leverPoint.top,'identity-outside','latch').setOrigin(.5,1).setDisplaySize(28,36).setDepth(4);
  const relay=this.scene.add.image(relayPoint.x,relayPoint.top-60,'identity-outside','press').setDisplaySize(44,38).setDepth(4);
  const water=this.scene.add.image(PUMP_BASE+620,316,'identity-outside','belt').setDisplaySize(110,17).setDepth(3).setTint(complete?0x72c9df:0x58493b);
  const bridgeTop=138,bridgeX=PUMP_BASE+350,bridge=addIdentityBlock(this.scene,'outside',{x:bridgeX,top:bridgeTop,width:220,height:32,frame:'cracked',depth:4}).setTint(0x90b9a3).setVisible(complete);
  const body=this.scene.add.rectangle(bridgeX,bridgeTop+16,220,32,0x6f997f,0).setVisible(false);this.scene.physics.add.existing(body,true);const staticBody=body.body as Phaser.Physics.Arcade.StaticBody;staticBody.enable=complete;this.scene.physics.add.collider(this.player.sprite,body);
  this.pump={lever,relay,water,bridge,bridgeBody:body,done:complete};
  const relayBody=this.scene.add.rectangle(relayPoint.x,relay.y,50,42,0xffffff,0).setVisible(false);this.scene.physics.add.existing(relayBody,true);
  if(this.cake)this.scene.physics.add.overlap(this.cake.sprite,relayBody,()=>{if(relayCanActivate(this.cake?.isThrown===true,this.pump?.done===true))this.restoreWater('relay');});
  this.scene.events.once(Phaser.Scenes.Events.SHUTDOWN,()=>relayBody.destroy());
 }
 private createCaptiveRoute(){const done=this.currentStoryFlags().includes('jail-captive-route'),{lever,relay}=this.placementPlan.devices['jail-captive-route']!;this.makeDevice('jail-captive-route',lever.x,lever.top,relay.x,relay.top-60,done);this.createShortcut('jail',0,820,1070,1462,250,done);if(done&&this.dialoguePeople[0])this.dialoguePeople[0].lines=['Pippit: Transfer cells are open. The captives can reach the safer passage now.','Duckoman: They can move together.','Pippit: That is how we keep track of one another.'];}
 private createFreightBypass(){const done=this.currentStoryFlags().includes('crimson-freight-bypass'),{lever,relay}=this.placementPlan.devices['crimson-freight-bypass']!;this.makeDevice('crimson-freight-bypass',lever.x,lever.top,relay.x,relay.top-60,done);this.createShortcut('crimson',1,180,455,278,300,done);if(done&&this.dialoguePeople[0])this.dialoguePeople[0].lines=['Tamsin: The freight bypass is holding. Their siege gears are cut off from our supplies.','Duckoman: And the road is clear for Franklin’s people.','Tamsin: We keep it open until every family is safe.'];}
 private createSignalPuzzle(){
  const completed=this.currentStoryFlags().includes('stormworks-signal'),{lever,relay}=this.placementPlan.devices['stormworks-signal']!;
  if(completed&&this.dialoguePeople[0])this.dialoguePeople[0].lines=['Orrin: The beacon is carrying our message. Refugees and friends across the border know the road is open.','Duckoman: No one has to travel blind now.','Orrin: I will keep listening for their reply.'];
  this.makeDevice('stormworks-signal',lever.x,lever.top,relay.x,relay.top-60,completed);
  this.createShortcut('stormworks',0,563,785,72,220,completed);
 }
 private createBorderBeacons(){
  const flags=this.currentStoryFlags();
  const a=flags.includes('crown-edge-beacon-a'),b=flags.includes('crown-edge-beacon-b');
  const {lever:leverA,relay:relayA}=this.placementPlan.devices['crown-edge-beacon-a']!,{lever:leverB,relay:relayB}=this.placementPlan.devices['crown-edge-beacon-b']!;
    this.makeDevice('crown-edge-beacon-a',leverA.x,leverA.top,relayA.x,relayA.top-60,a);
  this.makeDevice('crown-edge-beacon-b',leverB.x,leverB.top,relayB.x,relayB.top-60,b);
  const lit=a&&b;if(lit&&this.dialoguePeople[0])this.dialoguePeople[0].lines=['Bramble: Both beacons are answering. The sealed road has opened to the border.','Duckoman: We have an invitation. We should hear what they need.','Bramble: And the map continues beyond every edge.'];
  this.createShortcut('crown-edge',0,810,960,30,180,lit);
 }
 private createShortcut(chapter:'jail'|'crimson'|'stormworks'|'crown-edge',room:number,leftX:number,rightX:number,top:number,width:number,enabled:boolean){const x=room*SECTION_WIDTH+(leftX+rightX)/2,kind:ChapterKind=chapter==='crimson'?'crimson':'jail',art=addIdentityBlock(this.scene,kind,{x,top,width,height:32,frame:'cracked',depth:4}).setTint(chapter==='stormworks'?0x73bbc7:chapter==='crown-edge'?0xc5b47b:chapter==='crimson'?0xc96d72:0xc4a66f).setVisible(enabled),body=this.scene.add.rectangle(x,top+16,width,32,0xffffff,0).setVisible(false);this.scene.physics.add.existing(body,true);const staticBody=body.body as Phaser.Physics.Arcade.StaticBody;staticBody.enable=enabled;this.scene.physics.add.collider(this.player.sprite,body);this.shortcut={art,body};}
 private makeDevice(id:string,leverX:number,leverY:number,relayX:number,relayY:number,done:boolean){
  const texture=this.chapter==='crimson'?'identity-crimson':'identity-jail';
  const lever=this.scene.add.image(leverX,leverY,texture,'latch').setOrigin(.5,1).setDisplaySize(24,30).setTint(done?0x85e4ba:0xffc46b).setDepth(4);
  const relay=this.scene.add.image(relayX,relayY,texture,'press').setDisplaySize(38,38).setTint(done?0x85e4ba:0x77808b).setDepth(4);
  const lamp=this.scene.add.image(relayX+62,relayY-26,texture,'rest').setDisplaySize(24,24).setVisible(done).setDepth(5);
  const body=this.scene.add.rectangle(relayX,relayY,48,44,0xffffff,0).setVisible(false);this.scene.physics.add.existing(body,true);
  if(this.cake)this.scene.physics.add.overlap(this.cake.sprite,body,()=>{if(relayCanActivate(this.cake?.isThrown===true,this.devices.find(d=>d.id===id)?.done===true))this.activateDeviceById(id,'relay');});
  this.devices.push({id,lever,relay,lamp,body,done,leverX,leverY});this.scene.events.once(Phaser.Scenes.Events.SHUTDOWN,()=>body.destroy());
 }
 private activateDevice(device:typeof this.devices[number],method:'lever'|'relay'){if(device.done)return;if(method==='relay')this.relayActivations++;device.done=true;device.relay.setTint(0x85e4ba);device.lever.setTint(0x85e4ba);device.lamp.setVisible(true);const allDone=this.devices.every(d=>d.done);if(allDone&&this.shortcut){this.shortcut.art.setVisible(true);(this.shortcut.body.body as Phaser.Physics.Arcade.StaticBody).enable=true;}const newFlags=[device.id,...(this.chapter==='crown-edge'&&allDone?['crown-edge-border-beacon-lit']:[])];this.recordStoryFlags(newFlags);if(device.id==='stormworks-signal'&&this.dialoguePeople[0])this.dialoguePeople[0].lines=['Orrin: The relay is carrying our message. The upper service crossing is powered too.','Duckoman: Refugees and friends across the border know the road is open.','Orrin: I will keep listening for their reply.'];if(this.chapter==='crown-edge'&&allDone&&this.dialoguePeople[0])this.dialoguePeople[0].lines=['Bramble: Both beacons are answering. The sealed road has opened to the border.','Duckoman: We have an invitation. We should hear what they need.','Bramble: And the map continues beyond every edge.'];}
 private activateDeviceById(id:string,method:'lever'|'relay'){const d=this.devices.find(device=>device.id===id);if(d)this.activateDevice(d,method);}
 private updateAdventureDevices(){for(const d of this.devices){d.lever.setTint(d.done?0x85e4ba:0xffc46b);d.relay.setTint(d.done?0x85e4ba:0x77808b);}}
 private updatePeople(){const t=this.scene.time.now*.003;for(let i=0;i<this.people.length;i++){const person=this.dialoguePeople[i]!,image=this.people[i]!;image.setY(person.y+Math.sin(t+i*1.7)*1.05).setFlipX(this.player.sprite.x<person.x);}}
 private updatePumpRelay(){if(!this.pump)return;this.pump.lever.setTint(this.pump.done?0x85e4ba:0xffcc70);this.pump.relay.setTint(this.pump.done?0x85e4ba:0xffffff);}
 private restoreWater(method:'valve'|'relay'){
  if(!this.pump||this.pump.done)return;this.pump.done=true;if(method==='relay')this.relayActivations++;this.pump.bridge.setVisible(true);(this.pump.bridgeBody.body as Phaser.Physics.Arcade.StaticBody).enable=true;this.pump.water.setTint(0x72c9df);this.pump.lever.setTint(0x85e4ba);this.pump.relay.setTint(0x85e4ba);
  if(this.dialoguePeople[0])this.dialoguePeople[0].lines=['Nella: There it goes! Water for the barn, and a dry crossing for the road.','Duckoman: Valve or cake relay. We got both working.','Nella: Franklin would say the same thing: nobody gets left behind.'];
  this.recordStoryFlags(completeWaterRoute([],method));
 }
 private close(){const done=!this.shuttingDown&&this.active?.beat===((this.active?.person.lines.length??0)-1),person=this.active?.person;this.active=undefined;this.panel?.forEach(object=>object.destroy());this.panel=undefined;this.pauseLease.release(!this.shuttingDown&&this.scene.sys.isActive()&&this.scene.physics?.world?.isPaused===true&&this.player.active&&this.player.lifeState!=='DEAD'&&!this.player.usingUltimate,()=>this.scene.physics.world.resume());if(done&&person){this.recordKnownPeople([person.key]);this.recordStoryFlags([`${this.chapter}-${person.key}-met`]);}}
 private localMode():boolean{return !!this.scene.registry.get('devPreview')||!campaignRunEligible()||this.player.infiniteHealth;}
 private localStringIds(key:'flags'|'people'):string[]{if(!this.localMode())return [];const value=this.scene.registry.get(`adventure.local.${key}`);return Array.isArray(value)?value.filter((x):x is string=>typeof x==='string'):[];}
 private currentStoryFlags():string[]{return [...new Set([...loadProgress().storyFlags,...this.localStringIds('flags')])];}
 private recordStoryFlags(ids:string[]){const flags=[...new Set([...this.currentStoryFlags(),...ids])];this.scene.registry.set('adventure.local.flags',flags);if(!this.scene.registry.get('devPreview')&&campaignRunEligible()&&!this.player.infiniteHealth){const p=loadProgress();p.storyFlags=[...new Set([...p.storyFlags,...ids])];saveProgress(p);}}
 private recordKnownPeople(ids:string[]){const known=[...new Set([...loadProgress().knownPeople,...this.localStringIds('people'),...ids])];this.scene.registry.set('adventure.local.people',known);if(!this.scene.registry.get('devPreview')&&campaignRunEligible()&&!this.player.infiniteHealth){const p=loadProgress();p.knownPeople=[...new Set([...p.knownPeople,...ids])];saveProgress(p);}}
 private installLocalQa(){const qa=new URLSearchParams(location.search).get('qa');if(!['localhost','127.0.0.1'].includes(location.hostname)||qa!=='adventure'&&qa!=='1')return;const panel=document.createElement('div');panel.dataset.qa='adventure';panel.style.cssText='position:fixed;left:8px;bottom:8px;z-index:99999;padding:6px 9px;background:#12212ddd;color:#e9e2d0;font:11px monospace;pointer-events:auto';const status=document.createElement('output');status.dataset.qaStatus='true';panel.append(status);const button=document.createElement('button');button.type='button';button.textContent=this.chapter==='outside'?'Player → pump ledge':this.chapter==='stormworks'?'Player → beacon':this.chapter==='crown-edge'?'Player → border beacon':'Player → chapter start';button.style.cssText='margin-left:8px;font:11px monospace';button.addEventListener('click',()=>{const w=window as Window&{__duckomanCameraQA?:{select:(room:number,step:number)=>void};__duckomanLateQA?:{select:(room:number,step:number)=>void}};if(this.chapter==='outside')w.__duckomanCameraQA?.select(PUMP_ROOM,1);else if(this.chapter==='stormworks'||this.chapter==='crown-edge')w.__duckomanLateQA?.select(0,2);else w.__duckomanCameraQA?.select(0,-1);});panel.append(button);document.body.append(panel);this.qaStatus=status;this.scene.events.on(Phaser.Scenes.Events.POST_UPDATE,this.updateQa,this);this.scene.events.once(Phaser.Scenes.Events.SHUTDOWN,()=>{this.scene.events.off(Phaser.Scenes.Events.POST_UPDATE,this.updateQa,this);panel.remove();this.qaStatus=undefined;});}
 private updateQa(){if(!this.qaStatus)return;const bridgeEnabled=(this.pump?.bridgeBody.body as Phaser.Physics.Arcade.StaticBody|undefined)?.enable??false,devices=this.devices.map(d=>`${d.id}:${d.done?'on':'off'}`).join(',')||'none';this.qaStatus.textContent=`chapter=${this.chapter} x=${Math.round(this.player.sprite.x)} y=${Math.round(this.player.sprite.y)} talk=${this.active?`${this.active.person.key}:${this.active.beat+1}`:'closed'} pump=${this.pump?.done?'restored':'dry'} devices=${devices} relayHits=${this.relayActivations} bridgeBody=${bridgeEnabled} preview=${!!this.scene.registry.get('devPreview')}`;}
 destroy(){this.close();this.prompt.destroy();this.people.forEach(p=>p.destroy());}
}
