import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Ajuste este valor para o nome do seu repositório no GitHub Pages.
// Ex.: https://usuario.github.io/church-pad-player/ => base: '/church-pad-player/'
const repoName = 'pad';

export default defineConfig({
  plugins: [react()],
  base: `/${repoName}/`,
});
