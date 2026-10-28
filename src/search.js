// Search + filters for the demo browse experience.
//
// Two layers, kept honest on purpose:
// 1. Classic filters (this file, deterministic): text, budget, score
//    band, type, sort — the same mechanics as outgrid.io's browse.
// 2. Natural-language search (interpretQuery): Muse Spark reads a
//    plain-words request ("quiet beach under $1,200 with fast wifi")
//    and translates it into those same filters as strict JSON. The
//    MODEL NEVER PICKS DESTINATIONS — the records do. The results page
//    shows the interpreted filters as chips, so anyone can see exactly
//    what the model heard.
import { loadData } from "./records.js";
import { ModelResponseError } from "./model-client.js";

export function vocabulary() {
  const { cities, countries } = loadData();
  return {
    types: [...new Set(cities.map((c) => c.type).filter(Boolean))],
    vibes: [...new Set(cities.flatMap((c) => c.vibe ?? []))],
    countries: countries.map((c) => ({ id: c.id, name: c.name, region: c.region })),
    regions: [...new Set(countries.map((c) => c.region))],
  };
}

const SORTS = new Set(["recommended", "cost_low", "safety", "internet", "score"]);

export function applyBrowse({ q = "", maxBudget = "", band = "", type = "", sort = "recommended" } = {}) {
  const { cities, countries } = loadData();
  const byId = Object.fromEntries(countries.map((c) => [c.id, c]));
  let shownCities = cities.slice();
  let shownCountries = countries.slice();
  if (q) {
    const needle = q.toLowerCase();
    shownCities = shownCities.filter(
      (c) => c.name.toLowerCase().includes(needle) || (byId[c.country_id]?.name ?? "").toLowerCase().includes(needle)
    );
    shownCountries = shownCountries.filter((c) => c.name.toLowerCase().includes(needle));
  }
  if (maxBudget) shownCities = shownCities.filter((c) => c.monthly_cost_usd <= Number(maxBudget));
  if (type) shownCities = shownCities.filter((c) => c.type === type);
  if (band !== "" && band != null) {
    const inBand = (s) =>
      band === "85" ? s >= 85 : band === "70" ? s >= 70 && s < 85 : band === "55" ? s >= 55 && s < 70 : s < 55;
    shownCountries = shownCountries.filter((c) => inBand(c.nomad_score));
  }
  const s = SORTS.has(sort) ? sort : "recommended";
  const cityKey = {
    cost_low: (a, b) => a.monthly_cost_usd - b.monthly_cost_usd,
    safety: (a, b) => b.safety_10 - a.safety_10,
    internet: (a, b) => b.internet_mbps - a.internet_mbps,
    score: (a, b) => (byId[b.country_id]?.nomad_score ?? 0) - (byId[a.country_id]?.nomad_score ?? 0),
  }[s];
  if (cityKey) shownCities.sort(cityKey);
  const countryKey = {
    cost_low: (a, b) => a.monthly_cost_usd - b.monthly_cost_usd,
    safety: (a, b) => b.safety_10 - a.safety_10,
    internet: (a, b) => b.internet_mbps - a.internet_mbps,
    score: (a, b) => b.nomad_score - a.nomad_score,
  }[s];
  if (countryKey) shownCountries.sort(countryKey);
  return { cities: shownCities, countries: shownCountries, countryById: byId };
}

export const INTERPRET_SYSTEM = `You translate a traveler's plain-words request into search filters for a destination database. You never name destinations yourself — you only output filters, and the database does the matching.

Output STRICT JSON only:
{"max_monthly_cost_usd": number|null, "min_internet_mbps": number|null, "min_safety_10": number|null, "types": [], "vibes": [], "country_ids": [], "regions": [], "sort": "recommended|cost_low|safety|internet|score"}

Rules:
- Use only types, vibes, country ids and regions from the vocabulary provided. Anything else: leave the list empty.
- Numbers only when the request implies them ("under $1,500" → max_monthly_cost_usd 1500; "fast wifi" → min_internet_mbps 50; "somewhere safe" → min_safety_10 7).
- sort: "cost_low" when they emphasize cheap/budget, "internet" for work-critical wifi, "safety" for safety-first, otherwise "recommended".
- If the request mentions a place by name, map it to country_ids when it is a country in the vocabulary; city names cannot be filters, so ignore them.`;

