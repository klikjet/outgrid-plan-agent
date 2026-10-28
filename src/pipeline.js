// The pipeline (builder spec §1, §4, §5):
//   Intake → Planner → Verifier → one retry if anything is unsupported
//   → publish rule (the Verifier IS the gate).
//
// State machine per plan: draft → verifying → (retrying) → published,
// or → held. A plan may never skip verifying, and no transition is
// silent: every step is written to the plan's log with the model ids.
//
// Publish rule: a plan publishes only when verification completes with
// zero unsupported claims. Items still unsupported after the one retry
// are DROPPED and logged (auditable, never silent); if dropping guts a
// day (leaves it empty), the plan goes to held instead of publishing.
// If the Verifier cannot be reached, the plan goes to held — it never
// passes and never publishes unchecked (Fabrice, Oct 28: the only
// release from held-by-outage is his own manual verification).
import { runPlanner } from "./planner.js";
import { runVerifier } from "./verifier.js";
import { ModelUnavailableError } from "./model-client.js";

function stamp(log, config, event, extra = {}) {
  log.push({
    event,
    planner_model: config.plannerModel,
    verifier_model: config.verifierModel,
    timestamp: new Date().toISOString(),
    ...extra,
  });
}

function flagsFor(plan, verdicts) {
  const byId = new Map(plan.days.flatMap((d) => d.items.map((i) => [i.id, i])));
  return verdicts
    .filter((v) => v.verdict === "unsupported")
    .map((v) => ({ item_id: v.item_id, title: byId.get(v.item_id)?.title ?? "", note: v.note }));
}

export async function runPipeline({ callModel, config, intake, city, country }) {
  const log = [];
  let plan = await runPlanner(callModel, config, intake, city, country);
  plan.state = "draft";
  stamp(log, config, "plan_created", { by: config.plannerModel });
  plan.state = "verifying";

  let verification;
  try {
    verification = await runVerifier(callModel, config, plan, city, country);
  } catch (err) {
    if (err instanceof ModelUnavailableError) {
      plan.state = "held";
      plan.held_reason = "verifier_unavailable";
      stamp(log, config, "held", { reason: "verifier unavailable — plan NOT published unchecked", detail: err.message });
      plan.log = log;
      return plan;
    }
    throw err;
  }
  stamp(log, config, "verified", { summary: verification.summary });

  if (verification.summary.unsupported > 0) {
    const flags = flagsFor(plan, verification.verdicts);
    plan.state = "retrying";
    stamp(log, config, "retrying", { flagged: flags.map((f) => f.item_id) });
    plan = await runPlanner(callModel, config, intake, city, country, flags);
    plan.state = "verifying";
    try {
      verification = await runVerifier(callModel, config, plan, city, country);
    } catch (err) {
      if (err instanceof ModelUnavailableError) {
        plan.state = "held";
        plan.held_reason = "verifier_unavailable";
        stamp(log, config, "held", { reason: "verifier unavailable on re-check — plan NOT published unchecked", detail: err.message });
        plan.log = log;
        return plan;
      }
      throw err;
    }
    stamp(log, config, "verified_after_retry", { summary: verification.summary });
  }

  // Publish rule.
  const dropped = [];
  if (verification.summary.unsupported > 0) {
    const badIds = new Set(verification.verdicts.filter((v) => v.verdict === "unsupported").map((v) => v.item_id));
    const noteById = new Map(verification.verdicts.map((v) => [v.item_id, v.note]));
    for (const day of plan.days) {
      day.items = day.items.filter((item) => {
        if (badIds.has(item.id)) {
          dropped.push({ item_id: item.id, date: day.date, title: item.title, verdict: "unsupported", note: noteById.get(item.id) ?? "" });
          return false;
        }
        return true;
      });
    }
    stamp(log, config, "items_dropped", { dropped: dropped.map((d) => d.item_id) });
    if (plan.days.some((d) => d.items.length === 0)) {
      plan.state = "held";
      plan.held_reason = "gutted_by_drops";
      plan.dropped = dropped;
      plan.verifier_summary = verification.summary;
      stamp(log, config, "held", { reason: "dropping unsupported items would leave a day empty — plan held, never published gutted" });
      plan.log = log;
      return plan;
    }
  }

  // Mark unverifiable items visibly on the published plan.
  const unverifiableIds = new Set(verification.verdicts.filter((v) => v.verdict === "unverifiable").map((v) => v.item_id));
  for (const day of plan.days) {
    for (const item of day.items) {
      if (unverifiableIds.has(item.id)) item.unverifiable = true;
    }
  }

  plan.dropped = dropped;
  plan.verifier_summary = { ...verification.summary, dropped: dropped.length };
  plan.state = "published";
  stamp(log, config, "published", { summary: plan.verifier_summary });
  plan.log = log;
  return plan;
}
