"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function RegisterForm() {
  return (
    <form
      className="space-y-5"
      onSubmit={(event) => {
        event.preventDefault();
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="firstName">Nome</Label>
          <Input id="firstName" name="firstName" autoComplete="given-name" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="lastName">Apelido</Label>
          <Input id="lastName" name="lastName" autoComplete="family-name" required />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="phone">Telefone</Label>
        <Input id="phone" name="phone" type="tel" autoComplete="tel" />
      </div>
      <fieldset className="space-y-3">
        <legend className="text-sm font-medium">Tipo de conta</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex cursor-pointer items-start gap-3 rounded-md border border-[var(--border)] bg-[var(--surface)] p-3 has-[:checked]:border-[var(--accent)] has-[:checked]:bg-[var(--accent-soft)]">
            <input
              type="radio"
              name="role"
              value="client"
              defaultChecked
              className="mt-1"
            />
            <span>
              <span className="block text-sm font-medium">Cliente</span>
              <span className="text-xs text-[var(--muted)]">
                Pedir viagens e receber propostas
              </span>
            </span>
          </label>
          <label className="flex cursor-pointer items-start gap-3 rounded-md border border-[var(--border)] bg-[var(--surface)] p-3 has-[:checked]:border-[var(--accent)] has-[:checked]:bg-[var(--accent-soft)]">
            <input type="radio" name="role" value="driver" className="mt-1" />
            <span>
              <span className="block text-sm font-medium">Motorista</span>
              <span className="text-xs text-[var(--muted)]">
                Enviar propostas e gerir veículos
              </span>
            </span>
          </label>
        </div>
      </fieldset>
      <div className="space-y-2">
        <Label htmlFor="password">Palavra-passe</Label>
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
      <label className="flex items-start gap-3 text-sm text-[var(--muted)]">
        <input type="checkbox" name="acceptTerms" required className="mt-1" />
        <span>
          Aceito os termos de utilização e a política de privacidade da FC
          Private Driver.
        </span>
      </label>
      <Button type="submit" className="w-full">
        Criar conta
      </Button>
      <p className="text-center text-sm text-[var(--muted)]">
        Já tem conta?{" "}
        <Link
          href="/login"
          className="font-medium text-[var(--foreground)] underline-offset-4 hover:underline"
        >
          Entrar
        </Link>
      </p>
    </form>
  );
}
