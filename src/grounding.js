// Deterministic grounding checks — plain code, no model involved.
//
// The Muse Spark Open Verifier judges claims against the records. This
// module adds the exact-number rule from the production grounding design:
// a dollar amount in a plan item must appear, exactly, in one of the
// source fields that item cites. A model can miss a changed digit; this
// check cannot. It only judges money amounts — names, wording, and all
// other claims remain the Verifier's job.

function tokenizeRef(ref) {
  const tokens = [];
  const re = /([^.[\]]+)|\[(\d+)\]/g;
  let m;
  while ((m = re.exec(ref)) !== null) tokens.push(m[2] !== undefined ? Number(m[2]) : m[1]);
  return tokens;
}

export function resolveSourceRef(ref, city, country) {
  if (typeof ref !== "string" || !ref) return { found: false, value: undefined };
  const root = {
    cities: { [city.id]: city },
    countries: { [country.id]: country },
  };
  let cur = root;
  for (const token of tokenizeRef(ref)) {
    if (cur == null || typeof cur !== "object" || !(token in cur)) {
      return { found: false, value: undefined };
    }
    cur = cur[token];
  }
  return { found: true, value: cur };
}

export function extractAmounts(text) {
  const out = [];
  const s = String(text ?? "");
  for (const m of s.matchAll(/\$\s*([0-9][0-9,]*(?:\.[0-9]{1,2})?)/g)) out.push(Number(m[1].replaceAll(",", "")));
  for (const m of s.matchAll(/\b([0-9][0-9,]*(?:\.[0-9]{1,2})?)\s*(?:USD|usd)\b/g)) out.push(Number(m[1].replaceAll(",", "")));
  return [...new Set(out.filter((n) => Number.isFinite(n)))];
}

function numbersInValue(value, out = new Set()) {
  if (typeof value === "number" && Number.isFinite(value)) out.add(value);
  else if (typeof value === "string") for (const n of extractAmounts(value)) out.add(n);
  else if (Array.isArray(value)) for (const v of value) numbersInValue(v, out);
  else if (value && typeof value === "object") for (const v of Object.values(value)) numbersInValue(v, out);
  return out;
}

const sameAmount = (a, b) => Math.abs(a - b) < 0.011;

export function auditPlanNumbers(plan, city, country) {
  const flags = new Map();
  for (const day of plan.days ?? []) {
    for (const item of day.items ?? []) {
      if (item.unverifiable || item.claim_type === "general") continue;
      const amounts = extractAmounts(`${item.title} ${item.detail}`);
      if (!amounts.length) continue;
      const refs = Array.isArray(item.source_refs) ? item.source_refs : [];
      if (!refs.length) {
        flags.set(item.id, {
          item_id: item.id,
          verdict: "unsupported",
          note: `Exact-number check: the item states ${amounts.map((n) => `$${n}`).join(", ")} but cites no source field.`,
          source: "exact_number_check",
        });
        continue;
      }
      const citedNumbers = new Set();
      let unresolved = 0;
      for (const ref of refs) {
        const r = resolveSourceRef(ref, city, country);
        if (!r.found) unresolved += 1;
        else numbersInValue(r.value, citedNumbers);
      }
      const missing = amounts.filter((a) => ![...citedNumbers].some((b) => sameAmount(a, b)));
      if (missing.length) {
        flags.set(item.id, {
          item_id: item.id,
          verdict: "unsupported",
          note: `Exact-number check: ${missing.map((n) => `$${n}`).join(", ")} does not appear in the cited source field${refs.length === 1 ? "" : "s"}${unresolved ? ` (${unresolved} source reference could not be resolved)` : ""}.`,
          source: "exact_number_check",
        });
      }
    }
  }
  return flags;
}

// Merge the model verdicts with the exact-number audit. The audit can
// only add or strengthen an "unsupported" verdict — it never turns a
// flag into a pass. Any plan item the model returned no verdict for is
// accounted for as "unverifiable" instead of passing silently.
export function mergeVerification(verification, plan, auditFlags) {
  const byId = new Map((verification.verdicts ?? []).map((v) => [v.item_id, { ...v }]));
  for (const day of plan.days ?? []) {
    for (const item of day.items ?? []) {
      if (!byId.has(item.id)) {
        byId.set(item.id, {
          item_id: item.id,
          verdict: "unverifiable",
          note: "The Verifier returned no verdict for this item, so it is flagged rather than passed silently.",
          source: "coverage_check",
        });
      }
      const audit = auditFlags.get(item.id);
      if (audit && byId.get(item.id).verdict !== "unsupported") byId.set(item.id, audit);
      else if (audit) {
        const existing = byId.get(item.id);
        byId.set(item.id, { ...existing, note: `${existing.note} ${audit.note}`.trim(), source: "verifier+exact_number_check" });
      }
    }
  }
  const verdicts = [...byId.values()];
  const summary = { checked: verdicts.length, supported: 0, unsupported: 0, unverifiable: 0 };
  for (const v of verdicts) summary[v.verdict] += 1;
  return { verdicts, summary, audit_flags: [...auditFlags.values()] };
}
