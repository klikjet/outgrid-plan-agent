// Planner STUB (build step 4) — deterministic, NO API calls.
// Stands in for the Muse Spark Planner (builder spec §3) so the intake,
// data loading, and output contract can be exercised end to end today.
// The real Planner (Meta Model API) replaces buildStubPlan in step 5.
//
// Contract honoured here, identical to the real Planner's:
// - Output is strict JSON: per day { date, items: [{ id, title, detail,
//   claim_type, source_refs[] }] }.
// - Every factual item carries source_refs to the exact record + field,
//   e.g. "cities.bacalar.experiences[0].price_usd".
// - claim_type in place|cost|transit|stay|fitness|cowork|food|general.
// - source_refs: [] is allowed ONLY for `general` items (no factual claim).
// - Nothing is invented: no hotel names, prices, transit times, or stay
//   rules beyond what the record holds. A field the record lacks
//   (Bacalar rent_usd is null) is emitted flagged `unverifiable: true`,
//   never estimated — the Verifier contract (spec §4) depends on this.
// - Visa/safety content is human-review-only: the country records are
//   marked "Not yet verified by Outgrid", so stay items are flagged
//   `unverifiable: true` here as they must be downstream.
import { getCity, getCountry } from "./records.js";

const PACE_ITEMS = { relaxed: 3, balanced: 4, packed: 6 };
const MAX_DAYS = 14;

function datesBetween(start, end) {
  const out = [];
  const d = new Date(`${start}T12:00:00Z`);
  const last = new Date(`${end}T12:00:00Z`);
  while (d <= last && out.length < MAX_DAYS) {
    out.push(d.toISOString().slice(0, 10));
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return out;
}

export function buildStubPlan(intake) {
  const city = getCity(intake.destination_id);
  const country = getCountry(city.country_id);
  const ref = (path) => [`cities.${city.id}.${path}`];
  const log = [];
  const days = [];
  const dates = datesBetween(intake.start_date, intake.end_date);
  const target = PACE_ITEMS[intake.pace] ?? PACE_ITEMS.balanced;
  let expIdx = 0;

  dates.forEach((date, dayIdx) => {
    const items = [];
    const add = (item) => items.push({ id: `${date}-i${items.length + 1}`, ...item });

    if (dayIdx === 0) {
      add({
        title: `Arrive and settle in ${city.name}`,
        detail: `Base yourself around ${city.neighbourhoods?.[0]?.name ?? city.name} for the first days.`,
        claim_type: "general",
        source_refs: [],
      });
      if (city.neighbourhoods?.length) {
        const n = city.neighbourhoods[0];
        add({
          title: `Get to know ${n.name}`,
          detail: n.about,
          claim_type: "place",
          source_refs: ref("neighbourhoods[0]"),
        });
      }
      add({
        title: "Monthly cost baseline",
        detail: `Outgrid's record puts a month in ${city.name} at about $${city.monthly_cost_usd} all-in. Pace your daily spend against that, inside your ${intake.budget_range} budget range.`,
        claim_type: "cost",
        source_refs: ref("monthly_cost_usd"),
      });
      if (city.rent_usd == null) {
        add({
          title: "Monthly rent — not in the source record",
          detail: `The ${city.name} record has no rent figure, so none is quoted. Treat rent as unverifiable until the record carries one — it is never estimated.`,
          claim_type: "cost",
          source_refs: [],
          unverifiable: true,
        });
      }
      add({
        title: "Stay rules snapshot",
        detail: `${country.name}: ${country.visa}. Duration on the record: ${country.visa_duration}. Flagged unverifiable — confirm with official sources before relying on it.`,
        claim_type: "stay",
        source_refs: [`countries.${country.id}.visa`, `countries.${country.id}.visa_duration`],
        unverifiable: true,
      });
    }

    if (intake.coworking_needs && city.coworking?.length && dayIdx % 2 === 0) {
      add({
        title: "Coworking block",
        detail: `Work from ${city.coworking[dayIdx % city.coworking.length]}. Recorded internet for ${city.name}: ${city.internet_mbps} Mbps.`,
        claim_type: "cowork",
        source_refs: [...ref("coworking"), ...ref("internet_mbps")],
      });
    }

    if (intake.fitness_needs && dayIdx % 2 === 1) {
      add({
        title: "Fitness — your routine, kept",
        detail: `Kept light and local: ${intake.fitness_needs}. No facility is named because the record lists none — nothing invented.`,
        claim_type: "general",
        source_refs: [],
      });
    }

    while (items.length < target && city.experiences?.length) {
      const exp = city.experiences[expIdx % city.experiences.length];
      const idx = expIdx % city.experiences.length;
      expIdx += 1;
      const price = Array.isArray(exp.price_usd)
        ? `$${exp.price_usd[0]}–$${exp.price_usd[1]}`
        : exp.price_usd != null
          ? `$${exp.price_usd}`
          : "price not in record";
      add({
        title: exp.name,
        detail: `${exp.duration ?? ""} · ${exp.category ?? "experience"} · ${price} (from the record).`,
        claim_type: exp.category === "food" ? "food" : "place",
        source_refs: ref(`experiences[${idx}]`),
      });
      if (expIdx > city.experiences.length * 2) break;
    }

    if (items.length === 0) {
      add({
        title: `A slow day in ${city.name}`,
        detail: `The record's vibe for ${city.name}: ${(city.vibe ?? []).join(", ") || "unhurried"}. Nothing scheduled — the data can't fill every day, and padding with inventions is not allowed.`,
        claim_type: "general",
        source_refs: [],
      });
    }

    days.push({ date, items });
  });

  log.push({
    event: "plan_created",
    by: "planner-stub",
    model: null,
    note: "Deterministic stub — no API call made. Real Planner: Muse Spark via Meta Model API (step 5).",
    timestamp: new Date().toISOString(),
  });
  if (dates.length === MAX_DAYS && intake.end_date > dates[dates.length - 1]) {
    log.push({ event: "days_capped", note: `Stub caps plans at ${MAX_DAYS} days.` });
  }

  return {
    plan_id: `stub-${city.id}-${intake.start_date}`,
    destination_id: city.id,
    state: "draft",
    generated_by: "planner-stub",
    days,
    log,
  };
}
