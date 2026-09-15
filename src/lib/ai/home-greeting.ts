/**
 * Mensagens adaptativas da home — quentes, humanas, nunca “software de contabilidade”.
 */

export type HomeGreetingInput = {
  displayName: string;
  incomeCents: number;
  expenseCents: number;
  balanceCents: number;
  expenseTodayCents: number;
  isEmpty: boolean;
};

function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] || "olá";
}

function dayPart(d = new Date()): "manhã" | "tarde" | "noite" {
  const h = d.getHours();
  if (h < 12) return "manhã";
  if (h < 19) return "tarde";
  return "noite";
}

export function homeGreeting(input: HomeGreetingInput): {
  title: string;
  subtitle: string;
} {
  const name = firstName(input.displayName);
  const part = dayPart();
  const hello =
    part === "manhã" ? `Bom dia, ${name}` : part === "tarde" ? `Boa tarde, ${name}` : `Boa noite, ${name}`;

  if (input.isEmpty) {
    return {
      title: `${hello} 👋`,
      subtitle: "Ainda não registaste nada. Diz-me quanto gastaste — ou o que precisas nas compras.",
    };
  }

  if (input.expenseTodayCents === 0) {
    return {
      title: `${hello} 👋`,
      subtitle: "Hoje ainda não registaste despesas. Diz-me quanto gastaste quando quiseres.",
    };
  }

  if (input.balanceCents > 0 && input.incomeCents > input.expenseCents) {
    return {
      title: "Excelente trabalho.",
      subtitle: `Este mês já estás a poupar mais, ${name}. Continua assim — eu trato das contas.`,
    };
  }

  if (input.expenseCents > input.incomeCents && input.incomeCents > 0) {
    return {
      title: `${hello}`,
      subtitle: "As despesas passaram um pouco as receitas. Vamos olhar para isso com calma — juntos.",
    };
  }

  return {
    title: `${hello} 👋`,
    subtitle: "Estou aqui. Fala comigo sobre dinheiro ou compras — como falarias com uma amiga.",
  };
}
