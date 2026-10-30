# Outgrid Plan Agent

Verified AI trip planning for digital nomads — built for the **Meta Global AI
Developer Hackathon** (Startup track · **Build for Your World**), Oct 27 – Nov 4, 2026.

## What it does

Long-stay travel planning fails two ways: doing it yourself takes weeks of
scattered research, and generic AI tools invent the details that matter —
prices, places, and how long you can legally stay.

Outgrid Plan Agent is a multi-agent workflow built on top of Outgrid's reviewed
destination data:

1. **Planner** (Muse Spark, via the Meta Model API) turns a traveler's
   constraints — destination, dates, budget range, pace, coworking and fitness
   needs — into a structured, day-by-day plan drawn **only** from Outgrid's
   destination records. Every factual item carries a source reference to the
   exact record field it came from.
2. **Verifier** (Muse Spark Open — `meta-models/muse-spark-open` — served
   via Baseten) checks every claim in the draft against those source records
   and returns a per-claim verdict: `supported`, `unsupported`, or
   `unverifiable`. Unsupported claims go back to the Planner once, with the
   flags attached. Nothing passes silently. A deterministic
   **exact-number check** (plain code, no model) runs alongside it: every
   dollar amount in a plan item must appear exactly in a source field that
   item cites, or the item is flagged unsupported too. The code check can
   add a flag; it can never remove one. Any item the Verifier returns no
   verdict for is accounted for as `unverifiable` — never passed by silence.
3. **Verifier-gated publish** — a plan publishes automatically once
   verification completes with zero `unsupported` claims. Still-flagged items
   are dropped and logged; `unverifiable` items publish flagged. No human in
   the loop — the second model is the gate. The verified plan becomes a
   shareable trip page with source citations.

Visa and safety content is only used when the underlying record field is
human-reviewed; otherwise it is omitted or flagged unverifiable. The model
never invents hotels, prices, transit times, or stay rules.

**The demo site:** the browsable front-end in this repo recreates
outgrid.io's experience — a cinematic billboard, horizontal rails,
hover-expand cards, a detail modal, My List and Continue Planning, in
Outgrid's own slate-and-cream identity — plus the homepage sentence
search, Nomad Score bands, type filters and sorting, country and
destination pages, and the plan pages, all rebuilt from the exported
data snapshot in `data/`.

**Search in your own words:** the homepage also takes a plain-language
request ("quiet beach town under $1,200 with fast wifi"). Muse Spark
translates it into the classic filters as strict JSON; the records do
the matching, and the results page shows the interpreted filters as
chips — if nothing matches everything, inferred thresholds are loosened
one at a time and the page says exactly what was loosened. The model
never picks destinations and never invents results. It is original code written
for this hackathon: no production code, and no live APIs — the demo runs
entirely on the snapshot, so what you browse is exactly what the Planner
is allowed to use.

