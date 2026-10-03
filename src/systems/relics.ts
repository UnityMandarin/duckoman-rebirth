import type Phaser from 'phaser';

export type RelicId = 'bronze-wing';

export const RELICS: Record<RelicId, { name: string; blurb: string; airJumps: number }> = {
  'bronze-wing': { name: 'BRONZE WING', blurb: 'One extra jump in midair', airJumps: 1 }
};

const KEY = 'relics';
const RUSTWING_DEFEATED = 'rustwing-defeated';

/** Relics live in the game registry so they carry across every scene for the session. */
export function ownedRelics(registry: Phaser.Data.DataManager): readonly RelicId[] {
  return (registry.get(KEY) as RelicId[] | undefined) ?? [];
}

export function grantRelic(registry: Phaser.Data.DataManager, id: RelicId): void {
  registry.set(KEY, withRelic(ownedRelics(registry), id));
}

export function revokeRelic(registry: Phaser.Data.DataManager, id: RelicId): void {
  registry.set(KEY, ownedRelics(registry).filter(owned => owned !== id));
}

/** The castle hole seals once Rustwing has been killed this session, whether or not the Bronze Wing is still held. */
export function rustwingDefeated(registry: Phaser.Data.DataManager): boolean {
  return registry.get(RUSTWING_DEFEATED) === true;
}

export function markRustwingDefeated(registry: Phaser.Data.DataManager): void {
  registry.set(RUSTWING_DEFEATED, true);
}

export function withRelic(owned: readonly RelicId[], id: RelicId): RelicId[] {
  return owned.includes(id) ? [...owned] : [...owned, id];
}

export function relicAirJumps(owned: readonly RelicId[]): number {
  return owned.reduce((total, id) => total + RELICS[id].airJumps, 0);
}
