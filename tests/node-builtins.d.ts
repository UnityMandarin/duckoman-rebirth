declare module 'node:fs' { export function existsSync(path: string): boolean; }
declare module 'node:path' { export function join(...parts: string[]): string; }
declare module 'node:module' { export function createRequire(filename: string | URL): (id: string) => any; }
declare const process: { cwd(): string };
