import {describe,it,expect,vi} from 'vitest';
vi.mock('phaser',()=>({default:{}}));
import {DEBUG_SECTIONS} from '../src/systems/debug/sections';
import {setDebugMode} from '../src/systems/debug/debugSettings';
describe('Warden debug menu',()=>{
 it('rechecks actual debug mode when a retained menu button is clicked',()=>{
  const nodes:any[]=[];vi.stubGlobal('document',{createElement:(tag:string)=>{const el:any={tag,textContent:'',append:vi.fn()};nodes.push(el);return el;}});
  const start=vi.fn(),game:any={scene:{getScenes:()=>[],start}};const section=DEBUG_SECTIONS[0](game);expect(section.title).toBe('Level select');const button=nodes.find(node=>node.textContent==='Hollow Prison · Warden (debug)');expect(button).toBeDefined();
  setDebugMode(false);button.onclick();expect(start).not.toHaveBeenCalled();setDebugMode(true);button.onclick();expect(start).toHaveBeenCalledWith('rescue',{devPreview:true,bossPreview:true,wardenPreview:true});setDebugMode(false);button.onclick();expect(start).toHaveBeenCalledOnce();vi.unstubAllGlobals();
 });
});
