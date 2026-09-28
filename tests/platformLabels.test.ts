import { describe, expect, it } from 'vitest';
import { platformLabels, sectionLetter } from '../src/systems/debug/platformLabels';

describe('platform labels', () => {
  it('continues letters past Z', () => {
    expect([0, 1, 25, 26, 27, 51, 52].map(sectionLetter)).toEqual(['A', 'B', 'Z', 'AA', 'AB', 'AZ', 'BA']);
  });

  it('numbers platforms left to right within each section', () => {
    const platforms = [
      { x: 600, y: 200, width: 100 },
      { x: 200, y: 300, width: 100 },
      { x: 1500, y: 200, width: 100 },
      { x: 720, y: 390, width: 1440 }
    ];
    expect(platformLabels(platforms, 1440)).toEqual(['A3', 'A2', 'B1', 'A1']);
  });
});
