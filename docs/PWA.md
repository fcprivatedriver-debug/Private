# Nina PWA

Nome oficial: **Nina**

## Ficheiros

| Ficheiro | Função |
|----------|--------|
| `src/app/manifest.ts` | Web App Manifest + atalhos |
| `public/sw.js` | Service Worker (cache + update) |
| `public/offline.html` | Fallback offline |
| `public/icons/*` | Ícones e maskable |
| `public/splash/*` | Splash Apple |
| `src/components/pwa/*` | Registo SW, install prompt, guia |

## Atalhos

| Atalho | URL |
|--------|-----|
| Dashboard | `/pt/dashboard` |
| Falar com a Nina | `/pt/captura?mode=voice&auto=1` |
| Fotografar Fatura | `/pt/captura?mode=photo&auto=1` |
| Lista de Compras | `/pt/lista` |
| Objetivos | `/pt/objetivos` |

## Requisitos de produção

- HTTPS
- `AUTH_URL` apontar para o domínio público
- Testar instalação em dispositivo real (Android + iPhone)

Ver também `docs/V1_CHECKLIST.md`.
