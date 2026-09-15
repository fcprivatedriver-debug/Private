/**
 * Learning Engine — aprendizagem silenciosa.
 * Nunca pergunta ao utilizador; grava hábitos naturalmente.
 */

import { prisma } from "@/lib/db";
import {
  getMobilityPrefs,
  saveMobilityPrefs,
  type MobilityPrefs,
} from "@/lib/learning/preferences";
import { categoryKeyFromQuery } from "@/lib/products";

export type LearnEvent =
  | {
      type: "shopping_product";
      familyId: string;
      userId: string;
      productName: string;
      brand?: string | null;
      storeName?: string | null;
    }
  | {
      type: "shopping_store";
      familyId: string;
      userId: string;
      storeName: string;
    }
  | {
      type: "fuel_station";
      familyId: string;
      userId: string;
      brand?: string | null;
      stationName?: string;
    }
  | {
      type: "ev_charger";
      familyId: string;
      userId: string;
      network?: string | null;
      batteryPct?: number;
    }
  | {
      type: "navigation_app";
      familyId: string;
      userId: string;
      app: NonNullable<MobilityPrefs["navigationApp"]>;
    }
  | {
      type: "habit_hour";
      familyId: string;
      userId: string;
      key: string;
    };

async function bumpHabit(
  userId: string,
  familyId: string,
  keyType: string,
  keyValue: string,
) {
  const key = keyValue.toLowerCase().slice(0, 120);
  if (!key) return;
  await prisma.ninaHabitStat.upsert({
    where: {
      userId_familyId_keyType_keyValue: {
        userId,
        familyId,
        keyType,
        keyValue: key,
      },
    },
    create: {
      userId,
      familyId,
      keyType,
      keyValue: key,
      personalCount: 1,
      lastUsedAt: new Date(),
    },
    update: {
      personalCount: { increment: 1 },
      lastUsedAt: new Date(),
    },
  });
}

export async function learn(event: LearnEvent): Promise<void> {
  try {
    switch (event.type) {
      case "shopping_product": {
        const cat = categoryKeyFromQuery(event.productName);
        await prisma.productPreference.upsert({
          where: {
            familyId_userId_categoryKey: {
              familyId: event.familyId,
              userId: event.userId,
              categoryKey: cat,
            },
          },
          create: {
            familyId: event.familyId,
            userId: event.userId,
            categoryKey: cat,
            preferredName: event.productName,
            brand: event.brand ?? null,
            storeName: event.storeName ?? null,
            useCount: 1,
          },
          update: {
            preferredName: event.productName,
            brand: event.brand ?? undefined,
            storeName: event.storeName ?? undefined,
            useCount: { increment: 1 },
            lastUsedAt: new Date(),
          },
        });
        await bumpHabit(event.userId, event.familyId, "product", event.productName);
        if (event.brand) {
          await bumpHabit(event.userId, event.familyId, "brand", event.brand);
        }
        break;
      }
      case "shopping_store": {
        await bumpHabit(event.userId, event.familyId, "store", event.storeName);
        break;
      }
      case "fuel_station": {
        if (event.brand) {
          await saveMobilityPrefs(event.familyId, event.userId, {
            fuelBrand: event.brand,
            fuelType: "petrol",
          });
          await bumpHabit(event.userId, event.familyId, "fuel_brand", event.brand);
        }
        if (event.stationName) {
          await bumpHabit(event.userId, event.familyId, "fuel_station", event.stationName);
        }
        break;
      }
      case "ev_charger": {
        await saveMobilityPrefs(event.familyId, event.userId, {
          fuelType: "electric",
          evNetwork: event.network ?? undefined,
          typicalBatteryPct: event.batteryPct ?? undefined,
        });
        if (event.network) {
          await bumpHabit(event.userId, event.familyId, "ev_network", event.network);
        }
        break;
      }
      case "navigation_app": {
        await saveMobilityPrefs(event.familyId, event.userId, {
          navigationApp: event.app,
        });
        break;
      }
      case "habit_hour": {
        const hour = new Date().getHours();
        await bumpHabit(
          event.userId,
          event.familyId,
          "hour",
          `${event.key}:${hour}`,
        );
        break;
      }
    }
  } catch {
    // aprendizagem nunca deve quebrar a conversa
  }
}

export async function topHabits(
  familyId: string,
  userId: string,
  keyType: string,
  limit = 5,
) {
  return prisma.ninaHabitStat.findMany({
    where: { familyId, userId, keyType },
    orderBy: { personalCount: "desc" },
    take: limit,
  });
}

export { getMobilityPrefs, saveMobilityPrefs };

export const learningEngine = {
  learn,
  topHabits,
  getMobilityPrefs,
  saveMobilityPrefs,
};
