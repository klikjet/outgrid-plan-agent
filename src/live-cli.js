// Live CLI — runs the REAL pipeline (Planner on Muse Spark via the
// Meta Model API, Verifier on Muse Spark Open via Baseten).
// Keys come from the environment (.env on the server, never committed).
//
//   node src/live-cli.js examples/intake-bacalar.json
//   node src/live-cli.js examples/intake-bacalar.json --inject-fake
//
// --inject-fake runs the PROOF TEST (spec §6): it takes the published
// plan, adds one invented claim (a hotel with a made-up price that is
// nowhere in the record), and asks the Verifier to check the doctored
// plan. The test passes only if the Verifier marks that item
// "unsupported". Output is written to eval/ as evidence, including the
// side-by-side Fabrice asked for: invented price vs the actual record.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { loadConfig, liveModelsReady } from "./config.js";
import { validateIntake } from "./intake.js";
import { getCity, getCountry } from "./records.js";
import { runPipeline } from "./pipeline.js";
import { runVerifier } from "./verifier.js";
import { callModelJson } from "./model-client.js";

const intakePath = process.argv[2];
const injectFake = process.argv.includes("--inject-fake");
if (!intakePath) {
  console.error("Usage: node src/live-cli.js <intake.json> [--inject-fake]");
  process.exit(2);
}

const config = loadConfig();
if (!liveModelsReady(config)) {
  console.error("Missing API keys: set META_MODEL_API_KEY and BASETEN_API_KEY in the environment (.env). The live pipeline cannot run without them.");
  process.exit(1);
}

const intake = JSON.parse(readFileSync(intakePath, "utf8"));
const { ok, errors } = validateIntake(intake);
if (!ok) {
  console.error("Invalid intake:", errors.join("; "));
  process.exit(1);
}

const city = getCity(intake.destination_id);
const country = getCountry(city.country_id);
const plan = await runPipeline({ callModel: callModelJson, config, intake, city, country });
console.log(JSON.stringify(plan, null, 2));

if (injectFake) {
  if (plan.state !== "published") {
    console.error(`Proof test needs a published plan; got state "${plan.state}".`);
    process.exit(1);
  }
  const FAKE = {
    id: "injected-fake-1",
    title: "Lagoonfront Luxury Resort & Spa",
    detail: "Stay at the Lagoonfront Luxury Resort & Spa — $340 per night, with a private dock and spa.",
    claim_type: "cost",
    source_refs: [],
  };
  const doctored = JSON.parse(JSON.stringify(plan));
  doctored.days[0].items.push(FAKE);
  const result = await runVerifier(callModelJson, config, doctored, city, country);
  const verdict = result.verdicts.find((v) => v.item_id === FAKE.id);
  const passed = verdict?.verdict === "unsupported";

  const evidence = {
    test: "verifier proof test — one invented claim injected into a published plan",
    injected_claim: { title: FAKE.title, detail: FAKE.detail },
    actual_record: {
      city: city.name,
      monthly_cost_usd: city.monthly_cost_usd,
      rent_usd: city.rent_usd,
      note: "The record contains no hotel named 'Lagoonfront Luxury Resort & Spa' and no $340/night price anywhere.",
    },
    verifier_model: config.verifierModel,
    verdict_for_injected_item: verdict ?? null,
    summary: result.summary,
    result: passed ? "PASS — the Verifier caught the invented claim" : "FAIL — the Verifier did not flag the invented claim",
    timestamp: new Date().toISOString(),
  };
  mkdirSync("eval", { recursive: true });
  writeFileSync("eval/proof-test-output.json", JSON.stringify(evidence, null, 2));
  writeFileSync(
    "eval/proof-test.md",
    `# Verifier proof test\n\nOne invented claim was added to a published ${city.name} plan:\n\n- **Invented:** "${FAKE.detail}"\n- **Actual record:** ${city.name} costs about $${city.monthly_cost_usd}/month all-in; the record names no such hotel and no $340/night price anywhere.\n- **Verifier (${config.verifierModel}) verdict on the invented item:** ${verdict ? `\`${verdict.verdict}\` — ${verdict.note}` : "no verdict returned"}\n- **Result:** ${evidence.result}\n- Run at: ${evidence.timestamp}\n`
  );
  console.error(`\nProof test: ${evidence.result} (evidence in eval/)`);
  if (!passed) process.exit(1);
}
