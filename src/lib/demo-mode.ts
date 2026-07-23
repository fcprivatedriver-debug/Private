import { prisma } from "@/lib/db";

export async function isDemoMode(): Promise<boolean> {
  try {
    const settings = await prisma.platformSettings.findUnique({
      where: { id: "default" },
      select: { demoMode: true },
    });
    return Boolean(settings?.demoMode);
  } catch {
    return process.env.DEMO_MODE === "true";
  }
}
