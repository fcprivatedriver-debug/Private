# Nina — Versão 1 (preparação para utilização diária)

Checklist de estado da PWA e do produto. Atualizado com a preparação PWA.

---

## ✔ Funcionalidades concluídas

### Produto (núcleo)
- Conta Pessoal / Conta Familiar, convites, memória e hábitos
- Captura Instantânea (voz, texto, foto/OCR)
- Receitas, despesas, orçamentos, recorrentes, alertas
- Lista de compras
- Poupanças, investimentos, objetivos com itens, simulador
- Ligações (catálogo + níveis de automatização)
- Dashboard com resumo e chat Nina
- Dados demo (`familia@nina.app` / `nina@nina.app` · `nina123`)

### PWA (esta entrega)
- Manifest oficial **Nina** (`display: standalone`, tema `#1e3a5f`)
- Ícones 192/512 + maskable + Apple Touch
- Splash screen (CSS + imagem de arranque iOS)
- Service Worker com cache inteligente (estáticos + páginas visitadas)
- Página offline (`/offline.html`)
- Atualização automática quando há nova versão do SW
- Prompt «Instalar Nina» (Android/Chrome) + guia iOS (Safari → Partilhar)
- Atalhos do ícone:
  - Dashboard
  - Falar com a Nina (`/pt/captura?mode=voice&auto=1`)
  - Fotografar Fatura (`/pt/captura?mode=photo&auto=1`)
  - Lista de Compras
  - Objetivos
- Captura rápida por voz (abre a ouvir / pede 1 toque se o browser bloquear)
- Navegação mobile alinhada (Nina · Compras · Falar · Objetivos · Mais)
- Safe areas, touch targets ≥44px, inputs 16px (sem zoom iOS)

---

## ✔ Funcionalidades preparadas (técnicas / quase prontas)

- Instalar a partir do browser (HTTPS obrigatório em produção)
- Revalidação de dados após captura (`router.refresh`) — saldos/gráficos/orçamentos no próximo paint
- Headers `Service-Worker-Allowed` e cache curto para `sw.js` / manifest
- Guia de instalação em **Mais → Instalar a Nina**

---

## ○ Funcionalidades futuras (fora da V1 diária mínima)

- Notificações push (iOS exige requisitos adicionais; Android mais maduro)
- Background Sync / fila offline de capturas por voz (registar sem rede e enviar depois)
- Widget nativo iOS/Android (não disponível em PWA pura)
- Biometria nativa do SO (hoje: flags de preferência; WebAuthn opcional)
- Open Banking real (hoje: stubs / importações)
- App Store / Play Store via wrapper (Capacitor/TWA) se a PWA não bastar
- Multi-idioma além de PT
- Testes E2E automatizados estáveis em CI

---

## Lista do que ainda falta para a V1 «utilização diária»

| Prioridade | Item | Notas |
|------------|------|--------|
| Alta | Hospedar em **HTTPS** com domínio estável | PWA só instala em origem segura (exceto localhost) |
| Alta | Definir `AUTH_URL` / cookies para o domínio real | Sessão Auth.js em produção |
| Alta | Backup / base de dados gerida (ex. Neon) | Demo local não é produção |
| Média | Testar instalação real em Android + iPhone | Ver limitações abaixo |
| Média | Filas offline para capturas | Hoje captura exige rede |
| Média | Política de privacidade / termos alinhados à produção | Já existem páginas |
| Baixa | Ícones de atalho diferenciados (não só o mark) | Funcionais, podem ser mais claros |
| Baixa | Mais splash sizes Apple | Um splash cobre a maioria; iOS antigo pode mostrar ecrã sólido |

---

## Limitações técnicas das PWA (e alternativas)

### iPhone (Safari)
1. **Instalação** — não há botão «Instalar» nativo como no Chrome.  
   **Alternativa:** Partilhar → «Adicionar ao Ecrã Principal» (guia na app).
2. **Atalhos do ícone** — suporte limitado / inconsistente vs Android.  
   **Alternativa:** barra inferior da Nina (Falar, Compras, Objetivos) + ecrã Mais.
3. **Reconhecimento de voz** — Web Speech API irregular; pode exigir toque e ligação à Internet.  
   **Alternativa:** modo Escrever + chips de exemplo; foto da fatura.
4. **Storage / SW** — Safari pode limpar cache com pouca utilização.  
   **Alternativa:** reabrir online periodicamente; não depender de offline total.
5. **Câmara em auto-open** — `input.capture` muitas vezes exige gesto do utilizador.  
   **Alternativa:** atalho abre o ecrã foto; um toque em «Abrir câmara».

### Android (Chrome)
1. **Instalação** — disponível via `beforeinstallprompt` ou menu do browser (já implementado).
2. **Atalhos** — bem suportados no long-press do ícone.
3. **Voz** — geralmente melhor; ainda assim o auto-start pode ser bloqueado sem gesto.  
   **Alternativa:** UI «Toca para falar» imediata.

### Offline
- Páginas já visitadas + estáticos: sim (SW).  
- **Novas capturas / login / APIs:** precisam de rede.  
  **Alternativa futura:** Background Sync / IndexedDB queue.

### Atualizações
- Nova versão do `sw.js` → deteção periódica + toast «Atualizar» + auto após ~2,5s.  
- Se o utilizador tiver muitos tabs, o reload acontece no `controllerchange`.

### Push / background
- Push fiável em iOS PWA é limitado.  
  **Alternativa:** alertas in-app; ou app nativa / TWA mais tarde.

---

## Como instalar (utilizador)

1. Abrir a Nina no telemóvel (Chrome Android ou Safari iOS).
2. **Android:** aceitar «Instalar Nina» ou menu → Instalar aplicação.  
   **iPhone:** Partilhar → Adicionar ao Ecrã Principal.
3. Abrir o ícone **Nina** (ecrã inteiro).
4. Long-press (Android) para atalhos: Falar, Fatura, Compras, Objetivos, Dashboard.
