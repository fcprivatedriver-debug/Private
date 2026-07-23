"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  askNina,
  confirmPendingExpense,
  getNinaGreeting,
  type PendingScopeAction,
} from "@/actions/nina";
import { NINA_SUGGESTIONS } from "@/lib/ai/nina-assistant";
import type { FinanceScope } from "@prisma/client";

type Msg = {
  id: string;
  role: "nina" | "user";
  text: string;
  suggestions?: string[];
  pendingScope?: PendingScopeAction;
};

export function NinaChat({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [pendingScope, setPendingScope] = useState<PendingScopeAction | null>(null);
  const [pending, start] = useTransition();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    start(async () => {
      const res = await getNinaGreeting();
      if (res.ok) {
        setMessages([
          {
            id: "greet",
            role: "nina",
            text: res.reply.text.replace(/\*\*/g, ""),
            suggestions: res.reply.suggestions,
          },
        ]);
      }
    });
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, pending]);

  function send(question: string) {
    const q = question.trim();
    if (!q || pending) return;

    // Atalhos de confirmação de espaço
    if (pendingScope && /^(pessoal|familiar)$/i.test(q)) {
      const scope: FinanceScope = /^familiar$/i.test(q) ? "FAMILY" : "PERSONAL";
      confirmScope(scope);
      return;
    }

    setInput("");
    setMessages((m) => [...m, { id: `u-${Date.now()}`, role: "user", text: q }]);
    start(async () => {
      const res = await askNina(q);
      if (res.ok) {
        const nextPending =
          "pendingScope" in res && res.pendingScope ? res.pendingScope : null;
        setPendingScope(nextPending);
        setMessages((m) => [
          ...m,
          {
            id: `n-${Date.now()}`,
            role: "nina",
            text: res.reply.text,
            suggestions: res.reply.suggestions,
            pendingScope: nextPending ?? undefined,
          },
        ]);
        if (res.mutated) router.refresh();
      }
    });
  }

  function confirmScope(scope: FinanceScope) {
    if (!pendingScope || pending) return;
    const label = scope === "FAMILY" ? "Conta Familiar" : "Finanças pessoais";
    setInput("");
    setMessages((m) => [...m, { id: `u-${Date.now()}`, role: "user", text: label }]);
    const snapshot = pendingScope;
    setPendingScope(null);
    start(async () => {
      const res = await confirmPendingExpense(snapshot, scope);
      if (res.ok) {
        setMessages((m) => [
          ...m,
          {
            id: `n-${Date.now()}`,
            role: "nina",
            text: res.reply.text,
            suggestions: res.reply.suggestions,
          },
        ]);
        if (res.mutated) router.refresh();
      }
    });
  }

  return (
    <div className={`nina-chat ${compact ? "is-compact" : ""}`}>
      <div className="nina-chat-messages" aria-live="polite">
        {messages.map((m) => (
          <div key={m.id} className={`nina-bubble ${m.role}`}>
            {m.role === "nina" ? (
              <span className="nina-avatar" aria-hidden>
                N
              </span>
            ) : null}
            <div className="nina-bubble-body">
              {m.role === "nina" ? <strong className="nina-name">Nina</strong> : null}
              <p>{m.text}</p>
              {m.pendingScope ? (
                <div className="nina-scope-actions">
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    disabled={pending}
                    onClick={() => confirmScope("PERSONAL")}
                  >
                    Pessoal
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    disabled={pending}
                    onClick={() => confirmScope("FAMILY")}
                  >
                    Conta Familiar
                  </button>
                </div>
              ) : m.suggestions?.length ? (
                <div className="nina-suggestions">
                  {m.suggestions.map((s) => (
                    <button key={s} type="button" className="nina-chip" onClick={() => send(s)}>
                      {s}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        ))}
        {pending ? (
          <div className="nina-bubble nina">
            <span className="nina-avatar" aria-hidden>
              N
            </span>
            <div className="nina-bubble-body">
              <strong className="nina-name">Nina</strong>
              <p className="nina-typing">A pensar…</p>
            </div>
          </div>
        ) : null}
        <div ref={bottomRef} />
      </div>

      <form
        className="nina-composer"
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder='Ex: "Gastei 35 € no Continente para casa"'
          aria-label="Mensagem para a Nina"
          disabled={pending}
        />
        <button className="btn btn-primary" type="submit" disabled={pending || !input.trim()}>
          Enviar
        </button>
      </form>

      {!compact ? (
        <div className="nina-quick">
          {NINA_SUGGESTIONS.slice(0, 4).map((s) => (
            <button key={s} type="button" className="nina-chip" onClick={() => send(s)}>
              {s}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