export async function interpretQuery(callModel, config, query) {
  const vocab = vocabulary();
  const raw = await callModel({
    baseUrl: config.metaBaseUrl,
    apiKey: config.metaApiKey,
    model: config.plannerModel,
    system: INTERPRET_SYSTEM,
    user: `VOCABULARY:\n${JSON.stringify(vocab)}\n\nREQUEST: ${query}`,
    timeoutMs: config.timeoutMs,
  });
  if (!raw || typeof raw !== "object") throw new ModelResponseError("Interpreter returned no filters");
  const num = (v, lo, hi) => (typeof v === "number" && v >= lo && v <= hi ? v : null);
  const pick = (list, allowed) =>
    Array.isArray(list) ? list.filter((x) => allowed.includes(x)) : [];
  return {
    max_monthly_cost_usd: num(raw.max_monthly_cost_usd, 100, 20000),
    min_internet_mbps: num(raw.min_internet_mbps, 1, 1000),
    min_safety_10: num(raw.min_safety_10, 1, 10),
    types: pick(raw.types, vocab.types),
    vibes: pick(raw.vibes, vocab.vibes),
    country_ids: pick(raw.country_ids, vocab.countries.map((c) => c.id)),
    regions: pick(raw.regions, vocab.regions),
    sort: SORTS.has(raw.sort) ? raw.sort : "recommended",
  };
}

export function applyInterpreted(filters) {
  const { cities, countries } = loadData();
  const byId = Object.fromEntries(countries.map((c) => [c.id, c]));
  const run = (f) => {
    let shown = cities.slice();
    if (f.max_monthly_cost_usd) shown = shown.filter((c) => c.monthly_cost_usd <= f.max_monthly_cost_usd);
    if (f.min_internet_mbps) shown = shown.filter((c) => c.internet_mbps >= f.min_internet_mbps);
    if (f.min_safety_10) shown = shown.filter((c) => c.safety_10 >= f.min_safety_10);
    if (f.types.length) shown = shown.filter((c) => f.types.includes(c.type));
    if (f.vibes.length) shown = shown.filter((c) => (c.vibe ?? []).some((v) => f.vibes.includes(v)));
    if (f.country_ids.length) shown = shown.filter((c) => f.country_ids.includes(c.country_id));
    if (f.regions.length) shown = shown.filter((c) => f.regions.includes(byId[c.country_id]?.region));
    return shown;
  };
  // Strict first. If nothing matches everything, loosen the INFERRED
  // thresholds (internet, then safety, then type) one step at a time and
  // say what was loosened — an explicit budget number is never loosened.
  const relaxed = [];
  let f = { ...filters };
  let shown = run(f);
  if (shown.length === 0 && f.min_safety_10) {
    f = { ...f, min_safety_10: null };
    relaxed.push("the safety bar");
    shown = run(f);
  }
  if (shown.length === 0 && f.min_internet_mbps) {
    for (const step of [35, 25, null]) {
      f = { ...f, min_internet_mbps: step };
      shown = run(f);
      if (shown.length) {
        relaxed.push(step ? `internet to ${step}+ Mbps` : "the internet bar");
        break;
      }
    }
  }
  if (shown.length === 0 && f.types.length) {
    f = { ...f, types: [] };
    relaxed.push("the place type");
    shown = run(f);
  }
  const key = {
    cost_low: (a, b) => a.monthly_cost_usd - b.monthly_cost_usd,
    safety: (a, b) => b.safety_10 - a.safety_10,
    internet: (a, b) => b.internet_mbps - a.internet_mbps,
    score: (a, b) => (byId[b.country_id]?.nomad_score ?? 0) - (byId[a.country_id]?.nomad_score ?? 0),
  }[filters.sort];
  if (key) shown.sort(key);
  // Report only the loosenings the final results actually needed:
  // restoring a loosened bar must empty the result set for it to count.
  const needed = [];
  if (relaxed.length && shown.length) {
    if (filters.min_safety_10 && f.min_safety_10 == null && shown.every((c) => c.safety_10 < filters.min_safety_10)) needed.push("the safety bar");
    if (filters.min_internet_mbps && (f.min_internet_mbps == null || f.min_internet_mbps < filters.min_internet_mbps) && shown.every((c) => c.internet_mbps < filters.min_internet_mbps)) needed.push(`internet to ${f.min_internet_mbps ? `${f.min_internet_mbps}+ Mbps` : "any speed"}`);
    if (filters.types.length && f.types.length === 0) needed.push("the place type");
  }
  return { cities: shown, countryById: byId, relaxed: needed };
}

export function describeFilters(f) {
  const chips = [];
  if (f.max_monthly_cost_usd) chips.push(`Budget up to $${f.max_monthly_cost_usd.toLocaleString("en-US")}/month`);
  if (f.min_internet_mbps) chips.push(`Internet ${f.min_internet_mbps}+ Mbps`);
  if (f.min_safety_10) chips.push(`Safety ${f.min_safety_10}+/10`);
  for (const t of f.types ?? []) chips.push(`Type: ${t}`);
  for (const v of f.vibes ?? []) chips.push(`Vibe: ${v}`);
  for (const r of f.regions ?? []) chips.push(`Region: ${r}`);
  if (f.sort && f.sort !== "recommended") chips.push(`Sorted by ${f.sort.replace("_", " ")}`);
  return chips;
}

export function keywordFallback(q) {
  return applyBrowse({ q });
}
