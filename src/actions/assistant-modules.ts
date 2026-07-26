"use server";

import { requireFamilyContext } from "@/lib/session";
import { calendarService } from "@/lib/calendar";
import { reminderService } from "@/lib/reminders";
import { navigationService, type NavApp } from "@/lib/navigation";
import { saveMobilityPrefs } from "@/lib/learning/preferences";
import { buildTodayBriefing } from "@/lib/ai/today";
import { runIntelligence, savingEngine, learningEngine } from "@/lib/engines";
import { prisma } from "@/lib/db";

/**
 * Mobilidade via Intelligence Layer (Fuel Engine / EV Engine).
 * Sem alteração de UX — mesma action, respostas mais inteligentes.
 */
export async function handleMobilityIntent(opts: {
  mode: "fuel" | "ev" | "auto";
  utterance: string;
  batteryPercent?: number;
  budgetEuros?: number;
}) {
  const { session, membership, family } = await requireFamilyContext();
  const utterance =
    opts.utterance ||
    (opts.mode === "ev"
      ? `tenho ${opts.batteryPercent ?? 30}% de bateria`
      : opts.budgetEuros != null
        ? `onde compensa colocar ${opts.budgetEuros}€`
        : "onde abasteço");

  const outcome = await runIntelligence({
    familyId: family.id,
    userId: session.user.id,
    memberId: membership.id,
    utterance,
  });

  if (!outcome.passthrough && (outcome.engine === "fuel" || outcome.engine === "ev")) {
    if (outcome.recordImpact && outcome.engineResult) {
      await savingEngine.recordFromRecommendation(
        family.id,
        session.user.id,
        outcome.engineResult.recommendation,
        true,
      );
    }
    return {
      ok: true as const,
      reply: outcome.reply,
      deepLink: outcome.deepLink,
    };
  }

  // Fallback se o intent não foi classificado como mobility
  const forced =
    opts.mode === "ev"
      ? await runIntelligence({
          familyId: family.id,
          userId: session.user.id,
          utterance: `tenho ${opts.batteryPercent ?? 30}% de bateria`,
        })
      : await runIntelligence({
          familyId: family.id,
          userId: session.user.id,
          utterance: "onde abasteço",
        });

  if (forced.engineResult) {
    await savingEngine.recordFromRecommendation(
      family.id,
      session.user.id,
      forced.engineResult.recommendation,
      true,
    );
  }

  return {
    ok: true as const,
    reply: forced.reply || "Queres combustível ou carregamento elétrico?",
    deepLink: forced.deepLink,
  };
}

export async function handleCalendarBook(opts: {
  title: string;
  dayHint?: "today" | "tomorrow";
  preferredHour?: number;
}) {
  const { session, family } = await requireFamilyContext();
  await learningEngine.learn({
    type: "habit_hour",
    familyId: family.id,
    userId: session.user.id,
    key: "calendar",
  });
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
  const prefs = await learningEngine.getMobilityPrefs(family.id, session.user.id);
  const app = prefs.navigationApp ?? "google_maps";

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
    return handleMobilityIntent({
      mode: "fuel",
      utterance: "leva-me ao posto mais barato",
    });
  }

  if (/carregar|carregador|supercharger|bateria/.test(destLower)) {
    return handleMobilityIntent({
      mode: "ev",
      utterance: "onde devo carregar",
      batteryPercent: prefs.typicalBatteryPct ?? 30,
    });
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
  await learningEngine.learn({
    type: "navigation_app",
    familyId: family.id,
    userId: session.user.id,
    app,
  });
  return { ok: true as const };
}

/** Saving Engine — «quanto poupei?» */
export async function handleSavingsQuery() {
  const { family } = await requireFamilyContext();
  const { reply } = await savingEngine.savingsSummaryReply(family.id);
  return { ok: true as const, reply };
}

/** Finance Engine tip — «como gastar menos?» */
export async function handleSpendLess() {
  const { membership, family } = await requireFamilyContext();
  const advice = await savingEngine.spendLessAdvice(family.id, membership.id);
  return { ok: true as const, reply: advice.recommendation.reply };
}

/** Helper: carrega itens da lista activa para o Shopping Engine */
export async function loadOpenShoppingItems() {
  const { session, family } = await requireFamilyContext();
  const list = await prisma.shoppingList.findFirst({
    where: { familyId: family.id },
    orderBy: { updatedAt: "desc" },
    include: { items: { where: { isChecked: false } } },
  });
  return (list?.items ?? []).map((i) => ({
    name: i.name,
    brand: i.brand,
    quantity: i.quantity,
  }));
}
