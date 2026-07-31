"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "@/i18n/navigation";
import { useTransition } from "react";
import { switchAccountModeAction } from "@/actions/account-mode";
import type { AccountMode } from "@/lib/account-mode";

export function ModeSwitcher() {
  const { data, update } = useSession();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const user = data?.user;

  if (!user?.hasCustomer || !user?.hasDriver) return null;

  async function setMode(mode: AccountMode) {
    startTransition(async () => {
      const result = await switchAccountModeAction(mode);
      if (!result.ok) return;
      await update({
        activeMode: result.activeMode,
        hasCustomer: result.hasCustomer,
        hasDriver: result.hasDriver,
      });
      router.refresh();
      router.push(mode === "DRIVER" ? "/painel" : "/pedidos/novo");
    });
  }

  return (
    <div className="mode-switch" role="group" aria-label="Modo da conta">
      <button
        type="button"
        className={user.activeMode === "CUSTOMER" ? "mode-btn is-active" : "mode-btn"}
        disabled={pending}
        onClick={() => void setMode("CUSTOMER")}
      >
        Modo Cliente
      </button>
      <button
        type="button"
        className={user.activeMode === "DRIVER" ? "mode-btn is-active" : "mode-btn"}
        disabled={pending}
        onClick={() => void setMode("DRIVER")}
      >
        Modo Motorista
      </button>
    </div>
  );
}
