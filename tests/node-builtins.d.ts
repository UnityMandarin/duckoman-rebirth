declare module 'node:fs' { export interface Buffer extends Uint8Array { toString(encoding?: string, start?: number, end?: number): string; readUInt32BE(offset: number): number; } export function readFileSync(path: string, encoding: 'utf8'): string; export function readFileSync(path: string): Buffer; export function statSync(path: string): { size: number }; export function existsSync(path: string): boolean; }
declare module 'node:path' { export function join(...parts: string[]): string; }
declare module 'node:module' { export function createRequire(filename: string | URL): (id: string) => any; }
declare const process: { cwd(): string };
