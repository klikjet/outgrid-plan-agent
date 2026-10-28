// Server-side configuration. Keys come from the environment ONLY —
// never from code, never committed (this repo is public).
// Copy .env.example to .env on the server and fill in real values.

export function loadConfig(env = process.env) {
  // Keys are pasted into dashboards by hand — strip stray whitespace and
  // line breaks so an invisible paste artifact can't break auth.
  const clean = (v) => (v || "").trim();
  return {
    metaApiKey: clean(env.META_MODEL_API_KEY),
    basetenApiKey: clean(env.BASETEN_API_KEY),
    metaBaseUrl: env.META_BASE_URL || "https://api.meta.ai/v1",
    basetenBaseUrl: env.BASETEN_BASE_URL || "https://inference.baseten.co/v1",
    plannerModel: env.PLANNER_MODEL || "muse-spark-1.3",
    // Baseten's live Model APIs slug (verified against Baseten's docs and
    // a live call on 2026-10-28). The hackathon guide's "-1026" suffix
    // 404s on the public endpoint; override with VERIFIER_MODEL if the
    // event provides a different route.
    verifierModel: env.VERIFIER_MODEL || "meta-models/muse-spark-open",
    timeoutMs: Number(env.MODEL_TIMEOUT_MS || 90000),
  };
}

export function liveModelsReady(config) {
  return Boolean(config.metaApiKey && config.basetenApiKey);
}
