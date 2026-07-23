"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ResetPasswordForm() {
  return (
    <form
      className="space-y-5"
      onSubmit={(event) => {
        event.preventDefault();
      }}
    >
      <div className="space-y-2">
        <Label htmlFor="password">Nova palavra-passe</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Confirmar palavra-passe</Label>
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
        />
      </div>
      <Button type="submit" className="w-full">
        Redefinir palavra-passe
      </Button>
      <p className="text-center text-sm text-[var(--muted)]">
        <Link href="/login" className="hover:text-[var(--foreground)]">
          Voltar ao login
        </Link>
      </p>
    </form>
  );
}
