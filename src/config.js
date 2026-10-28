// Server-side configuration. Keys come from the environment ONLY —
// never from code, never committed (this repo is public).
// Copy .env.example to .env on the server and fill in real values.

export function loadConfig(env = process.env) {
  return {
    metaApiKey: env.META_MODEL_API_KEY || "",
    basetenApiKey: env.BASETEN_API_KEY || "",
    metaBaseUrl: env.META_BASE_URL || "https://api.meta.ai/v1",
    basetenBaseUrl: env.BASETEN_BASE_URL || "https://inference.baseten.co/v1",
    plannerModel: env.PLANNER_MODEL || "muse-spark-1.3",
    verifierModel: env.VERIFIER_MODEL || "meta-models/muse-spark-open-1026",
    timeoutMs: Number(env.MODEL_TIMEOUT_MS || 90000),
  };
}

export function liveModelsReady(config) {
  return Boolean(config.metaApiKey && config.basetenApiKey);
}
