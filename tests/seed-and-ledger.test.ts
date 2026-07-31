import { describe, expect, it, beforeAll } from "vitest";
import { PrismaClient } from "@prisma/client";
import {
  applyMinuteTransaction,
  computeAvailable,
  applyMinimumCharge,
} from "@/lib/minutes/ledger";

const prisma = new PrismaClient();

describe("demo seed integrity", () => {
  beforeAll(async () => {
    // ensure seeded
  });

  it("has admin, customer, driver and two plans", async () => {
    const [admins, customers, drivers, plans] = await Promise.all([
      prisma.user.count({ where: { role: "ADMIN" } }),
      prisma.user.count({ where: { role: "CUSTOMER" } }),
      prisma.user.count({ where: { role: "DRIVER" } }),
      prisma.plan.count({ where: { active: true } }),
    ]);
    expect(admins).toBeGreaterThanOrEqual(1);
    expect(customers).toBeGreaterThanOrEqual(1);
    expect(drivers).toBeGreaterThanOrEqual(1);
    expect(plans).toBeGreaterThanOrEqual(2);
  });

  it("customer subscription matches dashboard example counters", async () => {
    const user = await prisma.user.findUnique({
      where: { email: "cliente@fcprivatedriver.demo" },
    });
    expect(user).toBeTruthy();
    const sub = await prisma.subscription.findFirst({
      where: { userId: user!.id, status: "ACTIVE" },
      include: { plan: true },
    });
    expect(sub?.plan.code).toBe("prata");
    expect(sub?.minutesIncluded).toBe(300);
    expect(sub?.minutesUsed).toBe(85);
    expect(sub?.minutesReserved).toBe(40);
    expect(computeAvailable(sub!)).toBe(175);
  });

  it("ledger has both credits and debits", async () => {
    const user = await prisma.user.findUnique({
      where: { email: "cliente@fcprivatedriver.demo" },
    });
    const txns = await prisma.minuteTransaction.findMany({
      where: { userId: user!.id },
    });
    expect(txns.some((t) => t.minutes > 0)).toBe(true);
    expect(txns.some((t) => t.minutes < 0)).toBe(true);
  });
});

describe("admin minute adjustment creates ledger row", () => {
  it("credits promotional minutes", async () => {
    const user = await prisma.user.findUnique({
      where: { email: "cliente@fcprivatedriver.demo" },
    });
    const sub = await prisma.subscription.findFirst({
      where: { userId: user!.id, status: "ACTIVE" },
    });
    const before = sub!.minutesIncluded;
    const result = await applyMinuteTransaction({
      userId: user!.id,
      subscriptionId: sub!.id,
      type: "PROMOTIONAL",
      minutes: 15,
      reason: "Oferta de teste vitest",
      counter: "included",
    });
    expect(result.minutesIncluded).toBe(before + 15);
    // revert
    await applyMinuteTransaction({
      userId: user!.id,
      subscriptionId: sub!.id,
      type: "ADMIN_ADJUSTMENT",
      minutes: -15,
      reason: "Reversão teste vitest",
      counter: "included",
    });
  });
});

describe("charge rules", () => {
  it("waiting + trip minutes use minimum floor", () => {
    expect(applyMinimumCharge(5 + 0, 15)).toBe(15);
  });
});
