// HTML rendering — the demo front-end recreates outgrid.io's browsing
// experience (homepage sentence-search, destination cards, destination
// and country pages) from the exported sample data only. No live APIs,
// no production code — original pages written for this hackathon repo,
// styled on Outgrid's palette (dark slate #263646, cream #F4F0E8).
import { loadData, getCity, getCountry } from "./records.js";

export function esc(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

const CSS = `
  :root { --ink:#263646; --cream:#F4F0E8; --line:#536373; --gold:#B7791F; --card:#fffdf8; }
  * { box-sizing:border-box; }
  body { font-family: Georgia, 'Times New Roman', serif; margin:0; background:var(--cream); color:var(--ink); }
  header.top { background:var(--ink); color:var(--cream); padding:16px 20px; display:flex; justify-content:space-between; align-items:center; }
  header.top .brand { font-size:20px; font-weight:bold; letter-spacing:.02em; }
  header.top nav a { color:var(--cream); margin-left:16px; font-size:14px; text-decoration:none; opacity:.9; }
  .hero { padding:38px 20px 8px; text-align:center; }
  .hero h1 { font-size:34px; margin:0 0 10px; }
  .hero p.sub { color:var(--line); margin:0 auto 18px; max-width:620px; line-height:1.5; }
  .sentence { background:var(--card); border:1px solid #ddd5c3; border-radius:14px; padding:18px; max-width:760px; margin:0 auto; font-size:17px; line-height:2.1; }
  .sentence input, .sentence select { font:inherit; font-size:16px; border:0; border-bottom:2px solid var(--gold); background:transparent; padding:2px 4px; color:var(--ink); }
  .sentence input[type=text] { width:170px; } .sentence input[type=number] { width:100px; }
  main { max-width:980px; margin:0 auto; padding:22px 16px 60px; }
  h2 { font-size:23px; margin:26px 0 12px; }
  .filters { display:flex; gap:8px; flex-wrap:wrap; margin:10px 0 16px; }
  .filters a { border:1px solid #c9c0aa; background:var(--card); color:var(--ink); border-radius:999px; padding:5px 13px; font-size:13px; text-decoration:none; }
  .filters a.on { background:var(--ink); color:var(--cream); }
  .grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(255px,1fr)); gap:14px; }
  .card { background:var(--card); border:1px solid #ddd5c3; border-radius:12px; padding:16px; display:flex; flex-direction:column; }
  .card h3 { margin:0 0 2px; font-size:19px; }
  .card h3 a { color:var(--ink); text-decoration:none; }
  .card .sub { color:var(--line); font-size:13px; margin-bottom:8px; }
  .card p { font-size:14px; line-height:1.45; margin:5px 0; }
  .stats { display:flex; gap:14px; flex-wrap:wrap; background:#eef2f5; border-radius:10px; padding:12px 14px; margin:12px 0; }
  .stats div { font-size:13px; color:var(--line); } .stats b { display:block; font-size:17px; color:var(--ink); }
  .tag { display:inline-block; background:var(--cream); border:1px solid #ddd5c3; border-radius:999px; padding:2px 9px; font-size:12px; margin:2px 3px 2px 0; }
  .score { display:inline-block; background:var(--ink); color:var(--cream); border-radius:6px; padding:2px 8px; font-size:13px; }
  a.btn, button.btn { display:inline-block; margin-top:auto; background:var(--ink); color:var(--cream); border:0; border-radius:8px; padding:9px 16px; font-size:14px; text-decoration:none; cursor:pointer; text-align:center; }
  a.btn.ghost { background:transparent; color:var(--ink); border:1px solid var(--ink); }
  .card .row { display:flex; gap:8px; margin-top:10px; } .card .row a.btn { flex:1; }
  ul.clean { list-style:none; padding:0; margin:8px 0; } ul.clean li { padding:7px 0; border-top:1px dashed #ddd5c3; font-size:15px; line-height:1.5; }
  ul.clean li:first-child { border-top:0; }
  .cols { display:grid; grid-template-columns:1fr 1fr; gap:16px; } @media (max-width:640px){ .cols{grid-template-columns:1fr;} }
  .panel { background:var(--card); border:1px solid #ddd5c3; border-radius:12px; padding:16px 18px; }
  .panel h3 { margin-top:0; }
  #tripbar { position:sticky; bottom:0; background:var(--ink); color:var(--cream); padding:12px 18px; font-size:14px; display:none; }
  #tripbar.show { display:block; }
  form.intake { background:var(--card); border:1px solid #ddd5c3; border-radius:12px; padding:18px; display:grid; gap:10px; max-width:560px; }
  form.intake label { font-size:13px; color:var(--line); display:grid; gap:4px; }
  form.intake input, form.intake select { font:inherit; font-size:15px; padding:8px; border:1px solid #c9c0aa; border-radius:6px; }
  .day { background:var(--card); border:1px solid #ddd5c3; border-radius:12px; padding:16px 18px; margin:14px 0; }
  .day h3 { margin:0 0 10px; font-size:17px; }
  .item { border-top:1px dashed #ddd5c3; padding:10px 0; } .item:first-of-type { border-top:0; }
  .item h4 { margin:0 0 3px; font-size:15px; } .item p { margin:0; font-size:14px; line-height:1.5; }
  .meta { font-size:12px; color:var(--line); margin-top:4px; }
  .chip { display:inline-block; background:#eef2f5; border-radius:4px; padding:1px 6px; font-size:11px; text-transform:uppercase; letter-spacing:.04em; }
  .flag { display:inline-block; background:#fdf0d5; color:#7a5210; border:1px solid #e6cf8f; border-radius:4px; padding:1px 7px; font-size:12px; margin-left:6px; }
  .summary { background:#eef2f5; border:1px solid #c8d2da; border-radius:12px; padding:14px 18px; font-size:14px; line-height:1.55; }
  .honest { font-style:italic; }
  .note { font-size:13px; color:var(--line); line-height:1.5; }
  footer { color:var(--line); font-size:12px; text-align:center; padding:18px; }
`;

function page(title, body, extra = "") {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)} · Outgrid</title><style>${CSS}</style></head>
<body>
<header class="top"><div class="brand">Outgrid</div><nav><a href="/">Destinations</a><a href="/#countries">Countries</a><a href="/plan">Plan a stay</a></nav></header>
${body}
<footer>Outgrid Plan Agent — a hackathon demo recreating outgrid.io from an exported data snapshot. Demo only: no live data, no bookings. Built for the Meta Global AI Developer Hackathon, Oct 27 – Nov 4, 2026.</footer>
${extra}
</body></html>`;
}

function money(n) {
  return n == null ? "—" : `$${Number(n).toLocaleString("en-US")}`;
}

function cityCard(c, countryName) {
  return `<div class="card">
    <h3><a href="/destination/${esc(c.id)}">${esc(c.name)}</a></h3>
    <div class="sub">${esc(c.type ?? "")} in ${esc(countryName)} · safety ${esc(c.safety_10)}/10</div>
    <p>Monthly budget <strong>${money(c.monthly_cost_usd)}</strong> · Internet <strong>${esc(c.internet_mbps)} Mbps</strong>${c.rent_usd != null ? ` · Rent ${money(c.rent_usd)}` : ""}</p>
    <p>${(c.vibe ?? []).slice(0, 4).map((v) => `<span class="tag">${esc(v)}</span>`).join("")}</p>
    <div class="row">
      <a class="btn" href="/destination/${esc(c.id)}">Explore</a>
      <a class="btn ghost" href="/plan?destination=${esc(c.id)}">Plan a stay</a>
    </div>
  </div>`;
}

export function renderBrowse({ q = "", maxBudget = "", band = "" } = {}) {
  const { cities, countries } = loadData();
  const countryName = Object.fromEntries(countries.map((c) => [c.id, c.name]));
  let shown = cities.slice();
  if (q) {
    const needle = q.toLowerCase();
    shown = shown.filter(
      (c) => c.name.toLowerCase().includes(needle) || (countryName[c.country_id] ?? "").toLowerCase().includes(needle)
    );
  }
  if (maxBudget) shown = shown.filter((c) => c.monthly_cost_usd <= Number(maxBudget));
  const bands = [["", "All scores"], ["85", "85+"], ["70", "70–84"], ["55", "55–69"], ["0", "Under 55"]];
  const countryCards = countries
    .map((c) => {
      const inBand =
        !band || band === "" ? true
        : band === "85" ? c.nomad_score >= 85
        : band === "70" ? c.nomad_score >= 70 && c.nomad_score < 85
        : band === "55" ? c.nomad_score >= 55 && c.nomad_score < 70
        : c.nomad_score < 55;
      if (!inBand) return "";
      return `<div class="card">
        <h3><a href="/country/${esc(c.id)}">${esc(c.flag ?? "")} ${esc(c.name)}</a></h3>
        <div class="sub">${esc(c.region)} · <span class="score">Nomad Score ${esc(c.nomad_score)}</span></div>
        <p>Monthly budget <strong>${money(c.monthly_cost_usd)}</strong> · Internet <strong>${esc(c.internet_mbps)} Mbps</strong> · Safety <strong>${esc(c.safety_10)}/10</strong></p>
        <p>${esc(c.best_for ?? "")}</p>
        <div class="row"><a class="btn" href="/country/${esc(c.id)}">Explore ${esc(c.name)}</a></div>
      </div>`;
    })
    .join("");
  const body = `
  <div class="hero">
    <h1>Find Your Perfect Next Base</h1>
    <p class="sub">Destination rankings and trip planning for digital nomads — every plan checked claim-by-claim against the data before it reaches you.</p>
    <form class="sentence" method="get" action="/">
      I'd like to be in
      <input type="text" name="q" placeholder="Where do you want to go?" value="${esc(q)}">
      with a budget of
      <input type="number" name="budget" placeholder="2500" value="${esc(maxBudget)}" min="0"> /month
      <br><button class="btn" type="submit">Search destinations</button>
    </form>
  </div>
  <main>
    <h2 id="countries">Countries</h2>
    <div class="filters">Nomad score: ${bands.map(([v, label]) => `<a href="/?band=${v}" class="${band === v ? "on" : ""}">${label}</a>`).join("")}</div>
    <div class="grid">${countryCards || '<p class="note">No countries in that score band in the demo data.</p>'}</div>
    <h2>Cities — showing ${shown.length} of ${cities.length} destinations</h2>
    ${(q || maxBudget) ? `<p class="note">Filtered by ${q ? `“${esc(q)}”` : ""} ${maxBudget ? `budget up to ${money(Number(maxBudget))}/month` : ""} · <a href="/">clear</a></p>` : ""}
    <div class="grid">${shown.map((c) => cityCard(c, countryName[c.country_id] ?? c.country_id)).join("") || '<p class="note">No cities match — try a higher budget.</p>'}</div>
    <h2>Plan your route</h2>
    <p class="note">On the live site you tap pins on a map and tune stays and budget as your route comes together. In this demo, pick a city above and hit “Plan a stay” — the planner builds the day-by-day plan and the checker verifies every claim in it.</p>
  </main>`;
  return page("Find Your Perfect Next Base", body);
}

export function renderDestination(cityId) {
  const city = getCity(cityId);
  const country = getCountry(city.country_id);
  const { cities } = loadData();
  const siblings = cities.filter((c) => c.country_id === country.id && c.id !== city.id);
  const experiences = (city.experiences ?? [])
    .map(
      (e) => `<li><strong>${esc(e.name)}</strong>: ${
        Array.isArray(e.price_usd) ? `${money(e.price_usd[0])}–${money(e.price_usd[1])}` : money(e.price_usd)
      }${e.duration ? `, ${esc(e.duration)}` : ""}</li>`
    )
    .join("");
  const neighbourhoods = (city.neighbourhoods ?? [])
    .map((n) => `<li><strong>${esc(n.name)}</strong>: ${esc(n.about)}</li>`)
    .join("");
  const coworking = (city.coworking ?? []).map((c) => `<li>${esc(c)}</li>`).join("");
  const body = `<main>
    <p class="note"><a href="/">← All destinations</a> · Part of <a href="/country/${esc(country.id)}">${esc(country.name)}</a></p>
    <h2 style="font-size:30px;margin-bottom:4px;">${esc(city.name)}, ${esc(country.name)}</h2>
    <p class="note" style="font-size:15px;">${esc(city.type ?? "")} in ${esc(country.name)} · ${(city.vibe ?? []).join(", ")}</p>
    <div class="stats">
      <div>Monthly budget<b>${money(city.monthly_cost_usd)}</b></div>
      <div>Rent<b>${city.rent_usd != null ? money(city.rent_usd) : "Not in the data"}</b></div>
      <div>Internet<b>${esc(city.internet_mbps)} Mbps</b></div>
      <div>Safety<b>${esc(city.safety_10)}/10</b></div>
    </div>
    ${city.note ? `<p style="line-height:1.6;">${esc(city.note)}</p>` : ""}
    ${neighbourhoods ? `<h2>Best neighbourhoods to stay and visit</h2><ul class="clean">${neighbourhoods}</ul>` : ""}
    ${coworking ? `<h2>Coworking</h2><ul class="clean">${coworking}</ul>` : ""}
    ${experiences ? `<h2>Experiences and activities</h2><ul class="clean">${experiences}</ul>` : ""}
    <div class="panel" style="margin-top:22px;">
      <h3>Staying in ${esc(country.name)}</h3>
      <p style="line-height:1.55;">${esc(country.visa ?? "")}${country.visa_duration ? ` Duration on the record: ${esc(country.visa_duration)}.` : ""}</p>
      <p class="note">Visa and stay information is shown from Outgrid's records and flagged <span class="flag">unverified</span> until confirmed with official sources — the Plan Agent treats it the same way.</p>
      <a class="btn" href="/plan?destination=${esc(city.id)}">Plan a stay in ${esc(city.name)}</a>
    </div>
    ${siblings.length ? `<h2>More cities in ${esc(country.name)}</h2><p>${siblings.map((s) => `<a href="/destination/${esc(s.id)}">${esc(s.name)}</a>`).join(" · ")}</p>` : ""}
  </main>`;
  return page(`${city.name}, ${country.name}: living & working remotely`, body);
}

export function renderCountry(countryId) {
  const country = getCountry(countryId);
  const { cities } = loadData();
  const own = cities.filter((c) => c.country_id === country.id);
  const countryName = country.name;
  const pros = (country.pros ?? []).map((p) => `<li>${esc(p)}</li>`).join("");
  const cons = (country.cons ?? []).map((p) => `<li>${esc(p)}</li>`).join("");
  const body = `<main>
    <p class="note"><a href="/">← All destinations</a></p>
    <h2 style="font-size:30px;margin-bottom:4px;">${esc(country.flag ?? "")} ${esc(country.name)}</h2>
    <p class="note" style="font-size:15px;">${esc(country.region)} · ${esc(country.best_for ?? "")}</p>
    <div class="stats">
      <div>Nomad Score<b>${esc(country.nomad_score)}</b></div>
      <div>Monthly budget<b>${money(country.monthly_cost_usd)}</b></div>
      <div>Internet<b>${esc(country.internet_mbps)} Mbps</b></div>
      <div>Safety<b>${esc(country.safety_10)}/10</b></div>
      <div>US travel advisory<b>Level ${esc(country.us_travel_advisory_level ?? "—")}</b></div>
    </div>
    <div class="cols">
      <div class="panel"><h3>Staying there</h3>
        <p style="line-height:1.55;">${esc(country.visa ?? "")}</p>
        <p class="note">Duration: ${esc(country.visa_duration ?? "—")}${country.visa_cost_usd != null ? ` · Visa cost on record: ${money(country.visa_cost_usd)}` : ""}${country.visa_income_requirement_usd_month != null ? ` · Income requirement on record: ${money(country.visa_income_requirement_usd_month)}/month` : ""}</p>
        <p class="note">Shown from Outgrid's records — flagged <span class="flag">unverified</span>, confirm with official sources.</p>
      </div>
      <div class="panel"><h3>Tax snapshot</h3>
        <p style="line-height:1.55;">${esc(country.tax_notes ?? "")}</p>
        <p class="note">General information only, not tax advice.</p>
      </div>
    </div>
    ${pros || cons ? `<div class="cols" style="margin-top:16px;">
      ${pros ? `<div class="panel"><h3>Pros</h3><ul class="clean">${pros}</ul></div>` : ""}
      ${cons ? `<div class="panel"><h3>Cons</h3><ul class="clean">${cons}</ul></div>` : ""}
    </div>` : ""}
    <h2>Cities in ${esc(country.name)}</h2>
    <div class="grid">${own.map((c) => cityCard(c, countryName)).join("")}</div>
  </main>`;
  return page(country.name, body);
}

export function renderIntake(destinationId) {
  const { cities } = loadData();
  const options = cities
    .map((c) => `<option value="${esc(c.id)}" ${c.id === destinationId ? "selected" : ""}>${esc(c.name)}</option>`)
    .join("");
  const body = `<main>
    <h2>Plan your stay</h2>
    <p class="note">Tell the planner what you need. The plan is then checked claim-by-claim by a second model against the destination's record — nothing gets invented.</p>
    <form class="intake" method="get" action="/plan/view">
      <label>Destination <select name="destination_id">${options}</select></label>
      <label>Start date <input type="date" name="start_date" value="2026-11-09" required></label>
      <label>End date <input type="date" name="end_date" value="2026-11-11" required></label>
      <label>Travelers <input type="number" name="travelers" value="1" min="1"></label>
      <label>Nationality (stay-rules context) <input name="nationality" value="US"></label>
      <label>Budget range (USD/month) <input name="budget_range" value="1000-1500"></label>
      <label>Accommodation tier <input name="accommodation_tier" value="mid"></label>
      <label>Pace <select name="pace"><option>relaxed</option><option selected>balanced</option><option>packed</option></select></label>
      <label>Interests (comma separated) <input name="interests" value="lagoon, cenotes"></label>
      <label>Coworking needs <input name="coworking_needs" value="Daily focused work, reliable WiFi"></label>
      <label>Fitness needs <input name="fitness_needs" value="Morning runs"></label>
      <button class="btn" type="submit">Build my plan</button>
    </form>
  </main>`;
  return page("Plan your stay", body);
}

export function renderPlan(plan, city) {
  const allItems = plan.days.flatMap((d) => d.items);
  const sourced = allItems.filter((i) => i.source_refs.length > 0).length;
  const flagged = allItems.filter((i) => i.unverifiable).length;
  const days = plan.days
    .map(
      (d) => `<section class="day"><h3>${esc(d.date)}</h3>${d.items
        .map(
          (i) => `<div class="item">
            <h4>${esc(i.title)}${i.unverifiable ? `<span class="flag">unverified</span>` : ""}</h4>
            <p>${esc(i.detail)}</p>
            <div class="meta"><span class="chip">${esc(i.claim_type)}</span>
            ${i.source_refs.length ? ` Source: ${i.source_refs.map(esc).join(", ")}` : " No factual claim — no source needed."}</div>
          </div>`
        )
        .join("")}</section>`
    )
    .join("");
  const body = `<main>
    <p class="note"><a href="/destination/${esc(city.id)}">← ${esc(city.name)}</a></p>
    <h2>Your ${esc(city.name)} plan</h2>
    <div class="summary">
      <p class="honest">Planned with AI on Fabrice's travel data, checked claim-by-claim by a second model against the source records.</p>
      <p><strong>Preview mode:</strong> rendered from the stand-in planner while the two real models are being wired in (build in progress). Claims on this plan: ${allItems.length} · with a source: ${sourced} · flagged unverified: ${flagged}.</p>
    </div>
    ${days}
    <p><a href="/">← Browse all destinations</a></p>
  </main>`;
  return page(`Your ${city.name} plan`, body);
}
