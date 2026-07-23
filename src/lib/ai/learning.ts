import type { FinanceScope } from "@prisma/client";
import { prisma } from "@/lib/db";

const AUTO_CONFIDENCE = 3; // após N confirmações, Nina deixa de perguntar

export type ScopeDecision = {
  scope: FinanceScope | null;
  confidence: "high" | "medium" | "low";
  reason: string;
  needsConfirm: boolean;
};

export async function resolveScope(input: {
  userId: string;
  familyId: string;
  raw: string;
  storeName?: string;
  categoryHint?: string;
  explicitScope?: FinanceScope | null;
}): Promise<ScopeDecision> {
  const n = input.raw
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  if (input.explicitScope) {
    return {
      scope: input.explicitScope,
      confidence: "high",
      reason: "Escolheste tu.",
      needsConfirm: false,
    };
  }

  // Regras explícitas do utilizador
  const rules = await prisma.ninaMemoryRule.findMany({
    where: { userId: input.userId, isActive: true },
    orderBy: { hitCount: "desc" },
  });
  for (const rule of rules) {
    const phrase = rule.triggerPhrase.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (phrase && n.includes(phrase)) {
      await prisma.ninaMemoryRule.update({
        where: { id: rule.id },
        data: { hitCount: { increment: 1 } },
      });
      return {
        scope: rule.scope ?? "PERSONAL",
        confidence: "high",
        reason: `Lembrei-me da tua regra: “${rule.triggerPhrase}”.`,
        needsConfirm: false,
      };
    }
  }

  if (/(tvde|uber|bolt|cliente|empresa|atividade profissional|fatura profissional|recibo verde)/.test(n)) {
    return {
      scope: "PERSONAL",
      confidence: "high",
      reason: "Soa a atividade profissional — registo nas tuas finanças pessoais com esse contexto.",
      needsConfirm: false,
    };
  }

  // Pistas linguísticas fortes
  if (/(para casa|da casa|familiar|partilhad|compras para casa|conta familiar|da familia|da família)/.test(n)) {
    return {
      scope: "FAMILY",
      confidence: "high",
      reason: "Disseste que era para casa / Conta Familiar.",
      needsConfirm: false,
    };
  }
  if (/(meu cafe|meu café|pessoal|para mim|sozinho|só eu|so eu|do meu bolso)/.test(n)) {
    return {
      scope: "PERSONAL",
      confidence: "high",
      reason: "Soa a gasto pessoal.",
      needsConfirm: false,
    };
  }
  if (/(cafe|café|almoço sozinho|cerveja|tabaco)/.test(n) && !/casa|familia|familiar/.test(n)) {
    return {
      scope: "PERSONAL",
      confidence: "medium",
      reason: "Costuma ser pessoal (ex.: café).",
      needsConfirm: false,
    };
  }
  if (/(renda|luz|agua|água|gas|gás|internet|condominio|condomínio)/.test(n)) {
    return {
      scope: "FAMILY",
      confidence: "high",
      reason: "Parece uma conta da casa.",
      needsConfirm: false,
    };
  }

  // Hábitos aprendidos (loja / categoria)
  const keys: { keyType: string; keyValue: string }[] = [];
  if (input.storeName) keys.push({ keyType: "store", keyValue: input.storeName.toLowerCase() });
  if (input.categoryHint) keys.push({ keyType: "category", keyValue: input.categoryHint.toLowerCase() });

  for (const key of keys) {
    const habit = await prisma.ninaHabitStat.findUnique({
      where: {
        userId_familyId_keyType_keyValue: {
          userId: input.userId,
          familyId: input.familyId,
          keyType: key.keyType,
          keyValue: key.keyValue,
        },
      },
    });
    if (!habit) continue;
    const total = habit.personalCount + habit.familyCount;
    if (total >= AUTO_CONFIDENCE) {
      const preferFamily = habit.familyCount > habit.personalCount;
      const preferPersonal = habit.personalCount > habit.familyCount;
      if (preferFamily || preferPersonal) {
        const dominant = Math.max(habit.familyCount, habit.personalCount);
        const ratio = dominant / total;
        if (ratio >= 0.7) {
          return {
            scope: preferFamily ? "FAMILY" : "PERSONAL",
            confidence: "high",
            reason: `Aprendi contigo: ${key.keyValue} costuma ir para ${preferFamily ? "a Conta Familiar" : "as tuas finanças pessoais"}.`,
            needsConfirm: false,
          };
        }
      }
    }
    if (total >= 1 && habit.lastScope) {
      return {
        scope: habit.lastScope,
        confidence: "medium",
        reason: `Da última vez em ${key.keyValue} foi ${habit.lastScope === "FAMILY" ? "familiar" : "pessoal"}.`,
        needsConfirm: total < AUTO_CONFIDENCE,
      };
    }
  }

  // Supermercado sem contexto → perguntar (exceto se já houver hábito)
  if (/(continente|pingo|lidl|mercadona|auchan|supermercado)/.test(n)) {
    return {
      scope: null,
      confidence: "low",
      reason: "Pode ser casa ou pessoal.",
      needsConfirm: true,
    };
  }

  return {
    scope: "PERSONAL",
    confidence: "low",
    reason: "Por omissão, registo nas tuas finanças pessoais.",
    needsConfirm: true,
  };
}

