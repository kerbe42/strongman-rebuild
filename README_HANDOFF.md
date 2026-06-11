# Handoff Kit — Strongman Rebuild App

This folder is everything Claude Code needs to build the app without re-deriving the domain logic from the spreadsheet conversation.

## Contents
- `CLAUDE.md` — project instructions Claude Code reads automatically (build order, conventions, hard rules).
- `SPEC.md` — full functional spec: architecture, screens, data model, correctness rules.
- `data/plan_config.json` — TMs, increments, caps, schedules, session templates, dietary rules. The spreadsheet's Inputs sheet, machine-readable.
- `data/test_vectors.json` — 15 expected-weight vectors verified against the spreadsheet (LibreOffice recalc, zero errors), plus calendar and nutrition invariants. The contract the engine must satisfy.
- `data/exercises.json` — exercise library: cues, safety flags, demo search queries.
- `data/meals.json` — super meal library: fixed template, dinner rotation, 7 extra protein-dense meals. All egg-free, legume-free, gout-aware.
- `.github/workflows/deploy.yml` — ready Pages deploy (runs tests before build).

## Kickoff
1. Create the GitHub repo (e.g. `strongman-rebuild`), copy this folder's contents into it at the root, commit.
2. In repo Settings → Pages → Source: **GitHub Actions**.
3. Open Claude Code in the repo and start with:

> Read CLAUDE.md and SPEC.md. Scaffold the Vite + React + TS + Tailwind PWA. Then build `src/engine/` and make every vector and invariant in `data/test_vectors.json` pass under vitest before writing any UI. Vite base = "/strongman-rebuild/".

4. Iterate screen by screen in the order CLAUDE.md specifies. The Today screen on your phone is the acceptance test that matters.

## Decisions already made (and why)
- **GitHub Pages = static** → data lives in localStorage with JSON export/import. Per-device until you export. If you want real sync later, a small backend on your own Caddy box fits your existing pattern — deliberately out of v1 scope.
- **Exercise demos = cues + YouTube search links, with per-exercise user-pinned URLs.** No video IDs are hardcoded because none were verified and links rot. You curate; the app remembers.
- **kcal target ships unset.** You're measuring maintenance empirically; the app must not invent the number.
- **Placeholder Q1 TMs stay flagged as placeholders** until calibration week replaces them.
