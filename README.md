# Strongman Rebuild

A 52-week strongman training + nutrition tracker. Static PWA, fully client-side,
installable to a phone home screen, works offline after first load. All data lives
in `localStorage` with JSON export/import — no server, no account.

**Live:** https://kerbe42.github.io/strongman-rebuild/

## What it does

- **Today** — the day's session as a checklist: computed target weights, sets×reps,
  RPE caps, rest, cues, and verbatim safety strings. Tap to log actual sets. Rest days
  show recovery tasks. Calibration week saves your logged top set as the Q1 TM.
- **Plan** — the full 52-week calendar, colour-coded build / deload / test. Tap any day
  for a session detail with per-day overrides (weight/sets/reps deltas, swap, skip).
- **Meals** — protein and kcal progress vs targets (kcal stays unset until you measure
  maintenance), library meals with portion multipliers, custom entries with an
  excluded-ingredient warning, daily water / creatine / flare-protocol toggles.
- **Lifts** — the exercise library: cues, prominent safety flags, equipment, demo search
  links, and per-exercise pinned video URLs.
- **Progress** — bodyweight trend, top-set-per-lift, weekly protein average, TM progression.
- **Settings** — bodyweight (drives the protein target), the full TM table with placeholder
  flagging, equipment-owned toggles (gate substitutions), and JSON export / import / reset.

## Architecture

- **`src/engine/`** — pure, deterministic TypeScript: progression math (Excel-MROUND,
  build/deload/sandbag/cap rules), the 364-day calendar, session generation (with the
  week-5 sandbag-over-bar gate and equipment substitutions), and nutrition. No React.
- **`src/store/`** — versioned `localStorage` state (`strongman.v1`) + pure mutators +
  a thin React provider. Export/import validates the version and refuses corrupting merges.
- **`src/screens/` + `src/components/`** — mobile-first React + Tailwind. The UI never
  computes weights itself; it renders engine output.
- **`data/`** — the source of truth for every training/nutrition number. The engine reads
  these; it does not re-derive them.

### Correctness

The engine is test-first. `npm test` proves every one of the 15 verified spreadsheet
weight vectors, the calendar invariants, the nutrition invariants, and a meal-compliance
scan against the excluded-ingredient lists. CI runs the tests before every build.

## Develop

```sh
npm install
npm run dev      # local dev server
npm test         # vitest
npm run build    # tsc --noEmit && vite build
```

Vite `base` is `/strongman-rebuild/` to match GitHub Pages. Deploy is automatic on push
to `main` via `.github/workflows/deploy.yml` (tests must pass first).

## License

The owner's prior projects use PolyForm Noncommercial. No `LICENSE` file is committed
pending the owner's confirmation.
