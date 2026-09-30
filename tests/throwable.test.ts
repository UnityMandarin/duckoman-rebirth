import { describe, expect, it, vi } from 'vitest';
vi.mock('phaser', () => ({ default: { Math: { DegToRad: (d: number) => d * Math.PI / 180 } } }));
import { ThrowableObject } from '../src/entities/ThrowableObject';
import type { Player } from '../src/entities/Player';
import { TUNING } from '../src/config/tuning';

function cakeFixture() {
  const scene = { time: { now: 10_000 } };
  const body = { setEnable() { return this; }, setVelocity() { return this; }, reset() {} };
  const cake = Object.create(ThrowableObject.prototype) as ThrowableObject;
  Object.assign(cake, { state: 'IDLE', thrownAt: -Infinity, body, sprite: { x: 0, y: 0, scene, setPosition() {} } });
  const player = { facing: 1, sprite: { x: 0, y: 0 } } as unknown as Player;
  return { cake, player, scene };
}

describe('cake catch and throw timing', () => {
  it('can be caught mid-flight once the catch delay has passed', () => {
    const { cake, player, scene } = cakeFixture();
    cake.carry(player); cake.throw(player);
    scene.time.now += TUNING.throwable.catchDelay - 1;
    expect(cake.catchable).toBe(false);
    scene.time.now += 1;
    expect(cake.catchable).toBe(true);
    cake.carry(player);
    expect(cake.state).toBe('CARRIED');
  });
  it('refuses a second throw until the cooldown since the last throw has passed', () => {
    const { cake, player, scene } = cakeFixture();
    cake.carry(player); cake.throw(player);
    cake.state = 'CARRIED';
    scene.time.now += TUNING.throwable.throwCooldown - 1;
    cake.throw(player);
    expect(cake.state).toBe('CARRIED');
    scene.time.now += 1;
    cake.throw(player);
    expect(cake.state).toBe('THROWN');
  });
});
