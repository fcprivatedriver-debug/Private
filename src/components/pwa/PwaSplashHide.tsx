"use client";

import { useEffect, useState } from "react";

/** Hide CSS splash once the app has hydrated / painted. */
export function PwaSplashHide() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const t = window.setTimeout(() => {
      document.documentElement.classList.add("nina-app-ready");
      setReady(true);
    }, 180);
    return () => window.clearTimeout(t);
  }, []);
  return ready ? null : null;
}
