import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['src/**/*.bench.ts'],
    testTimeout: 180_000,
    hookTimeout: 180_000,
  },
});
