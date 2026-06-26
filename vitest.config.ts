import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: false,
    include: ['tests/unit/**/*.test.{ts,tsx}'],
    css: false,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      // Next.js marker packages have no resolvable entry under vitest; stub them
      // so server-only modules (e.g. the Stripe checkout-session lib) can be
      // unit-tested directly instead of only through a mocked boundary.
      'server-only': path.resolve(__dirname, './tests/stubs/empty-module.ts'),
      'client-only': path.resolve(__dirname, './tests/stubs/empty-module.ts'),
    },
  },
});
