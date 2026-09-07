import { TUNING } from '../config/tuning';

export interface RoomRectangle { x: number; y: number; width: number; height: number; }

export const GATE_1_ROOM = {
  world: { width: TUNING.simulation.worldWidth, height: TUNING.simulation.worldHeight },
  playerSpawn: { x: 80, y: 332.5 },
  throwableSpawn: { x: 650, y: 330 },
  enemySpawn: { x: 930, y: 335 },
  platforms: [
    { x: 640, y: 380, width: 1280, height: 40 },
    { x: 260, y: 300, width: 180, height: 20 },
    { x: 520, y: 250, width: 180, height: 20 },
    { x: 780, y: 330, width: 20, height: 60 },
    { x: 1080, y: 330, width: 20, height: 60 }
  ] satisfies RoomRectangle[]
} as const;
