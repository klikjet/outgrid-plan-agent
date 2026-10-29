// The Verifier (builder spec §4) — Muse Spark Open via Baseten
// (live model id meta-models/muse-spark-open). Checks the Planner's
// draft claim-by-claim against the same source records.
import { ModelResponseError } from "./model-client.js";

export const VERIFIER_SYSTEM = `You are the Verifier for Outgrid Plan Agent. You check a draft travel plan against the source records, claim by claim. You are strict: your job is to catch anything the data does not back up.

For every item in the plan, return one verdict:
- "supported" — the cited source field actually contains the claim (numbers, names, and facts match the record).
- "unsupported" — the claim contradicts the records or appears nowhere in them. An invented price, place name, or time is ALWAYS unsupported.
- "unverifiable" — the claim rests on a human-review-only field (visa/safety/stay rules) or on a field that is absent from the record.

Output STRICT JSON only, no prose outside it:
{"verdicts":[{"item_id":"...","verdict":"supported|unsupported|unverifiable","note":"one short line"}],"summary":{"checked":0,"supported":0,"unsupported":0,"unverifiable":0}}
The summary counts must match the verdicts.`;

export function verifierUserPrompt(plan, city, country) {
  return [
    `DRAFT PLAN:\n${JSON.stringify(plan, null, 1)}`,
    `CITY RECORD (cities.${city.id}):\n${JSON.stringify(city, null, 1)}`,
    `COUNTRY RECORD (countries.${country.id}):\n${JSON.stringify(country, null, 1)}`,
    `Check every item in the plan against these records.`,
  ].join("\n\n");
}

const VERDICTS = new Set(["supported", "unsupported", "unverifiable"]);

export function normalizeVerdicts(raw, plan) {
  if (!raw || !Array.isArray(raw.verdicts)) {
    throw new ModelResponseError("Verifier output has no verdicts array");
  }
  const knownIds = new Set(plan.days.flatMap((d) => d.items.map((i) => i.id)));
  const verdicts = [];
  for (const v of raw.verdicts) {
    if (!knownIds.has(v.item_id) || !VERDICTS.has(v.verdict)) continue;
    verdicts.push({ item_id: v.item_id, verdict: v.verdict, note: String(v.note ?? "") });
  }
  if (verdicts.length === 0) throw new ModelResponseError("Verifier returned no usable verdicts");
  // Account for every item: one the model skipped is flagged
  // "unverifiable" — it never passes by silence.
  const byId = new Map(verdicts.map((v) => [v.item_id, v]));
  const complete = plan.days.flatMap((d) => d.items).map((item) =>
    byId.get(item.id) ?? {
      item_id: item.id,
      verdict: "unverifiable",
      note: "The Verifier returned no verdict for this item, so it is flagged rather than passed silently.",
    }
  );
  const summary = { checked: complete.length, supported: 0, unsupported: 0, unverifiable: 0 };
  for (const v of complete) summary[v.verdict] += 1;
  return { verdicts: complete, summary };
}

export async function runVerifier(callModel, config, plan, city, country) {
  const raw = await callModel({
    baseUrl: config.basetenBaseUrl,
    apiKey: config.basetenApiKey,
    model: config.verifierModel,
    system: VERIFIER_SYSTEM,
    user: verifierUserPrompt(plan, city, country),
    timeoutMs: config.timeoutMs,
  });
  return normalizeVerdicts(raw, plan);
}
