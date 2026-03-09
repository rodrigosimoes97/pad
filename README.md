# Church Pad Player

App web musical (100% front-end) para tocar pads contínuos em contexto ao vivo, com foco em **uso no celular**, **troca rápida de tom** e **som ambiente suave para igreja**.

## Destaques da versão atual

- **Performance Mode (mobile-first)** com grade de 12 pads grandes para troca instantânea de tom.
- **Troca de tom sem parar o pad** com crossfade curto entre camadas (sem corte seco).
- **Studio Mode** opcional para ajustes mais detalhados.
- Engine de áudio com Tone.js e cadeia musical: synth + filter + chorus + reverb + limiter.
- Presets: **Soft, Warm, Bright, Shimmer, Deep**.
- Controles ao vivo em tempo real:
  - Volume
  - Reverb
  - Brightness (Tone)
- Recursos de palco:
  - Start / Stop / Panic
  - Hold
  - Fade Out
- Persistência de preferências no `localStorage`:
  - tom, oitava, estrutura, preset
  - volume, reverb, brightness, hold
  - modo da interface e painel avançado

## Stack

- Vite
- React
- TypeScript
- Tailwind CSS
- Tone.js

## Como rodar localmente

```bash
npm install
npm run dev
```

Build de produção:

```bash
npm run build
npm run preview
```

## Observação importante sobre áudio

Browsers exigem gesto do usuário para liberar áudio. Use **Start** (ou toque em um pad) para inicializar o contexto (`Tone.start()`).

## Deploy no GitHub Pages

### 1) Ajustar o `base` no Vite

Edite `vite.config.ts` e ajuste `repoName` para o nome do seu repositório:

```ts
const repoName = 'church-pad-player';
```

Exemplo: `https://seu-usuario.github.io/meu-repo/` → `repoName = 'meu-repo'`.

### 2) Habilitar Pages por GitHub Actions

No GitHub: **Settings → Pages → Source: GitHub Actions**.

### 3) Push para `main`

O workflow `.github/workflows/deploy.yml` já:
- instala dependências
- gera build
- cria `404.html` para fallback SPA
- publica no GitHub Pages

## Estrutura principal

```text
src/
  audio/
    audioTypes.ts
    padEngine.ts
    presets.ts
  components/
    ControlPanel.tsx
    PadButton.tsx
    PerformancePadGrid.tsx
    SliderControl.tsx
    StatusBar.tsx
    StudioPanel.tsx
  hooks/
    useLocalStorageState.ts
    usePadSettings.ts
  utils/
    cn.ts
    notes.ts
  App.tsx
  main.tsx
  styles.css
```
