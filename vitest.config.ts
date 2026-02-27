import { defineConfig, configDefaults } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths'; // Import this

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './vitest.setup.ts', // Add this line
    // EXCLUDE the Playwright folder
    exclude: [
      ...configDefaults.exclude,
      '**/tests/**', // This ignores your Playwright folder
    ],
    // OPTIONAL: Explicitly INCLUDE your unit tests
    include: ['**/__tests__/**/*.{test,spec}.{ts,tsx}'],
  },
});
