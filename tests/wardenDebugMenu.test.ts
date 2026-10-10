import {describe,it,expect,vi} from 'vitest';
vi.mock('phaser',()=>({default:{}}));
import {DEBUG_SECTIONS} from '../src/systems/debug/sections';
import {setDebugMode} from '../src/systems/debug/debugSettings';
describe('Warden access',()=>{
 it('keeps Warden out of the debug menu and preserves the Franklin shortcut',()=>{
  const nodes:any[]=[];vi.stubGlobal('document',{createElement:(tag:string)=>{const el:any={tag,textContent:'',append:vi.fn()};nodes.push(el);return el;}});
  const start=vi.fn(),game:any={scene:{getScenes:()=>[],start}};const section=DEBUG_SECTIONS[0](game);expect(section.title).toBe('Level select');
  expect(nodes.some(node=>/Warden/i.test(node.textContent))).toBe(false);
  const franklin=nodes.find(node=>node.textContent==='Hollow Prison · Franklin rescue');expect(franklin).toBeDefined();
  setDebugMode(false);franklin.onclick();setDebugMode(true);franklin.onclick();
  expect(start).toHaveBeenNthCalledWith(1,'rescue',{devPreview:true,bossPreview:true});expect(start).toHaveBeenNthCalledWith(2,'rescue',{devPreview:true,bossPreview:true});setDebugMode(false);
  vi.unstubAllGlobals();
 });
});
