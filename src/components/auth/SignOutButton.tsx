"use client";

import { signOut } from "next-auth/react";

export function SignOutButton({ label = "Sair" }: { label?: string }) {
  return (
    <button
      type="button"
      className="btn btn-ghost btn-sm"
      onClick={() => signOut({ callbackUrl: "/pt" })}
    >
      {label}
    </button>
  );
}
