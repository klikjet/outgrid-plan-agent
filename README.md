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
   flags attached. Nothing passes silently.
3. **Verifier-gated publish** — a plan publishes automatically once
   verification completes with zero `unsupported` claims. Still-flagged items
   are dropped and logged; `unverifiable` items publish flagged. No human in
   the loop — the second model is the gate. The verified plan becomes a
   shareable trip page with source citations.

Visa and safety content is only used when the underlying record field is
human-reviewed; otherwise it is omitted or flagged unverifiable. The model
never invents hotels, prices, transit times, or stay rules.

**The demo site:** the browsable front-end in this repo recreates
outgrid.io's experience — the "Find Your Perfect Next Base" homepage
search, country pages with Nomad Scores, destination pages with
neighbourhoods, coworking and experiences, and the plan pages — rebuilt
from the exported data snapshot in `data/`. It is original code written
for this hackathon: no production code, and no live APIs — the demo runs
entirely on the snapshot, so what you browse is exactly what the Planner
is allowed to use.

**First live run (Oct 28, 2026):** a real Bacalar plan written by Muse
Spark and checked by Muse Spark Open — 12 claims checked, 11 supported,
1 unverifiable, 0 dropped — and the proof test passed: an invented
$340/night hotel slipped into the finished plan was caught and marked
unsupported. Full evidence in `eval/`.

## Models

| Role | Model | Served via |
|---|---|---|
| Planner | Muse Spark | Meta Model API |
| Verifier | Muse Spark Open (`meta-models/muse-spark-open`) | Baseten |

## Built during the hackathon (Oct 27 – Nov 4, 2026)

- [x] Intake form + Planner (Muse Spark) → structured itinerary JSON
- [x] Verifier (Muse Spark Open) → per-claim verdicts + one retry loop
- [x] Publish rule — verifier-gated; held plans never publish
- [x] Browsable front-end recreating outgrid.io (home, country +
  destination pages) on the sample snapshot — no live APIs
- [ ] Shareable trip page with per-item source citations
- [ ] Verifier proof test + hero-destination eval (`/eval`) — proof test passed Oct 28, see `eval/`

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
`unverifiable` — never estimated. Full judge test instructions land
with the real Planner + Verifier (Oct 28–29).
API keys are server-side only — see `.env.example` for the variable names.
Never commit a real key to this public repository.

## Status

Building — Step 4 (scaffold + intake + Planner stub) landed Oct 28. Submission deadline: Wed Nov 4, 2026, 9:00 PM ET.
