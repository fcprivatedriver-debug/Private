# Causa real: Entrar pisca e o login não abre

## Sintoma (reproduzido em Production)

1. Abrir `https://www.addandknow.pt/pt`
2. Clicar **Entrar**
3. A URL passa a `/pt/login`
4. O conteúdo continua a ser a **landing** (`Sabe onde vai…`)
5. **Não há** campos email/password (`auth-page` ausente)

Confirmado também com hard navigation directa a `/pt/login` — mesmo resultado.

## Causa raiz (código)

O commit `0079b05` substituiu `src/app/[locale]/layout.tsx` pelo markup da landing e **deixou de renderizar `{children}`**.

No App Router, o layout é partilhado por `/pt`, `/pt/login`, `/pt/registo`, etc. Sem `{children}`:

- `/pt/login` é matched (`x-matched-path: /[locale]/login`)
- o chunk `login/page` / `LoginForm` entra no RSC flight
- mas **nunca é montado no DOM**
- o HTML visível é só a landing do layout

Assinatura no HTML de Production (ainda presente em addandknow.pt):

- body contém `landing landing-v2`
- **não** contém `auth-page` nem `name="email"`
- flight data ainda referencia `LoginForm` (órfão)

Isto **não** é middleware, `LoginForm`, `safePostLoginPath`, SessionProvider nem `router.push`.  
Esses só correm *depois* do layout montar o filho — e o filho nunca monta.

## Estado dos deploys (2026-09-18)

| Superfície | SHA / build | `/pt/login` |
|---|---|---|
| **www.addandknow.pt (live)** | build antigo `flmXjbUcuQT6cjOmkXA7k` (layout partido) | LANDING — FAIL |
| `origin/main` | `88d8788` (merge #51, layout restaurado) | código OK |
| Deploy URL Production addynow `addynow-kkiyepbzc-…` | `88d8788` | formulário OK |
| Preview #53 | `fef381a` | formulário OK |
| Production private-duur @ `88d8788` | **FAILED** | — |

Conclusão operacional: o fix de código está em `main` e num deploy Production addynow, mas o **domínio live ainda serve o build antigo com o layout partido**. O deploy Production de `private-duur` falhou.

## Correção de código (já em main / Preview)

`src/app/[locale]/layout.tsx` deve ser apenas providers + `{children}`:

```tsx
<NextIntlClientProvider messages={messages}>
  <AuthProvider>
    <ThemeProvider>{children}</ThemeProvider>
  </AuthProvider>
</NextIntlClientProvider>
```

A landing fica **só** em `src/app/[locale]/page.tsx`.

## Teste de aceitação

PASS só se, após Entrar:

- URL permanece `/pt/login`
- `Olá outra vez` + `input[name=email]` + password visíveis
- **não** existe `#landing-hero-title` no DOM
