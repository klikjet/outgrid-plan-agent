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
2. **Verifier** (Muse Spark Open — `meta-models/muse-spark-open-1026` — served
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

## Models

| Role | Model | Served via |
|---|---|---|
| Planner | Muse Spark | Meta Model API |
| Verifier | Muse Spark Open (`meta-models/muse-spark-open-1026`) | Baseten |

## Built during the hackathon (Oct 27 – Nov 4, 2026)

- [ ] Intake form + Planner (Muse Spark) → structured itinerary JSON
- [ ] Verifier (Muse Spark Open) → per-claim verdicts + one retry loop
- [ ] Publish rule — verifier-gated; held plans never publish
- [ ] Shareable trip page with per-item source citations
- [ ] Verifier proof test + hero-destination eval (`/eval`)

## Pre-existing Outgrid (not part of the judged build)

The Outgrid platform and its reviewed dataset of 137 destinations predate the
hackathon. This repository contains only the exported snapshot of the
5-country / 16-city sample pack, so the demo runs standalone. It does **not** contain the
production Outgrid codebase.

## Running it

Setup and judge test instructions land with the first build commits.
API keys are server-side only — see `.env.example` for the variable names.
Never commit a real key to this public repository.

## Status

Building. Submission deadline: Wed Nov 4, 2026, 9:00 PM ET.
