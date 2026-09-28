import { SECTION_WIDTH } from '../../data/chapters';

interface Platform { x: number; y: number; width: number; }

/** Spreadsheet-style column letters: 0 → A, 25 → Z, 26 → AA. */
export function sectionLetter(index: number): string {
  let letters = '';
  for (let n = index + 1; n > 0; n = Math.floor((n - 1) / 26)) letters = String.fromCharCode(65 + (n - 1) % 26) + letters;
  return letters;
}

/**
 * Labels centered platforms as section letter + number, e.g. A1, A2, B1.
 * The section comes from the platform's center; numbers run left to right within it.
 */
export function platformLabels(platforms: readonly Platform[], sectionWidth: number = SECTION_WIDTH): string[] {
  const labels: string[] = new Array(platforms.length);
  const sections = new Map<number, number[]>();
  platforms.forEach((p, i) => {
    const section = Math.max(0, Math.floor(p.x / sectionWidth));
    sections.set(section, [...(sections.get(section) ?? []), i]);
  });
  for (const [section, indices] of sections) {
    const left = (i: number): number => platforms[i].x - platforms[i].width / 2;
    indices.sort((a, b) => left(a) - left(b) || platforms[a].y - platforms[b].y);
    indices.forEach((platform, n) => { labels[platform] = `${sectionLetter(section)}${n + 1}`; });
  }
  return labels;
}
