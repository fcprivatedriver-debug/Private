import { findContactLeak, MessageModerationError, moderateOfferMessage } from "@/lib/message-moderation";
import { shortLocationLabel, shortRouteLabel, publicFirstName } from "@/lib/location-label";
import assert from "node:assert/strict";
import { describe, it } from "node:test";

describe("message moderation", () => {
  it("allows normal trip logistics messages", () => {
    assert.equal(findContactLeak("Levo cadeira de criança e espero no terminal 1"), null);
    assert.equal(findContactLeak("Bagagem: 2 malas grandes. Voo TP1234."), null);
    assert.equal(findContactLeak("Ponto de encontro: saída Arrivals."), null);
    assert.equal(moderateOfferMessage("Inclui portagens e 15 min de espera"), "Inclui portagens e 15 min de espera");
  });

  it("blocks phones, emails, messengers and spelled digits", () => {
    assert.ok(findContactLeak("Liga para 933 123 456"));
    assert.ok(findContactLeak("933-123-456"));
    assert.ok(findContactLeak("o meu mail é nome @ gmail . com"));
    assert.ok(findContactLeak("fala comigo no whats"));
    assert.ok(findContactLeak("procura-me no insta"));
    assert.ok(findContactLeak("https://t.me/alguem"));
    assert.ok(findContactLeak("nove três três um dois três quatro cinco seis"));
    assert.throws(() => moderateOfferMessage("WhatsApp 912345678"), MessageModerationError);
  });
});

describe("location labels", () => {
  it("shortens airport and street addresses", () => {
    assert.equal(
      shortLocationLabel("Aeroporto Humberto Delgado, Alameda das Comunidades Portuguesas, Lisboa"),
      "Aeroporto Humberto Delgado",
    );
    assert.equal(
      shortLocationLabel("Rua Cristino da Silva, Massamá, 2745-123 Sintra, Portugal"),
      "Massamá",
    );
    assert.match(
      shortRouteLabel(
        "Aeroporto Humberto Delgado, Lisboa",
        "Rua Cristino da Silva, Massamá",
      ),
      /→/,
    );
  });

  it("exposes only first public name", () => {
    assert.equal(publicFirstName("Carlos Silva"), "Carlos");
    assert.equal(publicFirstName(""), "Motorista");
  });
});