export async function learnScopeHabit(input: {
  userId: string;
  familyId: string;
  storeName?: string;
  categoryHint?: string;
  scope: FinanceScope;
}) {
  const keys: { keyType: string; keyValue: string }[] = [];
  if (input.storeName) keys.push({ keyType: "store", keyValue: input.storeName.toLowerCase() });
  if (input.categoryHint) keys.push({ keyType: "category", keyValue: input.categoryHint.toLowerCase() });

  for (const key of keys) {
    await prisma.ninaHabitStat.upsert({
      where: {
        userId_familyId_keyType_keyValue: {
          userId: input.userId,
          familyId: input.familyId,
          keyType: key.keyType,
          keyValue: key.keyValue,
        },
      },
      create: {
        userId: input.userId,
        familyId: input.familyId,
        keyType: key.keyType,
        keyValue: key.keyValue,
        personalCount: input.scope === "PERSONAL" ? 1 : 0,
        familyCount: input.scope === "FAMILY" ? 1 : 0,
        lastScope: input.scope,
        lastUsedAt: new Date(),
      },
      update: {
        personalCount: input.scope === "PERSONAL" ? { increment: 1 } : undefined,
        familyCount: input.scope === "FAMILY" ? { increment: 1 } : undefined,
        lastScope: input.scope,
        lastUsedAt: new Date(),
      },
    });
  }
}

export function parseMemoryRuleCommand(raw: string): {
  triggerPhrase: string;
  scope: FinanceScope;
  categorySlug?: string;
} | null {
  const n = raw
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

  // "sempre que eu disser 'X', regista na Conta Familiar"
  const m = n.match(
    /sempre que(?: eu)?(?: disser| diga| falar| fale)\s+['"]?(.+?)['"]?\s*,?\s*(?:regista|coloca|mete|considera)/,
  );
  if (!m) return null;
  const triggerPhrase = m[1].trim();
  let scope: FinanceScope = "PERSONAL";
  let categorySlug: string | undefined;
  if (/conta familiar|para casa|familia|familiar|partilhad/.test(n)) scope = "FAMILY";
  if (/pessoal|minhas financas|minhas finanças/.test(n)) scope = "PERSONAL";
  if (/tvde|atividade profissional|empresa|cliente/.test(n)) {
    categorySlug = /tvde/.test(n) ? "tvde" : "empresa";
    if (/empresa|cliente|tvde|profissional/.test(n)) {
      // business often personal books but tagged
      scope = "PERSONAL";
    }
  }
  return { triggerPhrase, scope, categorySlug };
}
