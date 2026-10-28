// CLI: node src/cli.js <intake.json>
// Validates the intake (spec §2), runs the Planner stub (spec §3),
// and prints the plan JSON to stdout. No API calls are made.
import { readFileSync } from "node:fs";
import { validateIntake } from "./intake.js";
import { buildStubPlan } from "./planner-stub.js";

const path = process.argv[2];
if (!path) {
  console.error("Usage: node src/cli.js <intake.json>");
  process.exit(2);
}

const intake = JSON.parse(readFileSync(path, "utf8"));
const { ok, errors } = validateIntake(intake);
if (!ok) {
  console.error("Invalid intake:", errors.join("; "));
  process.exit(1);
}

console.log(JSON.stringify(buildStubPlan(intake), null, 2));
