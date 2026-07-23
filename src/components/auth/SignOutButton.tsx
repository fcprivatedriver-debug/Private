"use client";

import { signOut } from "next-auth/react";

export function SignOutButton({ className }: { className?: string }) {
  return (
    <button
      type="button"
      className={className ?? "btn btn-ghost btn-sm w-full"}
      onClick={() => signOut({ callbackUrl: "/pt" })}
    >
      Terminar sessão
    </button>
  );
}
