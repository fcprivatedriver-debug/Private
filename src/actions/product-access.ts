"use server";

import {
  grantAdminProductAccess,
  revokeAdminProductAccess,
  getProductAccessForUser,
} from "@/lib/product-access";
import { requireSession } from "@/lib/session";

/** O utilizador só pode consultar o próprio estado — nunca atribuir-se TESTER. */
export async function getMyProductAccess() {
  const session = await requireSession();
  return getProductAccessForUser(session.user.id);
}

/**
 * Atribuição administrativa de TESTER.
 * Requer PRODUCT_ACCESS_ADMIN_KEY — não há self-service.
 */
export async function adminGrantTester(formData: FormData) {
  const adminKey = String(formData.get("adminKey") || "");
  const userId = String(formData.get("userId") || "");
  const days = Number(formData.get("days") || 30);
  const endsAt =
    Number.isFinite(days) && days > 0
      ? new Date(Date.now() + days * 24 * 60 * 60 * 1000)
      : null;
  return grantAdminProductAccess({
    adminKey,
    userId,
    endsAt,
    notes: String(formData.get("notes") || "") || undefined,
    grantedBy: "admin-action",
  });
}

export async function adminRevokeAccess(formData: FormData) {
  const adminKey = String(formData.get("adminKey") || "");
  const accessId = String(formData.get("accessId") || "");
  return revokeAdminProductAccess({ adminKey, accessId });
}
