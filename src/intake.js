// Intake contract (builder spec §2). The approved Outgrid field set,
// trimmed for the demo. Account signup stays email + phone only —
// intake itself collects no names and no account data.

export const PACES = ["relaxed", "balanced", "packed"];

export const INTAKE_FIELDS = [
  "destination_id",     // must match a city id in the source records
  "start_date",         // YYYY-MM-DD
  "end_date",           // YYYY-MM-DD, >= start_date
  "travelers",          // integer >= 1
  "nationality",        // stay-days context only, never a fact source
  "budget_range",       // e.g. "1000-1500" (USD/month) or "mid"
  "accommodation_tier", // e.g. hostel | mid | comfort
  "pace",               // relaxed | balanced | packed
  "interests",          // string[]
  "coworking_needs",    // string, optional
  "fitness_needs",      // string, optional
  "dietary",            // string, optional
  "accessibility",      // string, optional
];

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function validateIntake(intake) {
  const errors = [];
  if (typeof intake !== "object" || intake === null) {
    return { ok: false, errors: ["intake must be a JSON object"] };
  }
  for (const field of ["destination_id", "start_date", "end_date", "travelers", "budget_range", "pace"]) {
    if (intake[field] === undefined || intake[field] === "") errors.push(`missing required field: ${field}`);
  }
  if (intake.start_date && !DATE_RE.test(intake.start_date)) errors.push("start_date must be YYYY-MM-DD");
  if (intake.end_date && !DATE_RE.test(intake.end_date)) errors.push("end_date must be YYYY-MM-DD");
  if (intake.start_date && intake.end_date && intake.end_date < intake.start_date) {
    errors.push("end_date must be on or after start_date");
  }
  if (intake.travelers !== undefined && (!Number.isInteger(intake.travelers) || intake.travelers < 1)) {
    errors.push("travelers must be an integer >= 1");
  }
  if (intake.pace && !PACES.includes(intake.pace)) {
    errors.push(`pace must be one of: ${PACES.join(", ")}`);
  }
  if (intake.interests !== undefined && !Array.isArray(intake.interests)) {
    errors.push("interests must be an array of strings");
  }
  return { ok: errors.length === 0, errors };
}
