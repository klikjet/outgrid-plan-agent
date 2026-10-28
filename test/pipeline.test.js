// Pipeline tests with scripted fake model transports — no API calls.
// Covers the state machine in spec §1/§4/§5:
//   happy publish · retry fixes it · drop after retry · gutted → held ·
//   verifier outage → held (never published unchecked).
// Run: node test/pipeline.test.js
import assert from "node:assert";
import { runPipeline } from "../src/pipeline.js";
import { runVerifier } from "../src/verifier.js";
import { getCity, getCountry } from "../src/records.js";
import { ModelUnavailableError } from "../src/model-client.js";

const config = {
  metaApiKey: "test", basetenApiKey: "test",
  metaBaseUrl: "https://planner.invalid/v1", basetenBaseUrl: "https://verifier.invalid/v1",
  plannerModel: "muse-spark-test", verifierModel: "meta-models/muse-spark-open-1026",
  timeoutMs: 1000,
};
const intake = {
  destination_id: "bacalar", start_date: "2026-11-09", end_date: "2026-11-09",
  travelers: 1, nationality: "US", budget_range: "1000-1500",
  accommodation_tier: "mid", pace: "balanced", interests: [],
};
const city = getCity("bacalar");
const country = getCountry("mexico");

const goodDay = {
  days: [{ date: "2026-11-09", items: [
    { title: "Monthly cost baseline", detail: "About $1100 a month all-in.", claim_type: "cost", source_refs: ["cities.bacalar.monthly_cost_usd"] },
    { title: "Settle in", detail: "Slow first day.", claim_type: "general", source_refs: [] },
  ] }],
};
const badDay = {
  days: [{ date: "2026-11-09", items: [
    { title: "Monthly cost baseline", detail: "About $1100 a month all-in.", claim_type: "cost", source_refs: ["cities.bacalar.monthly_cost_usd"] },
    { title: "Fancy hotel", detail: "The Fancy Hotel costs $340 a night.", claim_type: "cost", source_refs: [] },
  ] }],
};
// NOTE: badDay's second item would fail planner normalization (factual claim
// with no source/flag) — so for retry/drop tests the planner fake returns a
// sourced-but-wrong claim instead:
const wrongDay = {
  days: [{ date: "2026-11-09", items: [
    { title: "Monthly cost baseline", detail: "About $1100 a month all-in.", claim_type: "cost", source_refs: ["cities.bacalar.monthly_cost_usd"] },
    { title: "Sailboat tour", detail: "The sunset sailboat tour costs $99 per person.", claim_type: "cost", source_refs: ["cities.bacalar.experiences[0].price_usd"] },
    { title: "Settle in", detail: "Slow first day.", claim_type: "general", source_refs: [] },
  ] }],
};

function verdictsFor(plan, unsupportedIds = [], unverifiableIds = []) {
  const verdicts = plan.days.flatMap((d) => d.items).map((i) => ({
    item_id: i.id,
    verdict: unsupportedIds.includes(i.id) ? "unsupported" : unverifiableIds.includes(i.id) ? "unverifiable" : "supported",
    note: "fake verdict",
  }));
  return { verdicts };
}

function fakeTransport(script) {
  // script: { planner: [responses...], verifier: [responses or Errors...] }
  const p = [...script.planner], v = [...script.verifier];
  return async ({ baseUrl, user }) => {
    const isPlanner = baseUrl.includes("planner");
    const next = isPlanner ? p.shift() : v.shift();
    if (next instanceof Error) throw next;
    if (typeof next === "function") return next(user);
    return next;
  };
}

let passed = 0;
async function test(name, fn) {
  await fn();
  passed += 1;
  console.log(`ok — ${name}`);
}

// 1. Happy path: everything supported → published, nothing dropped.
await test("happy path publishes", async () => {
  const callModel = fakeTransport({
    planner: [goodDay],
    verifier: [(user) => verdictsFor(JSON.parse(user.match(/DRAFT PLAN:\n([\s\S]*?)\n\nCITY RECORD/)[1]))],
  });
  const plan = await runPipeline({ callModel, config, intake, city, country });
  assert.equal(plan.state, "published");
  assert.equal(plan.verifier_summary.unsupported, 0);
  assert.equal(plan.dropped.length, 0);
});

