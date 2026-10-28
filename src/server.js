// Zero-dependency web server for the browsable Plan Agent.
//   node src/server.js   →  http://localhost:3000
// Routes:
//   /                    browse the 16 sample destinations
//   /plan?destination=x  intake form
//   /plan/view?...       rendered plan (Planner stub for now —
//                        the real Planner + Verifier swap in behind
//                        the same pages in the next build steps)
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { validateIntake } from "./intake.js";
import { buildStubPlan } from "./planner-stub.js";
import { getCity, getCountry, loadData } from "./records.js";
import { loadConfig, liveModelsReady } from "./config.js";
import { runPipeline } from "./pipeline.js";
import { callModelJson } from "./model-client.js";
import { renderBrowse, renderIntake, renderPlan, renderDestination, renderCountry, renderSearchResults, esc } from "./render.js";
import { interpretQuery, applyInterpreted, describeFilters, keywordFallback } from "./search.js";

const PORT = process.env.PORT || 3000;

function redirect(res, location) {
  res.writeHead(302, { location });
  res.end();
}

function send(res, html) {
  res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
  res.end(html);
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  try {
    if (url.pathname === "/") {
      return send(res, renderBrowse({
        q: url.searchParams.get("q") || "",
        maxBudget: url.searchParams.get("budget") || "",
        band: url.searchParams.get("band") || "",
        type: url.searchParams.get("type") || "",
        sort: url.searchParams.get("sort") || "recommended",
      }));
    }
    if (url.pathname.startsWith("/img/")) {
      // Card artwork (Muse Image, generated for this demo) — strict
      // filename whitelist, no path traversal.
      const name = url.pathname.slice("/img/".length);
      if (!/^[a-z0-9-]+\.jpg$/.test(name)) {
        res.writeHead(404, { "content-type": "text/plain" });
        return res.end("Not found");
      }
      try {
        const raw = await readFile(new URL(`../public/img/${name}`, import.meta.url));
        // The artwork files are stored in the repo as base64 text (the
        // GitHub push path used for this repo is text-only, so the JPEG
        // bytes were committed encoded). Decode to the real image bytes
        // before serving; pass through anything that is already binary.
        const head = raw.subarray(0, 4).toString("ascii");
        const buf = head.startsWith("/9j/")
          ? Buffer.from(raw.toString("ascii").trim(), "base64")
          : raw;
        res.writeHead(200, { "content-type": "image/jpeg", "cache-control": "public, max-age=86400", "content-length": buf.length });
        return res.end(buf);
      } catch {
        res.writeHead(404, { "content-type": "text/plain" });
        return res.end("Not found");
      }
    }
    if (url.pathname === "/search") {
      const nl = (url.searchParams.get("nl") || "").trim();
      if (!nl) return redirect(res, "/");
      // Exact place names never need the model: a city or country that
      // is in the data goes straight to its records.
      {
        const { cities: allCities, countries: allCountries } = loadData();
        const qn = nl.toLowerCase();
        const cityHit = allCities.find((c) => c.name.toLowerCase() === qn);
        const countryHit = allCountries.find((c) => c.name.toLowerCase() === qn || c.name.toLowerCase().replace(/\s*\(.*?\)\s*/g, "").trim() === qn);
        if (cityHit || countryHit) {
          const countryById = Object.fromEntries(allCountries.map((c) => [c.id, c]));
          const cities = cityHit ? [cityHit] : allCities.filter((c) => c.country_id === countryHit.id);
          const note = cityHit
            ? `${cityHit.name} is in the data — showing it directly, no guessing involved.`
            : `${countryHit.name} is in the data — showing all ${cities.length} of its cities on record.`;
          return send(res, renderSearchResults({ query: nl, chips: [], cities, countryById, aiUsed: false, note }));
        }
      }
      const config = loadConfig();
      if (liveModelsReady(config)) {
        try {
          // Muse Spark translates the words into filters; the records
          // do the matching. The page shows what the model heard.
          const filters = await interpretQuery(callModelJson, config, nl);
          const { cities, countryById, relaxed } = applyInterpreted(filters);
          return send(res, renderSearchResults({ query: nl, chips: describeFilters(filters), cities, countryById, aiUsed: true, relaxed }));
        } catch {
          const { cities, countryById } = keywordFallback(nl);
          return send(res, renderSearchResults({
            query: nl, chips: [], cities, countryById, aiUsed: false,
            note: "The AI search could not be reached just now, so this is a plain keyword match instead.",
          }));
        }
      }
      const { cities, countryById } = keywordFallback(nl);
      return send(res, renderSearchResults({
        query: nl, chips: [], cities, countryById, aiUsed: false,
        note: "AI search runs when this server has its Meta Model API key — for now this is a plain keyword match.",
      }));
    }
    if (url.pathname.startsWith("/destination/")) {
      return send(res, renderDestination(decodeURIComponent(url.pathname.slice("/destination/".length))));
    }
    if (url.pathname.startsWith("/country/")) {
      return send(res, renderCountry(decodeURIComponent(url.pathname.slice("/country/".length))));
    }
    if (url.pathname === "/plan") {
      return send(res, renderIntake(url.searchParams.get("destination") || "bacalar"));
    }
    if (url.pathname === "/plan/view") {
      const q = Object.fromEntries(url.searchParams);
      const intake = {
        destination_id: q.destination_id,
        start_date: q.start_date,
        end_date: q.end_date,
        travelers: Number(q.travelers || 1),
        nationality: q.nationality || "",
        budget_range: q.budget_range || "",
        accommodation_tier: q.accommodation_tier || "",
        pace: q.pace || "balanced",
        interests: (q.interests || "").split(",").map((s) => s.trim()).filter(Boolean),
        coworking_needs: q.coworking_needs || "",
        fitness_needs: q.fitness_needs || "",
      };
      const { ok, errors } = validateIntake(intake);
      if (!ok) {
        res.writeHead(400, { "content-type": "text/html; charset=utf-8" });
        return res.end(`<p>That plan request needs a fix: ${esc(errors.join("; "))}</p><p><a href="/plan">Back to the form</a></p>`);
      }
      const city = getCity(intake.destination_id);
      const config = loadConfig();
      if (liveModelsReady(config)) {
        // Real path: Planner (Muse Spark) → Verifier (Muse Spark Open)
        // → publish rule. A held plan renders with its held notice.
        const plan = await runPipeline({
          callModel: callModelJson,
          config,
          intake,
          city,
          country: getCountry(city.country_id),
        });
        return send(res, renderPlan(plan, city));
      }
      const plan = buildStubPlan(intake);
      return send(res, renderPlan(plan, city));
    }
    if (url.pathname === "/health/models") {
      // Diagnostic: ping each model provider with the server-side keys
      // and report per-provider status. Returns status and error text
      // only — never key material (length is reported to spot a
      // truncated or padded paste).
      const config = loadConfig();
      const ping = async (baseUrl, apiKey, model) => {
        if (!apiKey) return { ok: false, error: "no key configured", key_length: 0 };
        try {
          await callModelJson({
            baseUrl, apiKey, model,
            system: "You answer with JSON only.",
            user: 'Reply with exactly {"ok": true}',
            timeoutMs: 30000,
          });
          return { ok: true, key_length: apiKey.length };
        } catch (err) {
          return { ok: false, error: `${err.name}: ${err.message}`.slice(0, 300), key_length: apiKey.length };
        }
      };
      const probeModel = url.searchParams.get("model") || config.plannerModel;
      const [meta, baseten] = await Promise.all([
        ping(config.metaBaseUrl, config.metaApiKey, probeModel),
        ping(config.basetenBaseUrl, config.basetenApiKey, config.verifierModel),
      ]);
      // Also ask the Meta endpoint which models this key can actually
      // see from THIS network (the public catalog may name models
      // differently than the internal one). IDs only — no key material.
      let metaModels = null;
      if (config.metaApiKey) {
        try {
          const r = await fetch(`${config.metaBaseUrl}/models`, {
            headers: { authorization: `Bearer ${config.metaApiKey}` },
            signal: AbortSignal.timeout(30000),
          });
          if (r.ok) {
            const data = await r.json();
            metaModels = (data.data || []).map((m) => m.id).slice(0, 60);
          } else {
            metaModels = { error: `models list returned ${r.status}` };
          }
        } catch (err) {
          metaModels = { error: `models list unreachable: ${err.message}` };
        }
      }
      res.writeHead(200, { "content-type": "application/json" });
      return res.end(JSON.stringify({
        meta: { model: probeModel, ...meta, models_visible: metaModels,
          // Public docs say real Meta Model API keys start with "LLM_".
          // A yes/no on the documented format marker only — not key material.
          key_format_llm_prefix: config.metaApiKey.startsWith("LLM_") },
        baseten: { model: config.verifierModel, ...baseten },
      }, null, 2));
    }
    res.writeHead(404, { "content-type": "text/plain" });
    res.end("Not found");
  } catch (err) {
    res.writeHead(500, { "content-type": "text/plain" });
    res.end(`Something went wrong: ${err.message}`);
  }
});

server.listen(PORT, () => {
  console.log(`Outgrid Plan Agent (${liveModelsReady(loadConfig()) ? "live models" : "preview"}) → http://localhost:${PORT}`);
});
