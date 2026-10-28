// The Planner (builder spec §3) — Muse Spark via the Meta Model API.
// Drafts a day-by-day plan from the retrieved destination record ONLY.
import { ModelResponseError } from "./model-client.js";

export const PLANNER_SYSTEM = `You are the Planner for Outgrid Plan Agent. You write day-by-day travel plans using ONLY the destination record provided in the user message. Nothing else is a fact.

Hard rules:
- Never invent a hotel name, a price, a transit time, or a visa/stay rule.
- Every factual item must carry source_refs naming the exact record field it came from, formatted like "cities.bacalar.experiences[0].price_usd" or "countries.mexico.visa_duration".
- Items with no factual claim (pacing, sequencing, general tips) use claim_type "general" and source_refs [].
- claim_type is one of: place, cost, transit, stay, fitness, cowork, food, general.
- Visa/safety/stay content: the country record is not human-verified, so any stay item must include "unverifiable": true.
- If a field is absent from the record (for example rent_usd is null), never estimate it: either omit it, or include one item flagged "unverifiable": true that says the figure is not in the record.
- Stay within the traveler's budget range and pace. If the record cannot fill a day, put less in that day instead of padding with inventions.

Output STRICT JSON only, no prose outside it:
{"days":[{"date":"YYYY-MM-DD","items":[{"title":"...","detail":"...","claim_type":"...","source_refs":["..."],"unverifiable":true}]}]}
Include "unverifiable" only when it applies.`;

const CLAIM_TYPES = new Set(["place", "cost", "transit", "stay", "fitness", "cowork", "food", "general"]);

export function plannerUserPrompt(intake, city, country, flags = null) {
  const parts = [
    `TRAVELER INTAKE:\n${JSON.stringify(intake, null, 1)}`,
    `CITY RECORD (cities.${city.id}):\n${JSON.stringify(city, null, 1)}`,
    `COUNTRY RECORD (countries.${country.id}):\n${JSON.stringify(country, null, 1)}`,
    `Plan dates: ${intake.start_date} to ${intake.end_date}. Produce one entry per date.`,
  ];
  if (flags?.length) {
    parts.push(
      `A checker flagged these items in your previous draft as UNSUPPORTED. Rewrite the plan fixing ONLY those items: remove each flagged claim or re-ground it in the record. Do not change anything else.\n${JSON.stringify(flags, null, 1)}`
    );
  }
  return parts.join("\n\n");
}

// Assign stable ids and validate the contract shape.
export function normalizePlan(raw, intake) {
  if (!raw || !Array.isArray(raw.days) || raw.days.length === 0) {
    throw new ModelResponseError("Planner output has no days array");
  }
  const days = raw.days.map((day) => {
    if (!day.date || !Array.isArray(day.items)) {
      throw new ModelResponseError("Planner day is missing date or items");
    }
    const items = day.items.map((item, i) => {
      if (!item.title || !item.detail || !CLAIM_TYPES.has(item.claim_type)) {
        throw new ModelResponseError(`Planner item on ${day.date} breaks the contract (title/detail/claim_type)`);
      }
      const refs = Array.isArray(item.source_refs) ? item.source_refs.filter((r) => typeof r === "string") : [];
      if (item.claim_type !== "general" && refs.length === 0 && !item.unverifiable) {
        throw new ModelResponseError(`Planner item "${item.title}" is a factual claim with no source and no unverifiable flag`);
      }
      return {
        id: `${day.date}-i${i + 1}`,
        title: String(item.title),
        detail: String(item.detail),
        claim_type: item.claim_type,
        source_refs: refs,
        ...(item.unverifiable ? { unverifiable: true } : {}),
      };
    });
    return { date: day.date, items };
  });
  return {
    plan_id: `plan-${intake.destination_id}-${intake.start_date}`,
    destination_id: intake.destination_id,
    days,
  };
}

export async function runPlanner(callModel, config, intake, city, country, flags = null) {
  const raw = await callModel({
    baseUrl: config.metaBaseUrl,
    apiKey: config.metaApiKey,
    model: config.plannerModel,
    system: PLANNER_SYSTEM,
    user: plannerUserPrompt(intake, city, country, flags),
    timeoutMs: config.timeoutMs,
  });
  return normalizePlan(raw, intake);
}
