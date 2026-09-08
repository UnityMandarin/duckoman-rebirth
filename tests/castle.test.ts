import {describe,it,expect} from 'vitest';
import {CASTLE,CASTLE_PLATFORMS} from '../src/data/castle';
import {BossClock,BossHealth,BOSS_RULES} from '../src/systems/BossRules';
import {ARENA_LEDGES,nextLedge,connected} from '../src/systems/ArenaNavigation';
import {enemyContact} from '../src/systems/contactRules';
describe('castle and warden contracts',()=>{
  it('makes pointed heads dangerous to stomp but vulnerable to dash',()=>{
    expect(enemyContact(false,true,true)).toBe('damage');
    expect(enemyContact(true,true,true)).toBe('dash');
    expect(enemyContact(false,false,true)).toBe('stomp');
    expect(enemyContact(false,false,false)).toBe('damage');
  });
  it('extends beyond four rooms for the double-size boss arena',()=>{
    expect(CASTLE.width).toBeGreaterThan(2560*4);
    expect(Math.min(...CASTLE_PLATFORMS.map(p=>p.y))).toBeLessThan(-200);
    expect(CASTLE_PLATFORMS[0].x-CASTLE_PLATFORMS[0].width/2).toBe(2560);
    for(const p of CASTLE_PLATFORMS){expect(p.x+p.width/2).toBeLessThanOrEqual(CASTLE.width);expect(p.y+p.height/2).toBeLessThanOrEqual(CASTLE.bottom);}
  });
  it('uses the exact bomb, wave and flight intervals',()=>{
    const c=new BossClock();let bombs=0,waves=0,flights=0;
    for(let t=0;t<=60000;t+=10){const e=c.tick(t);bombs+=+e.bomb;waves+=+e.wave;flights+=+e.flight;}
    expect([bombs,waves,flights]).toEqual([30,10,6]);
    expect([BOSS_RULES.normals,BOSS_RULES.pointed,BOSS_RULES.bombDamage]).toEqual([3,1,1]);
  });
  it('requires fifteen separated attacks, never repeated contact or non-attacks',()=>{
    const h=new BossHealth();expect(h.touch(0,true,false)).toBe(false);
    for(let i=0;i<15;i++){
      expect(h.touch(i*1000,true,true)).toBe(true);
      expect(h.touch(i*1000+900,true,true)).toBe(false);
      h.touch(i*1000+950,false,false);
    }
    expect(h.hp).toBe(0);expect(h.touch(20000,true,true)).toBe(false);
  });
  it('does not permit contact separation to bypass boss hit lock',()=>{
    const h=new BossHealth();h.touch(100,true,true);h.touch(200,false,false);
    expect(h.touch(300,true,true)).toBe(false);expect(h.hp).toBe(14);
  });
  it('connects every arena elevation using physically bounded jump edges',()=>{
    for(let from=0;from<ARENA_LEDGES.length;from++)for(let to=0;to<ARENA_LEDGES.length;to++){
      let node=from;
      for(let steps=0;steps<8&&node!==to;steps++){const next=nextLedge(node,to);expect(connected(ARENA_LEDGES[node],ARENA_LEDGES[next])).toBe(true);node=next;}
      expect(node).toBe(to);
    }
  });
});
