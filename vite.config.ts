import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const repoName = 'pad';

export default defineConfig({
  plugins: [react()],
  base: `/${repoName}/`,
});
