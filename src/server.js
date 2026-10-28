// Zero-dependency web server for the browsable Plan Agent.
//   node src/server.js   →  http://localhost:3000
// Routes:
//   /                    browse the 16 sample destinations
//   /plan?destination=x  intake form
//   /plan/view?...       rendered plan (Planner stub for now —
//                        the real Planner + Verifier swap in behind
//                        the same pages in the next build steps)
import { createServer } from "node:http";
import { validateIntake } from "./intake.js";
import { buildStubPlan } from "./planner-stub.js";
import { getCity, getCountry } from "./records.js";
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
    if (url.pathname === "/search") {
      const nl = (url.searchParams.get("nl") || "").trim();
      if (!nl) return redirect(res, "/");
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
    res.writeHead(404, { "content-type": "text/plain" });
    res.end("Not found");
  } catch (err) {
    res.writeHead(500, { "content-type": "text/plain" });
    res.end(`Something went wrong: ${err.message}`);
  }
});

server.listen(PORT, () => {
  console.log(`Outgrid Plan Agent (preview) → http://localhost:${PORT}`);
});
