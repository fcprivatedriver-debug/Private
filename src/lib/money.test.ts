import assert from "node:assert/strict";
import test from "node:test";
import { calcDriverNet, calcPlatformFee, toMinorUnits } from "./money";
import { PLATFORM_COMMISSION_PERCENT } from "@/config/constants";

test("Tripvo commission 5% on €200 → €10 platform / €190 driver", () => {
  const total = toMinorUnits(200);
  assert.equal(total, 20_000);
  assert.equal(PLATFORM_COMMISSION_PERCENT, 5);
  const fee = calcPlatformFee(total, PLATFORM_COMMISSION_PERCENT);
  const net = calcDriverNet(total, PLATFORM_COMMISSION_PERCENT);
  assert.equal(fee, 1_000);
  assert.equal(net, 19_000);
  assert.equal(fee + net, total);
});

test("calcPlatformFee uses integer cents (no float drift)", () => {
  // 33.33% of 100 cents would float; we use integer round
  assert.equal(calcPlatformFee(100, 33.33), 33);
  assert.equal(calcPlatformFee(199, 5), 10);
});
