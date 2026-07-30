import type { ModuleId } from "@prisma/client";

export type ModuleStatus = "active" | "preview" | "coming_soon";

export type MelModuleMeta = {
  id: ModuleId;
  slug: string;
  labelPt: string;
  labelEn: string;
  descriptionPt: string;
  descriptionEn: string;
  href: string;
  status: ModuleStatus;
  /** Incluso no MVP por omissão para novos utilizadores */
  defaultEnabled: boolean;
  navOrder: number;
};

/**
 * Catálogo central de módulos.
 * Novas capacidades registam-se aqui — o core não precisa de conhecer detalhes internos.
 */
export const MEL_MODULES: MelModuleMeta[] = [
  {
    id: "TASKS",
    slug: "tarefas",
    labelPt: "Tarefas",
    labelEn: "Tasks",
    descriptionPt: "Lista o que há para fazer, com prioridades e prazos.",
    descriptionEn: "Track what needs doing, with priorities and due dates.",
    href: "/tarefas",
    status: "active",
    defaultEnabled: true,
    navOrder: 10,
  },
  {
    id: "CALENDAR",
    slug: "calendario",
    labelPt: "Calendário",
    labelEn: "Calendar",
    descriptionPt: "Eventos e compromissos no teu dia.",
    descriptionEn: "Events and appointments in your day.",
    href: "/calendario",
    status: "active",
    defaultEnabled: true,
    navOrder: 20,
  },
  {
    id: "VOICE",
    slug: "captura",
    labelPt: "Captura",
    labelEn: "Capture",
    descriptionPt: "Fala ou escreve — a Mel organiza por ti.",
    descriptionEn: "Speak or type — Mel organises it for you.",
    href: "/captura",
    status: "active",
    defaultEnabled: true,
    navOrder: 5,
  },
  {
    id: "REPORTS",
    slug: "relatorios",
    labelPt: "Relatórios",
    labelEn: "Reports",
    descriptionPt: "Resumo semanal do que fizeste e do que falta.",
    descriptionEn: "Weekly summary of what you did and what's left.",
    href: "/relatorios",
    status: "active",
    defaultEnabled: true,
    navOrder: 30,
  },
  {
    id: "HABITS",
    slug: "objectivos",
    labelPt: "Objectivos",
    labelEn: "Goals",
    descriptionPt: "Hábitos e rotinas editáveis, com check-in diário.",
    descriptionEn: "Editable habits and routines, with daily check-in.",
    href: "/objectivos",
    status: "active",
    defaultEnabled: true,
    navOrder: 25,
  },
  {
    id: "REMINDERS",
    slug: "lembretes",
    labelPt: "Lembretes",
    labelEn: "Reminders",
    descriptionPt: "Avisos no momento certo (em breve).",
    descriptionEn: "Nudges at the right time (coming soon).",
    href: "/lembretes",
    status: "coming_soon",
    defaultEnabled: false,
    navOrder: 50,
  },
];

export function getModule(id: ModuleId): MelModuleMeta {
  const mod = MEL_MODULES.find((m) => m.id === id);
  if (!mod) throw new Error(`Módulo desconhecido: ${id}`);
  return mod;
}

export function activeModules(): MelModuleMeta[] {
  return MEL_MODULES.filter((m) => m.status === "active").sort(
    (a, b) => a.navOrder - b.navOrder,
  );
}

export function navModules(): MelModuleMeta[] {
  return MEL_MODULES.filter((m) => m.status !== "coming_soon").sort(
    (a, b) => a.navOrder - b.navOrder,
  );
}

export const DEFAULT_MODULE_IDS: ModuleId[] = MEL_MODULES.filter(
  (m) => m.defaultEnabled,
).map((m) => m.id);
