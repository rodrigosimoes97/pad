# Church Pad Player — Stage Edition

Ferramenta de pad contínuo para worship, **100% front-end**, otimizada para uso ao vivo, mobile-first e deploy estático (GitHub Pages).

## Novidades principais

- Nova engine em **múltiplas camadas**: Warm, Shimmer, Choir/Air e Low/Sub.
- Nova cadeia de áudio: camadas → filtro/EQ → chorus/stereo widener → reverb send/dry mix → saturação leve → limiter.
- **Motion orgânico** (Off/Slow/Medium/Deep) com modulação lenta de filtro, amplitude e estéreo.
- Sistema harmônico expandido com **Key + Mode (Major/Minor)** e estruturas:
  - Root
  - Root + 5
  - Root + 5 + 8
  - Add2
  - Sus2
  - Sus4
  - Open Worship
- Presets worship prontos (incluindo compatibilidade com presets legados).
- Fade In/Fade Out configuráveis e **Smooth Stop**.
- Atalhos de teclado para palco.
- Persistência robusta no `localStorage` com validação.
- PWA básico: `manifest.webmanifest`, service worker e cache offline essencial.

## Arquitetura atual

```text
src/
  audio/
    engine/
      PadEngine.ts
      harmony.ts
    presets/
      worshipPresets.ts
  types/
    pad.ts
  utils/
    settingsStorage.ts
  App.tsx
  main.tsx
  styles.css
public/
  icons/
    icon-192.svg
    icon-512.svg
  manifest.webmanifest
  sw.js
  irs/
```

## Reverb e IR (convolution)

- A engine tenta carregar IR em `public/irs/church-impulse.wav`.
- Se o arquivo não existir (ou não carregar), usa fallback automático para `Tone.Reverb`.
- Essa estratégia evita quebrar mobile/navegadores com suporte limitado.

## Atalhos de teclado

- `Space`: Start / Smooth Stop (toggle principal)
- `Esc`: Panic
- `←` / `→`: navega entre tons
- `1..8`: seleciona presets principais

## Rodando localmente

```bash
npm install
npm run dev
```

Build:

```bash
npm run build
npm run preview
```

## GitHub Pages

- O projeto usa `base` em `vite.config.ts` (`/pad/`).
- Mantenha os assets públicos compatíveis com esse base path.
- Manifest/service worker já estão preparados para o path `/pad/`.

## Limitações conhecidas

- Convolution IR depende da presença de `public/irs/church-impulse.wav`.
- Em dispositivos muito limitados, o fallback algorítmico ainda é preferível para estabilidade.
