/**
 * Contrato de capacidades da Mel — invocação tipada entre módulos.
 */
import type { Task, TaskPriority, TaskStatus, CalendarEvent } from "@prisma/client";

export type TaskListFilter = {
  status?: TaskStatus | TaskStatus[];
  dueAtDay?: "today";
  sortBy?: "priority" | "dueAt";
  limit?: number;
};

export type DetectedIntent =
  | { kind: "query_today_tasks" }
  | { kind: "query_top_priority" }
  | {
      kind: "capture";
      intent: "TASK" | "EVENT" | "REMINDER" | "UNKNOWN";
      title: string;
      dayHint?: "today" | "tomorrow";
      hour?: number;
      priority?: TaskPriority;
      note?: string;
      confidence: number;
    };

export type CapabilityMap = {
  "tasks.list": (input: {
    userId: string;
    filter?: TaskListFilter;
  }) => Promise<Task[]>;
  "tasks.create": (input: {
    userId: string;
    title: string;
    notes?: string;
    priority?: TaskPriority;
    dueAt?: Date | null;
    source?: string;
    tags?: string[];
  }) => Promise<Task>;
  "tasks.update": (input: {
    userId: string;
    taskId: string;
    data: Partial<{
      title: string;
      notes: string | null;
      status: TaskStatus;
      priority: TaskPriority;
      dueAt: Date | null;
      tags: string[];
    }>;
  }) => Promise<Task | null>;
  "tasks.delete": (input: {
    userId: string;
    taskId: string;
  }) => Promise<boolean>;
  "calendar.create": (input: {
    userId: string;
    title: string;
    description?: string;
    startsAt: Date;
    endsAt: Date;
    allDay?: boolean;
    source?: string;
    externalId?: string;
    color?: string;
  }) => Promise<CalendarEvent>;
  "calendar.update": (input: {
    userId: string;
    eventId: string;
    data: Partial<{
      title: string;
      description: string | null;
      startsAt: Date;
      endsAt: Date;
      allDay: boolean;
    }>;
  }) => Promise<CalendarEvent | null>;
  "calendar.delete": (input: {
    userId: string;
    eventId: string;
  }) => Promise<boolean>;
  "calendar.findByExternalId": (input: {
    userId: string;
    externalId: string;
  }) => Promise<CalendarEvent | null>;
  "voice.detectIntent": (input: { utterance: string }) => Promise<DetectedIntent>;
};

type CapName = keyof CapabilityMap;

const registry = new Map<string, CapabilityMap[CapName]>();

export function registerCapability<K extends CapName>(
  name: K,
  impl: CapabilityMap[K],
): void {
  registry.set(name, impl as CapabilityMap[CapName]);
}

export async function invokeCapability<K extends CapName>(
  name: K,
  input: Parameters<CapabilityMap[K]>[0],
): Promise<ReturnType<CapabilityMap[K]>> {
  const fn = registry.get(name);
  if (!fn) {
    throw new Error(`Capability não registada: ${name}`);
  }
  // Cast necessário: Map homogéneo não preserva a correlação K→fn
  return (fn as (arg: Parameters<CapabilityMap[K]>[0]) => ReturnType<CapabilityMap[K]>)(
    input,
  );
}

export function hasCapability(name: CapName): boolean {
  return registry.has(name);
}
