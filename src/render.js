// HTML rendering for the browsable Plan Agent pages.
// Plain server-rendered pages — no framework, no build step.
import { loadData } from "./records.js";

export function esc(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

const CSS = `
  :root { --ink:#263646; --cream:#F4F0E8; --line:#536373; --accent:#B7791F; }
  * { box-sizing:border-box; }
  body { font-family: Georgia, 'Times New Roman', serif; margin:0; background:var(--cream); color:var(--ink); }
  header { background:var(--ink); color:var(--cream); padding:28px 20px; }
  header h1 { margin:0 0 6px; font-size:28px; }
  header p { margin:0; opacity:.85; max-width:640px; line-height:1.45; }
  main { max-width:920px; margin:0 auto; padding:24px 16px 60px; }
  .grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(250px,1fr)); gap:14px; }
  .card { background:#fff; border:1px solid #ddd5c3; border-radius:12px; padding:16px; }
  .card h3 { margin:0 0 4px; font-size:19px; }
  .card .sub { color:var(--line); font-size:13px; margin-bottom:8px; }
  .card p { font-size:14px; line-height:1.45; margin:6px 0; }
  .tag { display:inline-block; background:var(--cream); border:1px solid #ddd5c3; border-radius:999px; padding:2px 9px; font-size:12px; margin:2px 3px 2px 0; }
  a.btn, button.btn { display:inline-block; margin-top:10px; background:var(--ink); color:var(--cream); border:0; border-radius:8px; padding:9px 16px; font-size:14px; text-decoration:none; cursor:pointer; }
  form { background:#fff; border:1px solid #ddd5c3; border-radius:12px; padding:18px; display:grid; gap:10px; max-width:560px; }
  label { font-size:13px; color:var(--line); display:grid; gap:4px; }
  input, select { font:inherit; font-size:15px; padding:8px; border:1px solid #c9c0aa; border-radius:6px; }
  .day { background:#fff; border:1px solid #ddd5c3; border-radius:12px; padding:16px 18px; margin:14px 0; }
  .day h3 { margin:0 0 10px; font-size:17px; }
  .item { border-top:1px dashed #ddd5c3; padding:10px 0; }
  .item:first-of-type { border-top:0; }
  .item h4 { margin:0 0 3px; font-size:15px; }
  .item p { margin:0; font-size:14px; line-height:1.5; }
  .meta { font-size:12px; color:var(--line); margin-top:4px; }
  .chip { display:inline-block; background:#eef2f5; border-radius:4px; padding:1px 6px; font-size:11px; text-transform:uppercase; letter-spacing:.04em; }
  .flag { display:inline-block; background:#fdf0d5; color:#7a5210; border:1px solid #e6cf8f; border-radius:4px; padding:1px 7px; font-size:12px; margin-left:6px; }
  .summary { background:#eef2f5; border:1px solid #c8d2da; border-radius:12px; padding:14px 18px; font-size:14px; line-height:1.55; }
  .honest { font-style:italic; }
  footer { color:var(--line); font-size:12px; text-align:center; padding:18px; }
`;

function page(title, body) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)} — Outgrid Plan Agent</title><style>${CSS}</style></head>
<body>
<header><h1>Outgrid Plan Agent</h1>
<p>Trip plans written by an AI planner, then checked claim-by-claim by a second AI against Outgrid's real destination data. If a price, a place, or a stay rule is not in the data, the plan does not get to invent it.</p></header>
<main>${body}</main>
<footer>Built for the Meta Global AI Developer Hackathon · Oct 27 – Nov 4, 2026</footer>
</body></html>`;
}

export function renderBrowse() {
  const { cities, countries } = loadData();
  const countryName = Object.fromEntries(countries.map((c) => [c.id, c.name]));
  const cards = cities
    .map(
      (c) => `<div class="card">
        <h3>${esc(c.name)}</h3>
        <div class="sub">${esc(countryName[c.country_id] ?? c.country_id)} · ${esc(c.type ?? "")}</div>
        <p>About <strong>$${esc(c.monthly_cost_usd)}</strong>/month all-in · ${esc(c.internet_mbps)} Mbps · safety ${esc(c.safety_10)}/10</p>
        <p>${(c.vibe ?? []).map((v) => `<span class="tag">${esc(v)}</span>`).join("")}</p>
        <a class="btn" href="/plan?destination=${esc(c.id)}">Plan a stay in ${esc(c.name)}</a>
      </div>`
    )
    .join("");
  return page(
    "Browse destinations",
    `<h2>Pick a destination</h2>
     <p>Every plan is built only from the destination's Outgrid record — the same data you see summarized on these cards.</p>
     <div class="grid">${cards}</div>`
  );
}

export function renderIntake(destinationId) {
  const { cities } = loadData();
  const options = cities
    .map((c) => `<option value="${esc(c.id)}" ${c.id === destinationId ? "selected" : ""}>${esc(c.name)}</option>`)
    .join("");
  return page(
    "Plan your stay",
    `<h2>Plan your stay</h2>
     <form method="get" action="/plan/view">
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
     </form>`
  );
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
  return page(
    `Your ${city.name} plan`,
    `<h2>Your ${esc(city.name)} plan</h2>
     <div class="summary">
       <p class="honest">Planned with AI on Fabrice's travel data, checked claim-by-claim by a second model against the source records.</p>
       <p><strong>Preview mode:</strong> this page is rendered from the stand-in planner while the two real models are being wired in (build in progress). Claims on this plan: ${allItems.length} · with a source: ${sourced} · flagged unverified: ${flagged}.</p>
     </div>
     ${days}
     <p><a href="/">← Browse all destinations</a></p>`
  );
}
