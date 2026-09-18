"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "@/i18n/navigation";
import { useTransition } from "react";
import { switchAccountModeAction } from "@/actions/account-mode";
import type { AccountMode } from "@/lib/account-mode";

/** Shows only the current account mode; tap to switch to the other. */
export function ModeSwitcher() {
  const { data, update } = useSession();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const user = data?.user;

  if (!user?.hasCustomer || !user?.hasDriver) return null;

  const mode: AccountMode = user.activeMode === "DRIVER" ? "DRIVER" : "CUSTOMER";
  const nextMode: AccountMode = mode === "DRIVER" ? "CUSTOMER" : "DRIVER";

  async function setMode(target: AccountMode) {
    startTransition(async () => {
      const result = await switchAccountModeAction(target);
      if (!result.ok) return;
      await update({
        activeMode: result.activeMode,
        hasCustomer: result.hasCustomer,
        hasDriver: result.hasDriver,
      });
      router.refresh();
      router.push(target === "DRIVER" ? "/pedidos-abertos" : "/pedidos");
    });
  }

  return (
    <div className="mode-switch mode-switch-compact" role="group" aria-label="Modo da conta">
      <button
        type="button"
        className="mode-btn is-active"
        disabled={pending}
        aria-haspopup="true"
        title={mode === "DRIVER" ? "Mudar para Cliente" : "Mudar para Motorista"}
        onClick={() => void setMode(nextMode)}
      >
        {mode === "DRIVER" ? "Motorista" : "Cliente"}
        <span className="mode-btn-hint">
          {pending ? "…" : mode === "DRIVER" ? " · mudar" : " · mudar"}
        </span>
      </button>
    </div>
  );
}
