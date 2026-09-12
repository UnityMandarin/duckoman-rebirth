import {readFileSync} from 'node:fs';
import {inflateSync} from 'node:zlib';
import {describe,it,expect} from 'vitest';
import {CHAPTER_ART} from '../src/data/chapters';
describe('chapter art packaging',()=>{
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
