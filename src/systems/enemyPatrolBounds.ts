import type {EnemyPlacement} from '../data/chapterChallenges';
import type {Ledge} from '../data/chapters';

/** Match an authored enemy to the ledge beneath its feet and keep its patrol on that ledge. */
export function enemyPatrolBounds(placement:EnemyPlacement,ledges:readonly Ledge[],actualBodyWidth:number):{left:number;right:number}|undefined {
 const footY=placement.y+25;
 const support=ledges.filter(ledge=>placement.x>=ledge.x-ledge.width/2&&placement.x<=ledge.x+ledge.width/2)
  .sort((a,b)=>Math.abs(a.y-a.height/2-footY)-Math.abs(b.y-b.height/2-footY))[0];
 if(!support)return undefined;
 const inset=actualBodyWidth/2+12,min=support.x-support.width/2+inset,max=support.x+support.width/2-inset;
 if(min>max)return undefined;
 return {left:Math.max(min,Math.min(max,placement.x-placement.patrol)),right:Math.max(min,Math.min(max,placement.x+placement.patrol))};
}
