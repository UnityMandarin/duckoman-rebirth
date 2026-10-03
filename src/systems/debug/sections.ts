import type Phaser from 'phaser';
import { SECTION_WIDTH } from '../../data/chapters';
import { HITBOX_LEGEND } from '../DebugHitboxes';
import { CASTLE_SECRET } from '../../data/castle';
import { RELICS, grantRelic, ownedRelics, revokeRelic, type RelicId } from '../relics';
import { DEBUG_TOGGLES, debugToggleSetting, setDebugToggle, type DebugToggle } from './debugSettings';
import {markCampaignRunIneligible} from './debugSettings';

export interface DebugSection { title: string; body: HTMLElement; refresh?: () => void; }
export type DebugSectionFactory = (game: Phaser.Game) => DebugSection;

const element = <K extends keyof HTMLElementTagNameMap>(tag: K, className?: string, text?: string): HTMLElementTagNameMap[K] => {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (text) el.textContent = text;
  return el;
};

function toggleRow(toggle: DebugToggle): { row: HTMLLabelElement; refresh: () => void } {
  const row = element('label', 'debug-toggle');
  const box = element('input');
  box.type = 'checkbox';
  box.onchange = () => setDebugToggle(toggle, box.checked);
  row.append(box, DEBUG_TOGGLES[toggle].label);
  return { row, refresh: () => { box.checked = debugToggleSetting(toggle); } };
}

function toggleList(title: string, toggles: DebugToggle[]): DebugSection {
  const body = element('div', 'debug-stack');
  const rows = toggles.map(toggleRow);
  body.append(...rows.map(r => r.row));
  return { title, body, refresh: () => rows.forEach(r => r.refresh()) };
}

const LEVELS: { label: string; scene: string; data?: object }[] = [
  { label: 'Castle', scene: 'gate-1' },
  { label: 'Castle · Secret', scene: CASTLE_SECRET.scene },
  { label: 'Castle · Molten Rustwing', scene: CASTLE_SECRET.scene, data: { rustForm: 2 } },
  { label: 'Jail', scene: 'jail' },
  { label: 'Wildlands', scene: 'outside' },
  { label: 'Wildlands · Antler Regent', scene: 'outside', data: { checkpoint: 22 * SECTION_WIDTH + 120 } },
  { label: 'Crimson', scene: 'crimson' },
  { label: 'Crimson · Crimson Claw', scene: 'crimson', data: { checkpoint: 10 * SECTION_WIDTH + 120 } },
  { label: 'Hollow Prison', scene: 'rescue', data: { devPreview:true } },
  { label: 'Hollow Prison · Warden', scene: 'rescue', data: { devPreview:true,bossPreview:true } }
];

const levelSelect: DebugSectionFactory = game => {
  const body = element('div', 'debug-stack');
  for (const level of LEVELS) {
    const button = element('button', 'debug-link', level.label);
    button.onclick = () => {
      markCampaignRunIneligible();
      // Phaser keeps a scene's previous start data unless new data is passed, which would reuse old checkpoints.
      const data = { ...level.data, devPreview:true };
      const current = game.scene.getScenes(true)[0];
      if (current) current.scene.start(level.scene, data);
      else game.scene.start(level.scene, data);
    };
    body.append(button);
  }
  return { title: 'Level select', body };
};

const cheats: DebugSectionFactory = () => toggleList('Cheats', ['invincible', 'infiniteUltimate', 'infiniteJumps', 'infiniteDashes']);

/** Grant or remove relics for the session. The castle hole seals when Rustwing dies, not when a relic is toggled. */
const relics: DebugSectionFactory = game => {
  const body = element('div', 'debug-stack');
  const rows = (Object.keys(RELICS) as RelicId[]).map(id => {
    const row = element('label', 'debug-toggle');
    const box = element('input');
    box.type = 'checkbox';
    box.onchange = () => (box.checked ? grantRelic : revokeRelic)(game.registry, id);
    row.append(box, `${RELICS[id].name} · ${RELICS[id].blurb}`);
    return { row, refresh: () => { box.checked = ownedRelics(game.registry).includes(id); } };
  });
  body.append(...rows.map(r => r.row));
  const refresh = (): void => rows.forEach(r => r.refresh());
  // Picking a relic up in-game updates the checkboxes too.
  game.registry.events.on('setdata', refresh);
  game.registry.events.on('changedata', refresh);
  refresh();
  return { title: 'Relics', body, refresh };
};

const view: DebugSectionFactory = () => {
  const { row, refresh } = toggleRow('hitboxes');
  const legend = element('ul', 'debug-legend');
  for (const { color, label } of HITBOX_LEGEND) {
    const item = element('li', undefined, label);
    item.style.setProperty('--swatch', `#${color.toString(16).padStart(6, '0')}`);
    legend.append(item);
  }
  const body = element('div', 'debug-stack');
  body.append(row, legend);
  return { title: 'View', body, refresh: () => { refresh(); legend.hidden = !debugToggleSetting('hitboxes'); } };
};

/** Panel sections, top to bottom. */
export const DEBUG_SECTIONS: DebugSectionFactory[] = [levelSelect, cheats, relics, view];
