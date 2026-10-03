import Phaser from 'phaser';
import {preloadCommon,registerCommonFrames} from './CommonAssets';
import {hasStoredProgress,loadProgress,CHAPTERS,sceneDataFromProgress} from '../systems/progress';
export class BootScene extends Phaser.Scene {
 constructor(){super('boot');}
 preload():void {preloadCommon(this);for(const [key,path] of [['ruined-kingdom','chapters/ruined-kingdom'],['jail-gallery','chapters/jail-gallery'],['wildwood','chapters/wildwood'],['crimson-crab','chapters/crimson-crab'],['cistern','chapters/cistern']])if(!this.textures.exists(`menu-${key}`))this.load.image(`menu-${key}`,`${import.meta.env.BASE_URL}assets/${path}.png`);}
 create():void {registerCommonFrames(this);const params=new URLSearchParams(location.search),requested=params.get('chapter'),preview=import.meta.env.DEV&&['localhost','127.0.0.1'].includes(location.hostname)&&CHAPTERS.includes(requested as (typeof CHAPTERS)[number]);this.registry.set('devPreview',!!preview);if(preview){this.scene.start(requested!,{devPreview:true,bossPreview:requested==='rescue'&&params.get('boss')==='1'});return;}if(hasStoredProgress()){const saved=loadProgress();if(saved.ended){this.scene.start('menu');return;}const scene=CHAPTERS.includes(saved.currentScene)?saved.currentScene:'gate-1';this.scene.start(scene,{...sceneDataFromProgress(saved,scene),fromSave:true});}else this.scene.start('menu');}
}
