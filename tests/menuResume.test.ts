import {describe,expect,it,vi} from 'vitest';
vi.mock('phaser',()=>({default:{Scene:class {}}}));
vi.mock('../src/scenes/SceneAssets',()=>({preloadSceneAssets:vi.fn()}));
vi.mock('../src/systems/SpatialMenuPresentation',()=>({SpatialMenuPresentation:class {}}));
vi.mock('../src/systems/renderScale',()=>({renderQuality:()=> 'smooth',setRenderQuality:vi.fn()}));
import {MenuScene} from '../src/scenes/MenuScene';

describe('spatial menu Resume button',()=>{
 it('starts one closing transition and resumes the paused world only after it completes',()=>{
  const menu=new MenuScene() as unknown as {
   pausedScene:string;actionTaken:boolean;act:(action:string)=>void;closeResume:()=>void;resumeAction:()=>void;
   presentation:{close:(done:()=>void)=>void};scene:{isPaused:(key:string)=>boolean;setVisible:ReturnType<typeof vi.fn>;stop:ReturnType<typeof vi.fn>;resume:ReturnType<typeof vi.fn>};game:{canvas:{focus:ReturnType<typeof vi.fn>}};
  };
  let finish:(()=>void)|undefined;
  const close=vi.fn((done:()=>void)=>{finish=done;});
  menu.pausedScene='crimson';menu.actionTaken=false;menu.resumeAction=()=>menu.closeResume();
  menu.presentation={close};menu.scene={isPaused:()=>true,setVisible:vi.fn(),stop:vi.fn(),resume:vi.fn()};menu.game={canvas:{focus:vi.fn()}};
  menu.act('primary');menu.act('primary');
  expect(close).toHaveBeenCalledTimes(1);expect(menu.scene.resume).not.toHaveBeenCalled();
  finish?.();expect(menu.scene.resume).toHaveBeenCalledExactlyOnceWith('crimson');expect(menu.scene.stop).toHaveBeenCalledTimes(1);
 });
});
