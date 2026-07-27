import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { startOfWeek, endOfWeek, addDays, setHours, setMinutes } from "date-fns";

const prisma = new PrismaClient();

const DEMO_PASSWORD = "mel123";

async function upsertDemoUser(email: string, name: string) {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const user = await prisma.user.upsert({
    where: { email },
    create: {
      email,
      name,
      passwordHash,
      biometricsEnabled: false,
      locale: "pt",
      timezone: "Europe/Lisbon",
      melTone: "warm",
      modules: {
        create: [
          { moduleId: "TASKS", enabled: true },
          { moduleId: "CALENDAR", enabled: true },
          { moduleId: "VOICE", enabled: true },
          { moduleId: "REPORTS", enabled: true },
          { moduleId: "HABITS", enabled: false },
          { moduleId: "REMINDERS", enabled: false },
        ],
      },
    },
    update: {
      name,
      passwordHash,
    },
  });
  return user;
}

async function seedContent(userId: string) {
  await prisma.task.deleteMany({ where: { userId } });
  await prisma.calendarEvent.deleteMany({ where: { userId } });
  await prisma.voiceCapture.deleteMany({ where: { userId } });
  await prisma.weeklyReport.deleteMany({ where: { userId } });
  await prisma.melMessage.deleteMany({ where: { userId } });
  await prisma.habit.deleteMany({ where: { userId } });
  await prisma.reminder.deleteMany({ where: { userId } });

  const now = new Date();
  const tomorrow = addDays(now, 1);
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

  await prisma.task.createMany({
    data: [
      {
        userId,
        title: "Comprar pão e fruta",
        priority: "MEDIUM",
        status: "TODO",
        dueAt: setHours(now, 18),
        source: "manual",
        tags: ["casa"],
      },
      {
        userId,
        title: "Enviar proposta ao cliente",
        priority: "HIGH",
        status: "IN_PROGRESS",
        dueAt: setHours(now, 17),
        source: "manual",
        tags: ["trabalho"],
      },
      {
        userId,
        title: "Marcar revisão do carro",
        priority: "LOW",
        status: "TODO",
        dueAt: addDays(now, 3),
        source: "voice",
        tags: ["admin"],
      },
      {
        userId,
        title: "Pagar electricidade",
        priority: "URGENT",
        status: "DONE",
        completedAt: addDays(now, -1),
        source: "manual",
        tags: ["finanças"],
      },
    ],
  });

  await prisma.calendarEvent.createMany({
    data: [
      {
        userId,
        title: "Reunião de equipa",
        description: "Sync semanal",
        startsAt: setMinutes(setHours(now, 10), 0),
        endsAt: setMinutes(setHours(now, 11), 0),
        source: "manual",
        color: "#0F766E",
      },
      {
        userId,
        title: "Almoço com a Ana",
        location: "Café da Praça",
        startsAt: setMinutes(setHours(tomorrow, 13), 0),
        endsAt: setMinutes(setHours(tomorrow, 14), 30),
        source: "voice",
        color: "#D97706",
      },
      {
        userId,
        title: "Aula de yoga",
        startsAt: setMinutes(setHours(addDays(now, 2), 19), 0),
        endsAt: setMinutes(setHours(addDays(now, 2), 20), 0),
        source: "manual",
        color: "#0F766E",
      },
    ],
  });

  await prisma.habit.create({
    data: {
      userId,
      title: "Beber água",
      frequency: "DAILY",
      targetPerWeek: 7,
      color: "#0EA5E9",
    },
  });

  await prisma.reminder.create({
    data: {
      userId,
      title: "Levar o casaco",
      remindAt: setMinutes(setHours(tomorrow, 8), 30),
      source: "manual",
    },
  });

  await prisma.voiceCapture.create({
    data: {
      userId,
      transcript: "cria tarefa marcar revisão do carro",
      intent: "TASK",
      confidence: 0.9,
      createdEntity: "task:demo",
    },
  });

  await prisma.weeklyReport.create({
    data: {
      userId,
      weekStart,
      weekEnd,
      summary:
        "Semana a arrancar com ritmo. Já concluíste uma tarefa urgente e tens a reunião de equipa hoje às 10:00.",
      highlights: [
        { kind: "win", text: "Pagaste a electricidade a tempo." },
        { kind: "focus", text: "Fecha a proposta ao cliente ainda hoje." },
        { kind: "tip", text: "Usa a captura por voz para registos rápidos." },
      ],
      metrics: {
        tasksCreated: 4,
        tasksDone: 1,
        tasksOpen: 3,
        eventsCount: 3,
        voiceCaptures: 1,
        completionRate: 25,
      },
    },
  });

  await prisma.melMessage.createMany({
    data: [
      {
        userId,
        role: "ASSISTANT",
        content:
          "Olá! Sou a Mel. Posso organizar tarefas, o calendário e o teu relatório semanal. Diz-me o que precisas.",
      },
    ],
  });
}

async function main() {
  console.log("[seed] Mel demo…");
  const filipe = await upsertDemoUser("filipe@mel.app", "Filipe");
  await seedContent(filipe.id);

  const mel = await upsertDemoUser("mel@mel.app", "Mel Demo");
  await seedContent(mel.id);

  console.log("[seed] Contas demo (palavra-passe: mel123):");
  console.log("  - filipe@mel.app");
  console.log("  - mel@mel.app");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
