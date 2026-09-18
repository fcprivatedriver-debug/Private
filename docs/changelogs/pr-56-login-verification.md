# PR #56 — Login “Já tenho conta” vs verificação de email

## Causa do problema

O `LoginForm` chamava `checkEmailVerified(email)` **antes** de validar a palavra-passe:

1. Conta não verificada + password errada → mensagem “Enviámos-te um link” (falso: nenhum email era enviado).
2. Conta não verificada + password correcta → mesmo ecrã/link para `/verificar-email`, sem distinguir do caso anterior.
3. `authorize` do NextAuth devolvia `null` tanto para password errada como para email não verificado, colapsando os dois estados no cliente.
4. O botão “Já tenho conta” já só navegava para `/pt/login` (correcto); o bug estava no submit do login, não no CTA da landing.

## Ficheiros alterados

- `src/lib/auth/login-credentials.ts` — decisão pura: `INVALID_CREDENTIALS` vs `EMAIL_NOT_VERIFIED`
- `src/actions/auth-account.ts` — `authenticateCredentials` (sem email); `EMAIL_EXISTS` no registo; removido `checkEmailVerified`
- `src/components/auth/LoginForm.tsx` — credenciais primeiro; “Reenviar email” na mesma página; sem auto-send
- `src/components/auth/RegisterForm.tsx` — comentário / fluxo email existente
- `src/lib/auth/login-credentials.test.ts` — unit tests
- `src/lib/auth/login-verification.regression.test.ts` — regressões de fluxo
- `package.json` — inclui os novos testes no `npm test`

## Novo comportamento

| Cenário | Comportamento |
|--------|----------------|
| A. Conta verificada | Login → dashboard; **zero** email |
| B. Conta não verificada | Login com password correcta → aviso + botão “Reenviar email” **na página**; email **só** no clique; sem redirect para localhost |
| C. Sem conta | Registo inalterado → fluxo de verificação após criar conta |
| D. Password errada | Erro claro; sem resend; sem criar conta; sem estado de verificação falso |
| E. Produção/preview | Links via `appBaseUrl()` (sem 127.0.0.1); `RESEND_API_KEY` ausente → erro controlado no resend |

“Já tenho conta” continua a ser apenas navegação para o formulário de login.

## Testes executados

```bash
npm run typecheck   # PASS
npm run lint        # PASS (0 errors)
DATABASE_URL=… npm test  # 48 pass (incl. login-credentials + login-verification)
```

### Proof Preview (deploy `bb51332`, private-duur)

Base: `https://private-duur-git-cursor-canonical-stable-ec69-fc-private-driver.vercel.app`

| Cenário | Resultado |
|--------|-----------|
| A. Já tenho conta → login → `familia@nina.app` | → `/pt/dashboard` |
| B. Conta nova não verificada + password correcta | Aviso + botão Reenviar na página; resend fica em `/pt/login`; mensagem controlada sem `RESEND_API_KEY` |
| B. Password errada em não verificada | Erro claro; **sem** botão Reenviar |
| C. Registo | → `/pt/verificar-email?email=…` |
| D. Credenciais inválidas | Erro; sem resend |
| E. URLs | Sem `127.0.0.1` / `localhost` no fluxo |

Artefactos: `/opt/cursor/artifacts/screenshots/pr-56-auth/`, `/opt/cursor/artifacts/pr-56-auth-flow.webm`, `docs/pr-proof/pr-56-auth/`.

## Não feito (por pedido)

- Sem merge / promote para Production
- Sem alterações a MEL, permissões, fatura, geolocalização fora do necessário
