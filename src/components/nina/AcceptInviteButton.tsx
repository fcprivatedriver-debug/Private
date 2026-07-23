"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { acceptFamilyInvite } from "@/actions/household";

export function AcceptInviteButton({
  token,
  familyName,
  loggedIn,
}: {
  token: string;
  familyName: string;
  loggedIn: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (!loggedIn) {
    return (
      <Link
        className="btn btn-primary"
        href={`/pt/login?callbackUrl=${encodeURIComponent(`/pt/convite/${token}`)}`}
      >
        Entrar para aceitar
      </Link>
    );
  }

  return (
    <div className="stack-lg">
      <button
        type="button"
        className="btn btn-primary"
        disabled={pending}
        onClick={() => {
          start(async () => {
            const res = await acceptFamilyInvite(token);
            if (res.ok) {
              router.push("/pt/dashboard");
              router.refresh();
            } else {
              setError(res.error);
            }
          });
        }}
      >
        Aceitar e juntar-me a {familyName}
      </button>
      {error ? <p className="text-expense">{error}</p> : null}
    </div>
  );
}
