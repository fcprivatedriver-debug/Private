"use client";

import { FormEvent, useState, useTransition } from "react";
import { chatAction } from "@/actions/mel";

type Msg = { role: "USER" | "ASSISTANT"; content: string };

export function MelChat({ initial }: { initial: Msg[] }) {
  const [messages, setMessages] = useState(initial);
  const [text, setText] = useState("");
  const [pending, startTransition] = useTransition();

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const value = text.trim();
    if (!value) return;
    setMessages((prev) => [...prev, { role: "USER", content: value }]);
    setText("");
    startTransition(async () => {
      const res = await chatAction(value);
      if (res.ok) {
        setMessages((prev) => [...prev, { role: "ASSISTANT", content: res.reply }]);
      }
    });
  }

  return (
    <div className="stack">
      <div className="panel">
        <h2>Conversar com a Mel</h2>
        <div className="chat-log" aria-live="polite">
          {messages.map((m, i) => (
            <div
              key={`${m.role}-${i}`}
              className={`bubble ${m.role === "USER" ? "user" : "assistant"}`}
            >
              {m.content}
            </div>
          ))}
        </div>
      </div>
      <form className="form-stack" onSubmit={onSubmit}>
        <div className="field">
          <label htmlFor="chat">Mensagem</label>
          <input
            id="chat"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Olá Mel, o que tenho para fazer?"
          />
        </div>
        <button className="btn btn-secondary" type="submit" disabled={pending || !text.trim()}>
          {pending ? "A pensar…" : "Enviar"}
        </button>
      </form>
    </div>
  );
}
