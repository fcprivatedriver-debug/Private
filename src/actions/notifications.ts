"use server";

import { auth } from "@/lib/auth";
import {
  markAllNotificationsRead,
  markNotificationRead,
  parseNotificationMeta,
  notificationHref,
} from "@/lib/notifications";

export async function markNotificationReadAction(notificationId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false as const, error: "Sem permissão" };
  }
  const row = await markNotificationRead(session.user.id, notificationId);
  if (!row) return { ok: false as const, error: "Notificação não encontrada" };
  const meta = parseNotificationMeta(row.meta);
  return {
    ok: true as const,
    href: notificationHref(meta),
  };
}

export async function markAllNotificationsReadAction() {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false as const, error: "Sem permissão" };
  }
  await markAllNotificationsRead(session.user.id);
  return { ok: true as const };
}
