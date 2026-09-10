import { defineConfig } from 'vitest/config';
import path from 'node:path';

/**
 * Live integration tests — they talk to the local Supabase stack
 * (`supabase start`) rather than mocks.
 *
 * Separate from vitest.config.ts on purpose: these need a real database, so
 * they must never run in the default `test:unit` sweep or in CI without a
 * stack. Node environment, not jsdom — these are server-side paths.
 */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/integration/**/*.test.{ts,tsx}'],
    testTimeout: 30000,
    hookTimeout: 30000,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      // Same stubs as vitest.config.ts: Next's marker packages have no
      // resolvable entry under vitest, and server-only libs are exactly what
      // these tests exercise.
      'server-only': path.resolve(__dirname, './tests/stubs/empty-module.ts'),
      'client-only': path.resolve(__dirname, './tests/stubs/empty-module.ts'),
    },
  },
});
