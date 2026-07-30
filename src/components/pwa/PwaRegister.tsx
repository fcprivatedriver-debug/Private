"use client";

import { useEffect } from "react";

export function PwaRegister() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
    const host = window.location.hostname;
    const ephemeral =
      host === "localhost" ||
      host === "127.0.0.1" ||
      host.endsWith(".trycloudflare.com");
    if (ephemeral) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);
  return null;
}