// 2. Retry path: verifier flags the wrong price, planner fixes it.
await test("one retry fixes an unsupported claim", async () => {
  const callModel = fakeTransport({
    planner: [wrongDay, goodDay],
    verifier: [
      (user) => { const plan = JSON.parse(user.match(/DRAFT PLAN:\n([\s\S]*?)\n\nCITY RECORD/)[1]); return verdictsFor(plan, [plan.days[0].items[1].id]); },
      (user) => verdictsFor(JSON.parse(user.match(/DRAFT PLAN:\n([\s\S]*?)\n\nCITY RECORD/)[1])),
    ],
  });
  const plan = await runPipeline({ callModel, config, intake, city, country });
  assert.equal(plan.state, "published");
  assert.equal(plan.dropped.length, 0);
  assert.ok(plan.log.some((l) => l.event === "retrying"));
});

// 3. Drop path: still wrong after retry → item dropped + logged, plan publishes.
await test("still-unsupported item is dropped and logged", async () => {
  const flagWrong = (user) => { const plan = JSON.parse(user.match(/DRAFT PLAN:\n([\s\S]*?)\n\nCITY RECORD/)[1]); return verdictsFor(plan, [plan.days[0].items[1].id]); };
  const callModel = fakeTransport({ planner: [wrongDay, wrongDay], verifier: [flagWrong, flagWrong] });
  const plan = await runPipeline({ callModel, config, intake, city, country });
  assert.equal(plan.state, "published");
  assert.equal(plan.dropped.length, 1);
  assert.equal(plan.dropped[0].title, "Sailboat tour");
});

// 4. Gutted day → held, never published.
await test("dropping that would empty a day holds the plan", async () => {
  const oneItem = { days: [{ date: "2026-11-09", items: [
    { title: "Sailboat tour", detail: "The sunset sailboat tour costs $99 per person.", claim_type: "cost", source_refs: ["cities.bacalar.experiences[0].price_usd"] },
  ] }] };
  const flagAll = (user) => { const plan = JSON.parse(user.match(/DRAFT PLAN:\n([\s\S]*?)\n\nCITY RECORD/)[1]); return verdictsFor(plan, plan.days[0].items.map((i) => i.id)); };
  const callModel = fakeTransport({ planner: [oneItem, oneItem], verifier: [flagAll, flagAll] });
  const plan = await runPipeline({ callModel, config, intake, city, country });
  assert.equal(plan.state, "held");
  assert.equal(plan.held_reason, "gutted_by_drops");
});

// 5. Verifier outage → held, never published unchecked.
await test("verifier outage holds the plan", async () => {
  const callModel = fakeTransport({
    planner: [goodDay],
    verifier: [new ModelUnavailableError("baseten down")],
  });
  const plan = await runPipeline({ callModel, config, intake, city, country });
  assert.equal(plan.state, "held");
  assert.equal(plan.held_reason, "verifier_unavailable");
});

// 6. Proof-test shape: verifier flags an injected invented item.
await test("verifier flags an injected invented claim", async () => {
  const plan = { days: [{ date: "2026-11-09", items: [
    { id: "2026-11-09-i1", title: "Monthly cost baseline", detail: "About $1100.", claim_type: "cost", source_refs: ["cities.bacalar.monthly_cost_usd"] },
    { id: "injected-fake-1", title: "Lagoonfront Luxury Resort & Spa", detail: "$340 per night.", claim_type: "cost", source_refs: [] },
  ] }] };
  const callModel = async () => ({ verdicts: [
    { item_id: "2026-11-09-i1", verdict: "supported", note: "matches record" },
    { item_id: "injected-fake-1", verdict: "unsupported", note: "no such hotel or price in the record" },
  ] });
  const result = await runVerifier(callModel, config, plan, city, country);
  assert.equal(result.summary.unsupported, 1);
  assert.equal(result.verdicts.find((v) => v.item_id === "injected-fake-1").verdict, "unsupported");
});

console.log(`\n${passed} pipeline tests passed`);
