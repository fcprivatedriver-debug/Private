"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ForgotPasswordForm() {
  return (
    <form
      className="space-y-5"
      onSubmit={(event) => {
        event.preventDefault();
      }}
    >
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="nome@email.com"
          required
        />
      </div>
      <Button type="submit" className="w-full">
        Enviar ligação de recuperação
      </Button>
      <p className="text-center text-sm text-[var(--muted)]">
        <Link href="/login" className="hover:text-[var(--foreground)]">
          Voltar ao login
        </Link>
      </p>
    </form>
  );
}
