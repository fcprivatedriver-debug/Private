import { prisma } from "@/lib/db";

export type NotificationMeta = {
  tripId?: string;
  offerId?: string;
  bookingId?: string;
  href?: string;
};

export async function createNotification(input: {
  userId: string;
  type: string;
  title: string;
  body: string;
  meta?: NotificationMeta;
}) {
  return prisma.notification.create({
    data: {
      userId: input.userId,
      type: input.type,
      title: input.title,
      body: input.body,
      meta: input.meta ? JSON.stringify(input.meta) : null,
    },
  });
}

export async function countUnreadNotifications(userId: string): Promise<number> {
  return prisma.notification.count({
    where: { userId, readAt: null },
  });
}

export async function listNotifications(userId: string, take = 30) {
  return prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take,
  });
}

export async function markNotificationRead(userId: string, notificationId: string) {
  const row = await prisma.notification.findFirst({
    where: { id: notificationId, userId },
  });
  if (!row) return null;
  if (row.readAt) return row;
  return prisma.notification.update({
    where: { id: notificationId },
    data: { readAt: new Date() },
  });
}

export async function markAllNotificationsRead(userId: string) {
  await prisma.notification.updateMany({
    where: { userId, readAt: null },
    data: { readAt: new Date() },
  });
}

export function parseNotificationMeta(raw: string | null | undefined): NotificationMeta {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as NotificationMeta;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function notificationHref(meta: NotificationMeta): string {
  if (meta.href) return meta.href;
  if (meta.tripId) return `/pedidos/${meta.tripId}`;
  return "/pedidos";
}
