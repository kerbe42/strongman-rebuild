# Strongman Rebuild — App Specification

One-line: a 52-week strongman training + nutrition PWA, static-hosted on GitHub Pages, usable from phone and desktop browser, fully client-side, that replaces and extends the source spreadsheet.

## 1. Architecture decision (read first)

GitHub Pages serves static files only — no server, no database. Consequences, stated plainly:

- All user data (logs, overrides, TM edits, meal history, bodyweight) lives in the browser via `localStorage` under a single versioned key, e.g. `strongman.v1`.
- Data is **per-device** unless exported. Ship JSON **Export / Import** from day one; that is the backup and the phone↔desktop sync mechanism. Do not defer this feature.
- If true multi-device sync is wanted later, that is a separate decision (small self-hosted backend would fit the owner's existing Caddy/Reflex/SQLite pattern). Out of scope for v1.

Stack: Vite + React + TypeScript, Tailwind, no UI framework bloat. Charts: recharts (or hand-rolled SVG — keep it light). PWA: manifest + minimal service worker so it installs to the phone home screen and works offline after first load. Deploy: GitHub Actions → Pages (workflow provided in `.github/workflows/deploy.yml`; set Pages source to "GitHub Actions" in repo settings; remember Vite `base` must equal `/<repo-name>/`).

## 2. Domain engine (port exactly — test vectors exist)

The progression engine is fully specified in `data/test_vectors.json` (`engine_rules`) with 15 verified expected-weight vectors plus calendar and nutrition invariants. **Write the engine and its unit tests first, before any UI.** The engine must reproduce every vector exactly using the placeholder TMs in `data/plan_config.json`.

Key behaviors:
- 52 weeks from 2026-06-15, 4 quarters × 13 weeks; week types build/deload/test per `week_structure`.
- Target weight = f(lift TM for the quarter, build index k, increment, rounding, cap). Excel-style MROUND (ties round up). DB-based lifts hard-cap at 90 lb.
- TMs are user state, not constants: Q1 set during calibration week; Q2–Q4 pre-fill from `q_deltas` as suggestions and are editable after each test week. Editing a TM recomputes all affected future days.
- Sessions per day-of-week per `weekly_schedule` and `sessions` templates, including deload/test variants, the week-5 gate on sandbag-over-bar, and equipment substitutions (Smith squat / DB clean & press) until sandbag and axle are marked "owned" in settings.

## 3. Screens

**Today (home).** Date header, week/quarter/type badge. The session as a checklist: exercise → target sets×reps @ computed weight, RPE cap, rest. Tap an exercise to log actual weight/reps/RPE per set (prefilled with targets), add a note, or swap the exercise. Logging an actual ≠ editing the plan: actuals go to the log; the plan row stays. Rest days show recovery tasks (walk, water). Calibration week shows the "save this as your Q1 TM" action inline after logging.

**Plan.** 52-week calendar, color-coded build/deload/test. Tap a day → session detail → per-day overrides (change weight/sets/reps for that day only, swap exercise from library, skip with reason). Overrides are stored as deltas on top of the generated plan, never by mutating the engine output.

**Exercises.** Library from `data/exercises.json`: cues, safety flags (the biceps rule and the no-straps-on-axle rule render as prominent warnings, not footnotes), equipment, and a **Watch demo** button → YouTube search URL from `demo_search`. Users can pin a preferred video URL per exercise (stored as user data). Do not hardcode video IDs — none were verified and links rot.

**Meals.** Daily tracker: protein and kcal progress bars vs targets (protein target derives from bodyweight via the formula in `plan_config.json`; kcal target is user-set after they measure maintenance — show "unset" state until then, do not invent a number). Add meals from `data/meals.json` with a portion multiplier (0.5×–2×, scales macros linearly). Custom meal entry. Water (3.5–4 L) and creatine (10 g) daily checkboxes. A visible **Flare protocol** toggle that swaps dinner flesh for the whey+yogurt substitution and flags the day in history.

**Progress.** Charts: top-set weight over time per lift, bodyweight trend, weekly protein average, carry distances/times. Test-week results screen feeds the TM-update flow with the suggested next-quarter values pre-filled and editable.

**Settings.** Bodyweight (drives protein target), TM table (the spreadsheet's Inputs sheet, all four quarters), equipment owned toggles (sandbag, axle — gates substitutions), units display, Export/Import JSON, reset with confirmation.

## 4. Data model (localStorage, one versioned object)

```ts
{
  version: 1,
  settings: { bodyweightLb, kcalTarget: number|null, equipment: { sandbag: boolean, axle: boolean }, pinnedDemos: Record<exerciseId, url> },
  tms: Record<liftId, [q1, q2, q3, q4]>,        // null q-slots fall back to suggestion formula
  overrides: Record<isoDate, DayOverride>,        // sparse; deltas only
  trainingLog: Record<isoDate, SetLog[]>,         // actuals: { exerciseId, set, weight, reps, rpe, note }
  mealLog: Record<isoDate, MealEntry[]>,          // { mealId|custom, multiplier, p, kcal }
  dailyChecks: Record<isoDate, { waterL, creatine, flareProtocol }>,
  bodyweightLog: Array<{ date, lb }>
}
```

Import must validate `version` and refuse silently-corrupting merges; export is the full object, pretty-printed, filename `strongman-backup-YYYY-MM-DD.json`.

## 5. Non-negotiable correctness rules

1. Engine output matches every vector in `test_vectors.json` — CI fails otherwise.
2. Calendar invariants hold (364 days, exactly one session each, test weeks at 13/26/39/52).
3. Nutrition invariants hold: fixed template = 197 g P / 2535 kcal; rotation weekly average = 237 g P / ~3308 kcal (±1 g / ±15 kcal rounding tolerance); protein target f(285) = 230.
4. A meal-compliance test walks every meal in `meals.json` against the excluded-ingredient lists. No eggs, no legumes (incl. peanuts/soy/peas/green beans), no high-purine flesh, no beer-based anything.
5. No fabricated content: no invented video URLs, no invented macro values beyond the shipped data files, no invented kcal target before the user sets one.
6. Safety strings ship verbatim where flagged in `exercises.json` (`safety` fields) — the biceps rule and the strapless-axle rule are load-bearing coaching, not copy to be polished away.

## 6. Out of scope for v1

Accounts/auth, server sync, push notifications, social features, AI features, video hosting. A static page with honest math beats all of it.
