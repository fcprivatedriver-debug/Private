/**
 * Event bus tipado da Mel — comunicação entre módulos sem imports cruzados.
 * Registo em memória (adequado a handlers no mesmo processo/request Next.js).
 */

export type MelEventMap = {
  "task.created": {
    userId: string;
    taskId: string;
    title: string;
    dueAt: string | null;
    priority: string;
    status: string;
  };
  "task.updated": {
    userId: string;
    taskId: string;
    title: string;
    dueAt: string | null;
    priority: string;
    status: string;
    previousDueAt: string | null;
    previousStatus: string;
  };
  "task.deleted": {
    userId: string;
    taskId: string;
  };
};

type Handler<K extends keyof MelEventMap> = (
  payload: MelEventMap[K],
) => void | Promise<void>;

const listeners: {
  [K in keyof MelEventMap]?: Array<Handler<K>>;
} = {};

export function onMelEvent<K extends keyof MelEventMap>(
  event: K,
  handler: Handler<K>,
): () => void {
  const list = (listeners[event] ??= []) as Array<Handler<K>>;
  list.push(handler);
  return () => {
    const idx = list.indexOf(handler);
    if (idx >= 0) list.splice(idx, 1);
  };
}

export async function emitMelEvent<K extends keyof MelEventMap>(
  event: K,
  payload: MelEventMap[K],
): Promise<void> {
  const list = listeners[event] as Array<Handler<K>> | undefined;
  if (!list?.length) return;
  for (const handler of list) {
    await handler(payload);
  }
}