**First live run (Oct 28, 2026):** a real Bacalar plan written by Muse
Spark and checked by Muse Spark Open — 12 claims checked, 11 supported,
1 unverifiable, 0 dropped — and the proof test passed: an invented
$340/night hotel slipped into the finished plan was caught and marked
unsupported. Full evidence in `eval/`, and readable on the demo itself at
[`/evidence`](https://outgrid-plan-agent.onrender.com/evidence) — with the
saved plan itself at
[`/verified-plan`](https://outgrid-plan-agent.onrender.com/verified-plan).

**Oct 29 release:** the exact-number check above; a five-country
**Stay Rules — snapshot edition** at
[`/stay-rules`](https://outgrid-plan-agent.onrender.com/stay-rules)
(only fields present in the records, all flagged unverified, with the
not-advice disclaimer); **Add to trip** on experience cards (opens the
in-app planner pre-filled — no fake booking partner); **Locate me**
(browser-only nearest-place lookup from record coordinates, nothing
stored or sent); a plain-language build catalog at
[`/how-it-works`](https://outgrid-plan-agent.onrender.com/how-it-works);
and production-style safety basics adapted to the demo — a Content
Security Policy on every response and a published `security.txt`.
Production features that need partner keys, licences, accounts, or live
feeds (Stay22, GetYourGuide, Viator, Stripe, Supabase) were deliberately
**not** recreated; `/how-it-works` says why, item by item.

**Hero eval (Oct 29, 2026):** the full pipeline ran live for one city
per country — Bacalar, Chiang Mai, Lisbon, Medellín, and Canggu. All
five plans published: **51 claims checked, 51 supported, 0 dropped,
0 final exact-number flags.** Actual runs only; see `eval/hero-eval.md`
and the plan JSON in `eval/plans/`.

## Models

| Role | Model | Served via |
|---|---|---|
| Planner | Muse Spark | Meta Model API |
| Verifier | Muse Spark Open (`meta-models/muse-spark-open`) | Baseten |
| Card artwork | Muse Image (`muse-image-1.0`) | Meta Model API |
| Exact-number check | No model — deterministic code | In-process |

Every AI role in the running demo is a Meta Muse model. No other AI
model is used.

## Built during the hackathon (Oct 27 – Nov 4, 2026)

- [x] Intake form + Planner (Muse Spark) → structured itinerary JSON
- [x] Verifier (Muse Spark Open) → per-claim verdicts + one retry loop
- [x] Publish rule — verifier-gated; held plans never publish
- [x] Browsable front-end recreating outgrid.io (billboard, rails,
  hover cards, My List) on the sample snapshot — cards open an in-place
  pop-up deep dive with the full record (briefing, neighbourhoods,
  coworking, priced experiences, country pros/cons, visa and tax notes),
  computed decision aids (rent share, money left for living, internet
  and safety reads), city/country pop-up chaining and parallax heroes
- [x] Nomad-essentials fields added to all 16 city records (best season,
  flight time from Miami, time zone vs US Eastern, SIM/data cost,
  English level, getting around, scene) — curated typical ranges added
  to the snapshot Oct 28, labelled as such in the UI; like every record
  field they are citable by the Planner and checkable by the Verifier
- [x] Classic filters + natural-language search (Muse Spark interprets,
  the records match)
- [x] Muse Image artwork for every destination card (21 images,
  generated with the Meta Model API — prompts in the build notes)
- [x] Shareable trip page with per-item source citations (plan URLs,
  plus the pinned saved verified run at `/verified-plan`)
- [x] Verifier proof test + hero-destination eval (`/eval`) — proof test
  passed Oct 28, see `eval/` and `/evidence`
- [x] Exact-number grounding check (deterministic, tested in
  `test/grounding.test.js`)
- [x] Oct 29 Muse-only additions: Stay Rules snapshot edition,
  experience Add to trip, Locate me, `/how-it-works` build catalog,
  CSP headers + `security.txt`, `/health`

## Pre-existing Outgrid (not part of the judged build)

The Outgrid platform and its reviewed dataset of 137 destinations predate the
hackathon. This repository contains only the exported snapshot of the
5-country / 16-city sample pack, so the demo runs standalone. It does **not** contain the
production Outgrid codebase.

## Running it

With both API keys set in the environment (see `.env.example`), run the
real pipeline — Planner writes, Verifier checks, publish rule applies:

```
node src/live-cli.js examples/intake-bacalar.json            # first live plan
node src/live-cli.js examples/intake-bacalar.json --inject-fake   # proof test
```

Without keys, a deterministic Planner **stub** shows the output shape:

```
node src/cli.js examples/intake-bacalar.json
```

Or browse the demo site locally — `npm run serve`, then open
http://localhost:3000 for the homepage search, country and destination
pages, the intake form, and rendered plan pages.

The CLI prints a 3-day plan JSON in the exact Planner output contract
(spec §3): every factual item carries `source_refs` to the record field
it came from, and Bacalar's missing rent figure is flagged
`unverifiable` — never estimated.

**Judge test path (2 minutes):** open the live demo →
[`/evidence`](https://outgrid-plan-agent.onrender.com/evidence) for the
saved verified plan, its run log, and the proof test side-by-side →
[`/verified-plan`](https://outgrid-plan-agent.onrender.com/verified-plan)
to read the checked plan with citations → build your own plan from any
destination's **Plan** button → skim
[`/stay-rules`](https://outgrid-plan-agent.onrender.com/stay-rules) and
[`/how-it-works`](https://outgrid-plan-agent.onrender.com/how-it-works).
Tests: `npm test` (grounding + pipeline state machine, scripted
transports, no API calls).
API keys are server-side only — see `.env.example` for the variable names.
Never commit a real key to this public repository.

## Status

Live demo: https://outgrid-plan-agent.onrender.com — cinematic browse
(billboard, rails, hover cards, detail modal, My List), classic filters,
natural-language search, and the live Planner → Verifier pipeline when
the server holds its API keys (a public /health/models page reports
per-model status). First live run + proof test passed Oct 28 — see
`eval/`. Submission deadline: Wed Nov 4, 2026, 9:00 PM ET.
