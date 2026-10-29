// Exact-number grounding tests — no API calls.
// Run: node test/grounding.test.js
import assert from "node:assert";
import { auditPlanNumbers, extractAmounts, mergeVerification, resolveSourceRef } from "../src/grounding.js";
import { getCity, getCountry } from "../src/records.js";
import { normalizeVerdicts } from "../src/verifier.js";

const city = getCity("bacalar");
const country = getCountry("mexico");

let passed = 0;
async function test(name, fn) {
  await fn();
  passed += 1;
  console.log(`ok — ${name}`);
}

await test("source references resolve into the records", async () => {
  assert.equal(resolveSourceRef("cities.bacalar.monthly_cost_usd", city, country).value, 1100);
  assert.deepEqual(resolveSourceRef("cities.bacalar.experiences[0].price_usd", city, country).value, [25, 45]);
  assert.equal(resolveSourceRef("cities.bacalar.nope", city, country).found, false);
});

await test("amount extraction reads $ and USD forms", async () => {
  assert.deepEqual(extractAmounts("Costs $1,100 or 25 USD, not 3 days"), [1100, 25]);
});

await test("an exact cited amount passes; a changed digit fails", async () => {
  const plan = { days: [{ date: "2026-11-09", items: [
    { id: "a", title: "Baseline", detail: "About $1100 a month.", claim_type: "cost", source_refs: ["cities.bacalar.monthly_cost_usd"] },
    { id: "b", title: "Tour", detail: "The tour costs $99.", claim_type: "cost", source_refs: ["cities.bacalar.experiences[0].price_usd"] },
    { id: "c", title: "No source", detail: "A hotel costs $340 a night.", claim_type: "cost", source_refs: [] },
    { id: "d", title: "Pace", detail: "Keep $pace in mind.", claim_type: "general", source_refs: [] },
  ] }] };
  const flags = auditPlanNumbers(plan, city, country);
  assert.equal(flags.has("a"), false);
  assert.equal(flags.get("b")?.verdict, "unsupported");
  assert.equal(flags.get("c")?.verdict, "unsupported");
  assert.equal(flags.has("d"), false);
});

await test("the audit can strengthen a verdict but never clear one", async () => {
  const plan = { days: [{ date: "2026-11-09", items: [
    { id: "a", title: "Baseline", detail: "About $1100 a month.", claim_type: "cost", source_refs: ["cities.bacalar.monthly_cost_usd"] },
    { id: "b", title: "Tour", detail: "The tour costs $99.", claim_type: "cost", source_refs: ["cities.bacalar.experiences[0].price_usd"] },
  ] }] };
  const verification = { verdicts: [
    { item_id: "a", verdict: "supported", note: "model ok" },
    { item_id: "b", verdict: "supported", note: "model missed the price" },
  ], summary: { checked: 2, supported: 2, unsupported: 0, unverifiable: 0 } };
  const merged = mergeVerification(verification, plan, auditPlanNumbers(plan, city, country));
  assert.equal(merged.summary.unsupported, 1);
  assert.equal(merged.verdicts.find((v) => v.item_id === "b").source, "exact_number_check");
});

await test("a missing model verdict is accounted for, not passed silently", async () => {
  const plan = { days: [{ date: "2026-11-09", items: [
    { id: "x", title: "One", detail: "First.", claim_type: "general", source_refs: [] },
    { id: "y", title: "Two", detail: "Second.", claim_type: "general", source_refs: [] },
  ] }] };
  const out = normalizeVerdicts({ verdicts: [{ item_id: "x", verdict: "supported", note: "ok" }] }, plan);
  assert.equal(out.summary.checked, 2);
  assert.equal(out.verdicts.find((v) => v.item_id === "y").verdict, "unverifiable");
});

console.log(`\n${passed} grounding tests passed`);
