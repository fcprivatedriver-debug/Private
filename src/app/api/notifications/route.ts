import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  countUnreadNotifications,
  listNotifications,
  parseNotificationMeta,
  notificationHref,
} from "@/lib/notifications";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const [unreadCount, rows] = await Promise.all([
    countUnreadNotifications(session.user.id),
    listNotifications(session.user.id, 40),
  ]);

  return NextResponse.json({
    unreadCount,
    notifications: rows.map((n) => {
      const meta = parseNotificationMeta(n.meta);
      return {
        id: n.id,
        type: n.type,
        title: n.title,
        body: n.body,
        readAt: n.readAt,
        createdAt: n.createdAt,
        href: notificationHref(meta),
        meta,
      };
    }),
  });
}
