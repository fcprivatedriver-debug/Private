import { auth } from "@/lib/auth";

/** Never let auth/DB failures take down public pages. */
export async function getSessionSafe() {
  try {
    return await auth();
  } catch (error) {
    console.error("[auth] getSessionSafe failed", error);
    return null;
  }
}
