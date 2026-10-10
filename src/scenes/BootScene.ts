import {parseFranklinBeat} from '../systems/FranklinPresentation';
import Phaser from 'phaser';
import {hasStoredProgress,loadProgress,CHAPTERS,sceneDataFromProgress} from '../systems/progress';
export class BootScene extends Phaser.Scene {
 constructor(){super('boot');}
 preload():void {}
 create():void {const params=new URLSearchParams(location.search),requested=params.get('chapter'),local=import.meta.env.DEV&&['localhost','127.0.0.1'].includes(location.hostname),preview=local&&CHAPTERS.includes(requested as (typeof CHAPTERS)[number]);this.registry.set('devPreview',!!preview);if(preview){const sectionRaw=params.get('section'),section=sectionRaw===null?undefined:Number(sectionRaw),limit=requested==='jail'?12:requested==='outside'?24:requested==='crimson'?12:undefined,previewSection=section!==undefined&&Number.isInteger(section)&&section>=0&&limit!==undefined&&section<limit?section:undefined;this.scene.start(requested!,{devPreview:true,previewSection,bossPreview:requested==='rescue'&&params.get('boss')==='1',bossBeat:parseFranklinBeat(params.get('bossBeat'),{local,devPreview:!!preview,bossPreview:requested==='rescue'&&params.get('boss')==='1'})});return;}if(hasStoredProgress()){const saved=loadProgress();if(saved.ended){this.scene.start('menu');return;}const scene=CHAPTERS.includes(saved.currentScene)?saved.currentScene:'gate-1';this.scene.start(scene,{...sceneDataFromProgress(saved,scene),fromSave:true});}else this.scene.start('menu');}
}
