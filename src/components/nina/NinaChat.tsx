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
  isError?: boolean;
};

export function NinaChat({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [pendingScope, setPendingScope] = useState<PendingScopeAction | null>(null);
  const [pending, start] = useTransition();
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const sendingRef = useRef(false);

  useEffect(() => {
    start(async () => {
      try {
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
      } catch {
        setMessages([
          {
            id: "greet-err",
            role: "nina",
            text: "Olá! Sou a MEL. Neste momento não consegui carregar o teu resumo — podes perguntar na mesma.",
            suggestions: NINA_SUGGESTIONS.slice(0, 3),
            isError: true,
          },
        ]);
      }
    });
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, pending]);

  function pushMelReply(text: string, suggestions?: string[], pendingNext?: PendingScopeAction | null) {
    setMessages((m) => [
      ...m,
      {
        id: `n-${Date.now()}`,
        role: "nina",
        text,
        suggestions,
        pendingScope: pendingNext ?? undefined,
      },
    ]);
  }

  function pushError() {
    setMessages((m) => [
      ...m,
      {
        id: `n-err-${Date.now()}`,
        role: "nina",
        text: "A MEL está temporariamente indisponível. Tenta novamente dentro de alguns instantes.",
        isError: true,
        suggestions: ["Quanto gastei este mês?", "Onde posso poupar?"],
      },
    ]);
  }

  function send(question: string) {
    const q = question.trim();
    if (!q || pending || sendingRef.current) return;

    if (pendingScope && /^(pessoal|familiar)$/i.test(q)) {
      const scope: FinanceScope = /^familiar$/i.test(q) ? "FAMILY" : "PERSONAL";
      confirmScope(scope);
      return;
    }

    setInput("");
    setMessages((m) => [...m, { id: `u-${Date.now()}`, role: "user", text: q }]);
    sendingRef.current = true;
    start(async () => {
      try {
        const res = await askNina(q);
        if (res.ok) {
          const nextPending =
            "pendingScope" in res && res.pendingScope ? res.pendingScope : null;
          setPendingScope(nextPending);
          pushMelReply(res.reply.text, res.reply.suggestions, nextPending);
          if ("deepLink" in res && res.deepLink && typeof window !== "undefined") {
            window.open(res.deepLink, "_blank", "noopener,noreferrer");
          }
          if (res.mutated) router.refresh();
        } else {
          pushError();
        }
      } catch {
        pushError();
      } finally {
        sendingRef.current = false;
        inputRef.current?.focus();
      }
    });
  }

  function confirmScope(scope: FinanceScope) {
    if (!pendingScope || pending || sendingRef.current) return;
    const label = scope === "FAMILY" ? "Conta Familiar" : "Finanças pessoais";
    setInput("");
    setMessages((m) => [...m, { id: `u-${Date.now()}`, role: "user", text: label }]);
    const snapshot = pendingScope;
    setPendingScope(null);
    sendingRef.current = true;
    start(async () => {
      try {
        const res = await confirmPendingExpense(snapshot, scope);
        if (res.ok) {
          pushMelReply(res.reply.text, res.reply.suggestions);
          if (res.mutated) router.refresh();
        } else {
          pushError();
        }
      } catch {
        pushError();
      } finally {
        sendingRef.current = false;
        inputRef.current?.focus();
      }
    });
  }

  return (
    <div className={`nina-chat ${compact ? "is-compact" : ""}`} aria-busy={pending}>
      <div className="nina-chat-messages" aria-live="polite" role="log" aria-label="Conversa com a MEL">
        {messages.map((m) => (
          <div key={m.id} className={`nina-bubble ${m.role}${m.isError ? " is-error" : ""}`}>
            {m.role === "nina" ? (
              <span className="nina-avatar" aria-hidden>
                M
              </span>
            ) : null}
            <div className="nina-bubble-body">
              {m.role === "nina" ? <strong className="nina-name">MEL</strong> : null}
              <p>{m.text}</p>
              {m.pendingScope ? (
                <div className="nina-scope-actions" role="group" aria-label="Escolher espaço financeiro">
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
                    <button
                      key={s}
                      type="button"
                      className="nina-chip"
                      disabled={pending}
                      onClick={() => send(s)}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        ))}
        {pending ? (
          <div className="nina-bubble nina" aria-live="polite">
            <span className="nina-avatar" aria-hidden>
              M
            </span>
            <div className="nina-bubble-body">
              <strong className="nina-name">MEL</strong>
              <p className="nina-typing">A MEL está a responder…</p>
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
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send(input);
            }
          }}
          placeholder='Ex: "Quanto gastei este mês?"'
          aria-label="Mensagem para a MEL"
          autoComplete="off"
          enterKeyHint="send"
          disabled={pending}
          maxLength={1200}
        />
        <button
          className="btn btn-primary"
          type="submit"
          disabled={pending || !input.trim()}
          aria-label="Enviar mensagem para a MEL"
        >
          {pending ? "…" : "Enviar"}
        </button>
      </form>

      {!compact ? (
        <div className="nina-quick" aria-label="Sugestões rápidas">
          {NINA_SUGGESTIONS.slice(0, 4).map((s) => (
            <button
              key={s}
              type="button"
              className="nina-chip"
              disabled={pending}
              onClick={() => send(s)}
            >
              {s}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
