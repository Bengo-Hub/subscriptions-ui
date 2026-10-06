import { defineConfig } from 'vitest/config';
import path from 'node:path';

// Unit tests for pure logic (src/**/*.test.ts). Browser flows stay in Playwright (e2e/).
export default defineConfig({
  resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
});
