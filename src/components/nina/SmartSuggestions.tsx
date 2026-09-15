"use client";

import { useEffect, useState } from "react";
import { getSmartSuggestions } from "@/actions/nina";

export function SmartSuggestions() {
  const [items, setItems] = useState<{ title: string; body: string; tone: string }[]>([]);

  useEffect(() => {
    void getSmartSuggestions().then((res) => {
      if (res.ok) setItems(res.suggestions);
    });
  }, []);

  if (!items.length) return null;

  return (
    <div className="smart-suggestions">
      {items.map((s) => (
        <article key={s.title} className={`smart-card tone-${s.tone}`}>
          <strong>{s.title}</strong>
          <p>{s.body}</p>
        </article>
      ))}
    </div>
  );
}
