export const BOSS_RULES = { hp:15, bombInterval:2000, bombDamage:1, bombRadius:55, minionInterval:6000, normals:3, pointed:1, flightInterval:10000, hitLock:650 } as const;
export class BossClock {
  private bomb=0; private wave=0; private flight=0;
  tick(elapsed:number): {bomb:boolean;wave:boolean;flight:boolean} {
    const b=Math.floor(elapsed/BOSS_RULES.bombInterval), w=Math.floor(elapsed/BOSS_RULES.minionInterval), f=Math.floor(elapsed/BOSS_RULES.flightInterval);
    const events={bomb:b>this.bomb,wave:w>this.wave,flight:f>this.flight};
    this.bomb=b;this.wave=w;this.flight=f;return events;
  }
}
export class BossHealth {
  hp:number=BOSS_RULES.hp; private until=0; private contact=false;
  touch(now:number,overlapping:boolean,attack:boolean):boolean {
    if(!overlapping){this.contact=false;return false;}
    if(this.contact || !attack || now<this.until || this.hp<=0)return false;
    this.contact=true;this.until=now+BOSS_RULES.hitLock;this.hp--;return true;
  }
}
