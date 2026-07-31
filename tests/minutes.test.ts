import { describe, expect, it } from "vitest";
import { applyMinimumCharge, computeAvailable } from "@/lib/minutes/ledger";
import { TRIP_STATUS_LABELS } from "@/config/constants";
import { tripBookingSchema, registerSchema } from "@/lib/validators";

describe("minute rules", () => {
  it("computes available minutes like the customer dashboard example", () => {
    expect(
      computeAvailable({ minutesIncluded: 300, minutesUsed: 85, minutesReserved: 40 }),
    ).toBe(175);
  });

  it("applies minimum charge of 15 minutes per trip", () => {
    expect(applyMinimumCharge(8, 15)).toBe(15);
    expect(applyMinimumCharge(42, 15)).toBe(42);
  });

  it("never returns negative available balance", () => {
    expect(
      computeAvailable({ minutesIncluded: 100, minutesUsed: 90, minutesReserved: 20 }),
    ).toBe(0);
  });
});

describe("trip statuses", () => {
  it("uses Portuguese waiting confirmation label", () => {
    expect(TRIP_STATUS_LABELS.AWAITING_CONFIRMATION).toBe("A aguardar confirmação");
    expect(TRIP_STATUS_LABELS.COMPLETED).toBe("Concluída");
    expect(TRIP_STATUS_LABELS.NO_SHOW).toBe("Não compareceu");
  });
});

describe("validators", () => {
  it("rejects mismatched passwords on register", () => {
    const result = registerSchema.safeParse({
      name: "Ana Silva",
      email: "ana@example.com",
      phone: "+351910000000",
      password: "password1",
      confirmPassword: "password2",
    });
    expect(result.success).toBe(false);
  });

  it("accepts a valid trip booking payload", () => {
    const result = tripBookingSchema.safeParse({
      pickupAddress: "Av. da Liberdade 100, Lisboa",
      dropoffAddress: "Aeroporto Humberto Delgado",
      date: "2026-08-01",
      time: "09:30",
      passengers: 2,
      luggage: 1,
      tripType: "ONE_WAY",
    });
    expect(result.success).toBe(true);
  });
});
