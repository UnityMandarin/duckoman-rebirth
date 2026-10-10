import {readFileSync} from 'node:fs';
import {inflateSync} from 'node:zlib';
import {describe,it,expect,vi} from 'vitest';
vi.mock('phaser',()=>({default:{Scenes:{Events:{}},Math:{}}}));
import {CHAPTER_ART} from '../src/data/chapters';
import {sceneAssetEntries} from '../src/scenes/SceneAssets';
describe('chapter art packaging',()=>{
 it('maps thorn-boar to the transparent mask sprite',()=>{
  const entry=['gate-1','jail','outside','crimson','rescue'].map(profile=>sceneAssetEntries(profile).find(item=>item.key==='thorn-boar')).find(Boolean);
  expect(entry.path).toBe('assets/chapters/thorn-boar-front-spike-v4.png');
  const png=readFileSync(`public/${entry.path}`);expect(png.subarray(1,4).toString()).toBe('PNG');expect(png[25]).toBe(6);
  expect(png.readUInt32BE(16)).toBe(1536);expect(png.readUInt32BE(20)).toBe(1024);
 });
 it('ships every referenced concept as a valid PNG',()=>{
  for(const key of CHAPTER_ART){const png=readFileSync(`public/assets/chapters/${key}.png`);expect(png.subarray(1,4).toString()).toBe('PNG');expect(png.readUInt32BE(16)).toBeGreaterThan(1000);}
 });
 it('uses real alpha for sprite backgrounds, not baked checkerboards',()=>{
  for(const key of ['thorn-boar','gloom-hare','antler-regent','road-platform','rest-lantern','sealed-dispatch']){
   const png=readFileSync(`public/assets/chapters/${key}.png`);expect(png[25],key).toBe(6);
   const chunks=[];
   for(let offset=8;offset<png.length;){const size=png.readUInt32BE(offset);if(png.toString('ascii',offset+4,offset+8)==='IDAT')chunks.push(png.subarray(offset+8,offset+8+size));offset+=size+12;}
   // The first pixel has zero PNG predictor for all filters: its alpha is direct.
   expect(inflateSync(Buffer.concat(chunks))[4],key).toBe(0);
  }
 });
});
