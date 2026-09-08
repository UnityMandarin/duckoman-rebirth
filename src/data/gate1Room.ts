import { TUNING } from '../config/tuning';

export interface RoomRectangle { x: number; y: number; width: number; height: number; }

export const GATE_1_ROOM = {
  world: { width: 2560, height: TUNING.simulation.worldHeight },
  playerSpawn: { x: 80, y: 332.5 },
  throwableSpawn: { x: 650, y: 330 },
  enemySpawn: { x: 930, y: 335 },
  extraEnemies: [
    { x: 1400, y: 290, left: 1345, right: 1485 },
    { x: 1760, y: 220, left: 1690, right: 1850 },
    { x: 2365, y: 240, left: 2270, right: 2470 }
  ],
  pillar: { x: 2030, width: 76, height: 155, triggerX: 1820, warningMs: 1500, fallMs: 650, damage: 2 },
  platforms: [
    { x: 640, y: 380, width: 1280, height: 40 },
    { x: 260, y: 300, width: 180, height: 20 },
    { x: 520, y: 250, width: 180, height: 20 },
    { x: 780, y: 330, width: 20, height: 60 },
    { x: 1080, y: 330, width: 20, height: 60 }
    ,{ x: 1920, y: 380, width: 1280, height: 40 }
    ,{ x: 1290, y: 330, width: 90, height: 20 }
    ,{ x: 1415, y: 325, width: 190, height: 20 }
    ,{ x: 1590, y: 275, width: 90, height: 20 }
    ,{ x: 1770, y: 255, width: 210, height: 20 }
    ,{ x: 2190, y: 320, width: 85, height: 20 }
    ,{ x: 2370, y: 275, width: 250, height: 20 }
    ,{ x: 2530, y: 225, width: 60, height: 20 }
  ] satisfies RoomRectangle[]
} as const;
