"use client";

import { SessionProvider } from "next-auth/react";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider
      refetchOnWindowFocus={false}
      refetchWhenOffline={false}
      // Avoid a long blank “Entrar / A entrar…” wait on cold session fetch
      refetchInterval={0}
    >
      {children}
    </SessionProvider>
  );
}
