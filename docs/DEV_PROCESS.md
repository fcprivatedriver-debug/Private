# Nina — processo seguro de desenvolvimento

**Regra de ouro:** não há novas funcionalidades enquanto a checklist de estabilidade falhar.

Conta de testes exclusiva: `familia@nina.app` / `nina123`.

## Antes de qualquer alteração importante

1. Confirma que estás na branch de estabilização: `cursor/nina-stable-c6cd`.
2. Garante working tree limpa ou commit explícito do estado atual.
3. Cria um **checkpoint** Git (tag apontando para o commit estável):

```bash
git tag checkpoint/nina-stable-$(date +%Y%m%d-%H%M%S)
git push origin --tags
```

4. Se a alteração for arriscada, cria um commit de salvaguarda *antes* de editar:

```bash
git add -A && git commit -m "checkpoint: estado estável antes de <motivo>"
git push -u origin HEAD
```

5. Só depois escreve código.

## Depois de cada alteração

1. Commit + push.
2. Corre a checklist na conta `familia@nina.app` (localmente ou no URL público estável):
   - inicia sessão
   - não aparece "Offline"
   - Dashboard funciona
   - adicionar receita / despesa
   - editar receita / despesa
   - gráficos atualizam
   - saldos atualizam
3. Se algum passo falhar: **não** avançar; reverter para o último checkpoint:

```bash
git checkout checkpoint/<nome>
# ou
git reset --hard checkpoint/<nome>
```

4. Relatório da tarefa (apenas isto):
   - ficheiros alterados
   - porque foram alterados
   - testes realizados
   - se todos passaram

## URL público estável

Preferir Vercel (não túneis Cloudflare/Serveo).  
Enquanto o SSO da Vercel estiver ativo, o URL público não é utilizável — ver `docs/STABLE.md`.
