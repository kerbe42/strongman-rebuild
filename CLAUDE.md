# CLAUDE.md — Strongman Rebuild PWA

## What this is
A 52-week strongman training + nutrition tracker. Static PWA on GitHub Pages, client-side only, localStorage persistence with JSON export/import. Full functional spec in `SPEC.md`. Domain data in `data/` — treat those files as the source of truth; do not re-derive training or nutrition numbers from general knowledge.

## Build order (do not reorder)
1. `src/engine/` — pure TypeScript progression engine + calendar generator. No React imports.
2. Unit tests against `data/test_vectors.json`. All 15 weight vectors, calendar invariants, nutrition invariants, and the meal-compliance scan must pass before any UI work.
3. State layer: versioned localStorage store + export/import.
4. Screens in this order: Today → Settings (TM table is needed for calibration week) → Plan → Meals → Exercises → Progress.
5. PWA manifest + service worker. 6. Pages deploy via the provided workflow.

## Commands
- `npm run dev` / `npm run build` / `npm run test` (vitest) / `npm run lint`
- Definition of done for any PR-sized change: tests green, `npm run build` clean, no console errors on the Today screen.

## Conventions
- TypeScript strict. Pure functions in `src/engine/` — given (config, tms, date) return the day's session deterministically. UI never computes weights itself.
- Overrides and logs are deltas keyed by ISO date; never mutate generated plan output.
- Tailwind, mobile-first (primary device is a phone). Large tap targets on the Today checklist — it gets used mid-session with chalked hands.
- Vite `base` must be `/<repo-name>/` or Pages serves a blank page.

## Hard rules (owner requirement: factual accuracy over completeness)
- Never invent macro values, exercise weights, or video URLs. Everything numeric comes from `data/*.json` or user input. If data is missing, render an explicit "not set" state.
- The kcal target starts null and stays null until the user sets it (they are measuring maintenance empirically). Do not default it.
- `safety` strings in `exercises.json` render verbatim and prominently.
- Dietary exclusions (eggs, all legumes, high-purine list) are validation rules, not suggestions — custom meals get a soft warning if they name an excluded ingredient.
- Placeholder Q1 TMs are estimates; the UI must visibly flag TMs as "placeholder" until the user confirms each during calibration week.

## License
Owner's prior projects use PolyForm Noncommercial — confirm with owner before adding a LICENSE file.
