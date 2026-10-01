import Phaser from 'phaser';
import { TUNING } from '../config/tuning';
import {computeRenderScale,GRAPHICS_QUALITY_KEY,parseRenderQuality,type RenderQuality} from './performancePolicy';

const {width:WIDTH,height:HEIGHT}=TUNING.simulation;
function storedQuality():RenderQuality {try{return parseRenderQuality(globalThis.localStorage?.getItem(GRAPHICS_QUALITY_KEY));}catch{return 'smooth';}}
let quality=storedQuality();
function fitScale():number {if(typeof window==='undefined')return 1;return computeRenderScale(window.innerWidth,window.innerHeight,window.devicePixelRatio||1,quality);}
let scale=fitScale();

/** Canvas pixels per layout unit. Changes when the window or quality preference changes. */
export function renderScale():number{return scale;}
export function renderQuality():RenderQuality{return quality;}
export function canvasSize():{width:number;height:number}{return {width:WIDTH*scale,height:HEIGHT*scale};}

interface Registered {scene:Phaser.Scene;hud:Phaser.Cameras.Scene2D.Camera;}
const registered=new Set<Registered>();

/** Preserve the existing top-left scroll convention while Phaser zooms around camera centers. */
function keepScrollAtViewCorner(camera:Phaser.Cameras.Scene2D.Camera):void {
 const preRender=camera.preRender.bind(camera);
 camera.preRender=()=>{const lagX=camera.width/2*(1-1/camera.zoomX),lagY=camera.height/2*(1-1/camera.zoomY);camera.scrollX-=lagX;camera.scrollY-=lagY;preRender();camera.scrollX+=lagX;camera.scrollY+=lagY;};
}
const sharpen=(object:Phaser.GameObjects.GameObject):void=>{if(object instanceof Phaser.GameObjects.Text)object.setResolution(scale);};

/** Scales the main camera, adds its matching HUD camera, and sharpens text at the current render scale. */
export function setupRenderScale(scene:Phaser.Scene,hudName:string):Phaser.Cameras.Scene2D.Camera {
 const main=scene.cameras.main.setZoom(scale);keepScrollAtViewCorner(main);scene.children.list.forEach(sharpen);scene.events.on(Phaser.Scenes.Events.ADDED_TO_SCENE,sharpen);
 const {width,height}=canvasSize(),entry={scene,hud:scene.cameras.add(0,0,width,height).setOrigin(0).setZoom(scale).setName(hudName)};registered.add(entry);
 scene.events.once(Phaser.Scenes.Events.SHUTDOWN,()=>{scene.events.off(Phaser.Scenes.Events.ADDED_TO_SCENE,sharpen);registered.delete(entry);});return entry.hud;
}

function resizeRegistered(game:Phaser.Game,next:number):void {
 const ratio=next/scale;scale=next;const {width,height}=canvasSize();game.scale.setGameSize(width,height);
 for(const {scene,hud} of registered){const main=scene.cameras.main;main.setSize(width,height).setZoom(main.zoomX*ratio,main.zoomY*ratio);hud.setSize(width,height).setZoom(scale);scene.children.list.forEach(sharpen);}
}

/** Save a graphics preference safely and apply it immediately to every registered scene. */
export function setRenderQuality(value:RenderQuality,game:Phaser.Game):void {
 quality=parseRenderQuality(value);try{globalThis.localStorage?.setItem(GRAPHICS_QUALITY_KEY,quality);}catch{/* Preference remains active for this session if storage is blocked. */}
 const next=typeof window==='undefined'?1:computeRenderScale(window.innerWidth,window.innerHeight,window.devicePixelRatio||1,quality);resizeRegistered(game,next);
}

/** Re-picks the render scale whenever the window changes size. Returns its cleanup function. */
export function installRenderScale(game:Phaser.Game):()=>void {
 const onResize=():void=>{const next=fitScale();if(next===scale)return;resizeRegistered(game,next);};window.addEventListener('resize',onResize);return ()=>window.removeEventListener('resize',onResize);
}
