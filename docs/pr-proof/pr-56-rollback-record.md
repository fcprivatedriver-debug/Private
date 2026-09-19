# Rollback record — before PR #56 Production promote (2026-09-19)

Recorded before merge/publish of option B.

## Live Production fingerprint (pre-publish)

| URL | sha256 (HTML `/pt/login`) | form_ok | landing |
|---|---|---|---|
| https://www.addandknow.pt/pt/login | `0ebf731cb9421c4e84c84d701a6dfdb7af651622380b723bc2acc930214ddaf3` | false | true |
| https://addynow.vercel.app/pt/login | same | false | true |

Recorded at: `2026-09-19T12:23:02Z`

## Known Production – addynow deployments (rollback candidates)

| SHA | environment_url | notes |
|---|---|---|
| `0079b05` | https://addynow-a6rlczf6y-fc-private-driver.vercel.app | **layout partido** (estado live actual do domínio) |
| `8af2d71` | https://addynow-h07r6g0bp-fc-private-driver.vercel.app | layout OK em código; deployment individual pode exigir SSO |

## PR tip a publicar

- Branch: `cursor/canonical-stable-ec69`
- Tip pré-merge: `f450a9b`
- Base: `main` @ `8af2d71`
- Sem ficheiros Tripvo

## Como reverter no Vercel

1. Abrir [addynow → Deployments](https://vercel.com/fc-private-driver/addynow)
2. Localizar o deployment Production **anterior** ao promote (ou Instant Rollback)
3. **Promote to Production** / Instant Rollback para esse deployment
4. Confirmar `https://www.addandknow.pt/pt/login` (fingerprint / formulário)

Se o novo deploy quebrar o site: Instant Rollback para o deployment que estava activo antes do promote (o que produzia o fingerprint acima — tipicamente o build `0079b05` / alias actual).
