# addYknow PWA

Nome oficial: **addYknow**  
Assistente: **MEL**  
Domínio: **https://www.addandknow.pt**

## Identidade estável (não alterar sem necessidade)

| Campo | Valor | Notas |
|-------|-------|--------|
| `id` | `/pt/dashboard` | Identidade WebAPK. **Manter.** |
| `start_url` | `/pt/dashboard` | Abertura pelo ícone |
| `scope` | `/` | Toda a origem |
| `name` / `short_name` | `addYknow` | Nome visível no telemóvel |

### Porque aparece «substituir / instalar aplicação nova»?

Chrome/Android usa `manifest.id` (+ origem) para saber se é a mesma app.

1. **Mel (legado)** tinha `id: "/pt/hoje"` → é uma app **diferente** da addYknow.
2. **Nina → AddYnow → add&know → addYknow** partilham `id: "/pt/dashboard"` → update **in-place** (nome/ícones/cores mudam sem reinstalar).

Quem ainda tem o ícone «Mel» precisa de o remover **uma vez** e instalar a addYknow.  
Quem já tem Nina/AddYnow/addYknow com este `id` **não** precisa de reinstalar.

## Ficheiros

| Ficheiro | Função |
|----------|--------|
| `src/app/manifest.ts` | Web App Manifest + atalhos |
| `public/sw.js` | Service Worker (`addyknow-v1`, limpa `nina-*` / `mel-*`) |
| `public/offline.html` | Fallback offline |
| `public/icons/*` | Ícones e maskable |
| `public/splash/*` | Splash Apple |
| `src/components/pwa/*` | Registo SW, install prompt, guia |
| `src/app/layout.tsx` | `applicationName`, `apple-mobile-web-app-title` |

## Atalhos

| Atalho | URL |
|--------|-----|
| Dashboard | `/pt/dashboard` |
| Falar com a MEL | `/pt/captura?mode=voice&auto=1` |
| Fotografar Fatura | `/pt/captura?mode=photo` (opções; câmara só após toque) |
| Lista de Compras | `/pt/lista` |
| Objetivos | `/pt/objetivos` |

## Requisitos de produção

- HTTPS em `https://www.addandknow.pt`
- `AUTH_URL` apontar para o domínio público
- Testar instalação nova + update de instalação antiga (mesmo `id`)

Ver também `docs/V1_CHECKLIST.md`.
