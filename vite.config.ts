import { defineConfig } from 'vitest/config';

export default defineConfig({
  base: '/duckoman-rebirth/',
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts']
  }
});
