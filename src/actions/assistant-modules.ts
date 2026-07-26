"use server";

import { requireFamilyContext } from "@/lib/session";
import { decideMobility } from "@/lib/mobility/decision";
import { calendarService } from "@/lib/calendar";
import { reminderService } from "@/lib/reminders";
import { navigationService, type NavApp } from "@/lib/navigation";
import {
  getMobilityPrefs,
  learnFromMobilityDecision,
  saveMobilityPrefs,
} from "@/lib/learning/preferences";
import { buildTodayBriefing } from "@/lib/ai/today";

export async function handleMobilityIntent(opts: {
  mode: "fuel" | "ev" | "auto";
  utterance: string;
  batteryPercent?: number;
  budgetEuros?: number;
}) {
  const { session, family } = await requireFamilyContext();
  const prefs = await getMobilityPrefs(family.id, session.user.id);
  const decision = await decideMobility({
    kind: opts.mode,
    utterance: opts.utterance,
    batteryPercent: opts.batteryPercent ?? prefs.typicalBatteryPct ?? undefined,
    budgetEuros: opts.budgetEuros,
    preferredFuelBrands: prefs.fuelBrand ? [prefs.fuelBrand] : undefined,
    preferredEvNetworks: prefs.evNetwork ? [prefs.evNetwork] : undefined,
  });

  await learnFromMobilityDecision(family.id, session.user.id, {
    kind: decision.kind,
    brandOrNetwork:
      decision.kind === "ev"
        ? prefs.evNetwork ?? undefined
        : prefs.fuelBrand ?? undefined,
    batteryPct: opts.batteryPercent,
  });

  if (opts.batteryPercent != null) {
    await saveMobilityPrefs(family.id, session.user.id, {
      typicalBatteryPct: opts.batteryPercent,
      fuelType: decision.kind === "ev" ? "electric" : prefs.fuelType,
    });
  }

  return {
    ok: true as const,
    reply: decision.reply,
    deepLink: decision.deepLink,
  };
}

export async function handleCalendarBook(opts: {
  title: string;
  dayHint?: "today" | "tomorrow";
  preferredHour?: number;
}) {
  await requireFamilyContext();
  const res = await calendarService.suggestAndPrepare({
    title: opts.title,
    dayHint: opts.dayHint ?? "tomorrow",
    preferredHour: opts.preferredHour,
  });
  return {
    ok: true as const,
    reply: res.reply,
    deepLink: res.authUrl,
    suggestions: res.freeSlots.slice(0, 4).map((s) => {
      const h = s.start.getHours();
      return `Marca para as ${h}`;
    }),
  };
}

export async function handleCalendarConfirm(opts: {
  hour: number;
  minute?: number;
  title?: string;
  dayHint?: "today" | "tomorrow";
}) {
  await requireFamilyContext();
  const day = new Date();
  if (opts.dayHint !== "today") day.setDate(day.getDate() + 1);
  day.setHours(opts.hour, opts.minute ?? 0, 0, 0);
  const end = new Date(day.getTime() + 60 * 60_000);
  const res = await calendarService.confirmBooking({
    title: opts.title || "Compromisso",
    start: day,
    end,
    notes: "Agendado com a Nina",
  });
  return {
    ok: true as const,
    reply: res.reply,
    deepLink: res.deepLink,
  };
}

export async function handleReminder(opts: { title: string; when: Date }) {
  await requireFamilyContext();
  const res = await reminderService.schedule({
    title: opts.title,
    when: opts.when,
  });
  return {
    ok: true as const,
    reply: res.reply,
    deepLink: res.deepLink,
  };
}

export async function handleNavigate(destination: string) {
  const { session, family } = await requireFamilyContext();
  const prefs = await getMobilityPrefs(family.id, session.user.id);
  const app = (prefs.navigationApp as NavApp | null) ?? "google_maps";

  // Destinos inteligentes
  const destLower = destination.toLowerCase();
  if (/reuniao|reunião|compromisso|evento/.test(destLower)) {
    const provider = calendarService.getProvider();
    const now = new Date();
    const end = new Date(now.getTime() + 48 * 3600_000);
    const events = await provider.listEvents(now, end);
    const next = events.find((e) => e.start >= now) ?? events[0];
    if (next) {
      const open = navigationService.open(
        {
          label: next.title,
          address: next.location || next.title,
        },
        app,
      );
      return {
        ok: true as const,
        reply: `Vou levar-te à «${next.title}». ${open.reply}`,
        deepLink: open.deepLink,
      };
    }
  }

  if (/posto|abastec|barato|combustivel|combustível/.test(destLower)) {
    const mobility = await handleMobilityIntent({
      mode: "fuel",
      utterance: "leva-me ao posto mais barato",
    });
    return mobility;
  }

  const open = navigationService.open({ label: destination, address: destination }, app);
  return {
    ok: true as const,
    reply: open.reply,
    deepLink: open.deepLink,
  };
}

export async function handleTodayBriefing() {
  const { session, family } = await requireFamilyContext();
  const briefing = await buildTodayBriefing(family.id, session.user.id);
  return {
    ok: true as const,
    reply: briefing.spokenSummary,
    briefing,
  };
}

export async function setPreferredNavApp(app: NavApp) {
  const { session, family } = await requireFamilyContext();
  await saveMobilityPrefs(family.id, session.user.id, { navigationApp: app });
  return { ok: true as const };
}
