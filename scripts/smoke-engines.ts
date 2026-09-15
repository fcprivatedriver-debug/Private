import { parseMoneyIntent } from "../src/lib/ai/parse-intent";
import { shoppingEngine } from "../src/lib/engines/shopping-engine";
import { fuelEngine } from "../src/lib/engines/fuel-engine";
import { evEngine } from "../src/lib/engines/ev-engine";

async function main() {
  for (const s of [
    "Quanto poupei?",
    "Como posso gastar menos este mês?",
    "Vou às compras",
    "Onde abasteço?",
    "Tenho 18% de bateria",
  ]) {
    console.log(s, "=>", parseMoneyIntent(s)?.kind);
  }
  const shop = await shoppingEngine.optimizeBasket([
    { name: "Leite Mimosa" },
    { name: "Manteiga Milhafre" },
  ]);
  console.log("SHOP:", shop.recommendation.reply.slice(0, 220));
  const fuel = await fuelEngine.recommendFuel({
    utterance: "onde abasteço",
    budgetEuros: 20,
  });
  console.log("FUEL:", fuel.recommendation.reply.slice(0, 220));
  const ev = await evEngine.recommendCharge({ batteryPercent: 18 });
  console.log("EV:", ev.recommendation.reply.slice(0, 220));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
