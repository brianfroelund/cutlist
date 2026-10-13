import { defineConfig } from 'vitest/config';

export default defineConfig({
  // GitHub Pages serves the site from /<repo>/
  base: '/cutlist/',
  build: { target: 'es2022' },
  worker: { format: 'es' },
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
});
