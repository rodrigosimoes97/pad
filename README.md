# Church Pad Player

Aplicativo web musical para tocar **pads contínuos e suaves** no navegador, ideal para acompanhar músicas ao vivo em igreja.

## Funcionalidades

- Pad contínuo com **Tone.js** (frontend puro).
- Seleção de tônica: `C, C#, D, D#, E, F, F#, G, G#, A, A#, B`.
- Exibição enarmônica amigável (sustenidos ou bemóis).
- Seleção de oitava base (2, 3, 4 e 5).
- Estruturas de pad:
  - Root only
  - 1 + 5
  - 1 + 5 + 8
- Presets de timbre:
  - Soft Pad
  - Warm Pad
  - Bright Pad
- Controle de volume.
- Botões **Start**, **Stop** e **Panic / Reset Audio**.
- Fade in/out suave e atualização sem clique agressivo.
- Indicador visual de estado tocando/parado e pad atual.
- Persistência de preferências no `localStorage`.
- Interface dark mode, responsiva e otimizada para uso ao vivo.

## Stack

- Vite
- React
- TypeScript
- Tailwind CSS
- Tone.js

## Desenvolvimento local

### 1) Instalar dependências

```bash
npm install
```

### 2) Rodar em modo desenvolvimento

```bash
npm run dev
```

### 3) Build de produção

```bash
npm run build
```

### 4) Visualizar build local

```bash
npm run preview
```

## Deploy no GitHub Pages

### 1) Ajustar `base` no Vite

Edite `vite.config.ts` e altere a constante `repoName` para o nome real do seu repositório:

```ts
const repoName = 'church-pad-player';
```

Exemplo:
- Repositório: `https://github.com/seu-usuario/minha-pad-app`
- URL final no Pages: `https://seu-usuario.github.io/minha-pad-app/`
- Valor esperado: `repoName = 'minha-pad-app'`

### 2) Habilitar GitHub Pages

No GitHub:
- Settings → Pages
- Source: **GitHub Actions**

### 3) Fazer push para `main`

O workflow `.github/workflows/deploy.yml` irá:
- instalar dependências
- gerar build
- criar fallback `404.html` para SPA
- publicar automaticamente no GitHub Pages

## Observação importante sobre áudio

Browsers modernos exigem interação do usuário para iniciar o áudio. Portanto, use o botão **Start Pad** para liberar o contexto de áudio (`Tone.start()`).

## Estrutura do projeto

```text
src/
  audio/
    padEngine.ts
    presets.ts
  components/
    PadControls.tsx
    Slider.tsx
    StatusDisplay.tsx
    TransportButtons.tsx
  utils/
    notes.ts
    storage.ts
  App.tsx
  main.tsx
  styles.css
.github/workflows/deploy.yml
vite.config.ts
```
