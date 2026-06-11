// Day-session generator. Given (date, user state) it returns the day's session
// deterministically: which exercises, at what computed weight, sets/reps/RPE,
// with verbatim safety strings and equipment substitutions.
//
// The session *structure* (which exercise, sets, reps, rest, notes) is a typed
// transcription of plan_config.json `sessions`. All weights come from
// progression.targetWeight (which reads the TMs in plan_config). Safety/cues/
// names come from exercises.json at runtime. Nothing numeric is invented.
import { dayForDate, type PlanDay } from "./calendar";
import { REP_SCHEMES, getExercise, getLift } from "./config";
import { buildIndex, mround, resolveTM, targetWeight } from "./progression";
import type { DaySession, EngineState, SessionItem } from "./types";

interface BlueItem {
  exerciseId: string; // exercises.json id
  loadLiftId?: string; // progression lift id for the load
  scheme?: "mains"; // expand sets/reps/rpe from rep_schemes.mains by k
  sets?: number;
  reps?: string;
  rpeCap?: string;
  rest?: string;
  notes?: string;
  /** Only appears from this plan-week onward (sandbag-over-bar = week 5). */
  fromWeek?: number;
  /** High-risk pull dropped on deload weeks. */
  skipOnDeload?: boolean;
  /** Loaded carry — drops to 2 sets on deload. */
  carry?: boolean;
  /** Half the sandbag flat load, rounded to 25 (gpp light carry). */
  loadHalfSandbag?: boolean;
  /** Show a substitution note (and optionally swap the load) when gear unowned. */
  subWhenUnowned?: "sandbag" | "axle";
  subLoadLiftId?: string;
  subNote?: string;
}

const SMITH_SUB =
  "Until the bag arrives: Smith machine squat 3x10 off the Smith-squat TM, +10 lb/week.";
const AXLE_SUB =
  "Until the axle arrives: DB clean & press at matching effort — continental clean kept tidy, no bicep yank.";
const SANDBAG_EVENT_SUB =
  "Sandbag not owned yet — substitute a comparable odd-object/stone, or skip until it arrives.";

const LOWER: BlueItem[] = [
  {
    exerciseId: "trap_bar_deadlift",
    loadLiftId: "trap_bar_deadlift",
    scheme: "mains",
    rest: "3-4 min",
    notes: "Straps allowed on top sets from week 3 on.",
  },
  {
    exerciseId: "sandbag_bear_hug_squat",
    loadLiftId: "sandbag",
    sets: 3,
    reps: "8",
    rest: "2-3 min",
    subWhenUnowned: "sandbag",
    subLoadLiftId: "smith_squat",
    subNote: SMITH_SUB,
  },
  {
    exerciseId: "db_split_squat",
    loadLiftId: "db_split_squat",
    sets: 3,
    reps: "8/leg",
    rest: "90 sec",
  },
  {
    exerciseId: "suitcase_carry",
    loadLiftId: "suitcase_carry",
    sets: 4,
    reps: "50 ft/side",
    rest: "2 min",
    carry: true,
    notes: "Hips and shoulders level — the work is refusing to lean.",
  },
];

// Press block (strict ± push) is generated in code; these are the accessories.
const PRESS_ACCESSORIES: BlueItem[] = [
  { exerciseId: "db_bench", loadLiftId: "db_bench", sets: 3, reps: "8-10", rest: "2 min" },
  { exerciseId: "db_row", loadLiftId: "db_row", sets: 4, reps: "10/side", rest: "90 sec" },
  { exerciseId: "skullcrusher", loadLiftId: "skullcrusher", sets: 3, reps: "12", rest: "superset" },
  {
    exerciseId: "curl",
    loadLiftId: "curl",
    sets: 3,
    reps: "12",
    rest: "90 sec",
    notes: "Biceps tendon insurance for events. When 12 are clean, +5 lb.",
  },
];

const EVENTS: BlueItem[] = [
  {
    exerciseId: "sandbag_to_shoulder",
    loadLiftId: "sandbag",
    sets: 6,
    reps: "2/side",
    rest: "2-3 min",
    skipOnDeload: true,
    subWhenUnowned: "sandbag",
    subNote: SANDBAG_EVENT_SUB,
    notes: "Lap, hug, hips. NEVER curl it up.",
  },
  {
    exerciseId: "sandbag_over_bar",
    loadLiftId: "sandbag",
    sets: 3,
    reps: "3",
    rest: "2 min",
    fromWeek: 5,
    skipOnDeload: true,
    subWhenUnowned: "sandbag",
    subNote: SANDBAG_EVENT_SUB,
    notes: "Smith bar pinned 48-52 in.",
  },
  {
    exerciseId: "farmers_carry_trap_bar",
    loadLiftId: "farmers_carry",
    sets: 4,
    reps: "50 ft (Q2+: 2x50 ft timed)",
    rest: "2-3 min",
    carry: true,
  },
  {
    exerciseId: "sandbag_bear_hug_carry",
    loadLiftId: "sandbag",
    sets: 4,
    reps: "50 ft",
    rest: "2 min",
    carry: true,
    subWhenUnowned: "sandbag",
    subNote: SANDBAG_EVENT_SUB,
  },
  {
    exerciseId: "axle_deadlift_doh",
    loadLiftId: "axle_dl_doh",
    sets: 3,
    reps: "5",
    rest: "2 min",
    skipOnDeload: true,
    notes: "NO STRAPS ever — this is the grip work.",
  },
  { exerciseId: "kb_swing", loadLiftId: "kb_swing", sets: 5, reps: "15", rest: "60-90 sec" },
];

const GPP: BlueItem[] = [
  {
    exerciseId: "kb_swing",
    loadLiftId: "kb_swing",
    sets: 10,
    reps: "30s on / 90s off",
    notes: "Intervals — keep the hinge crisp.",
  },
  {
    exerciseId: "sandbag_bear_hug_carry",
    loadHalfSandbag: true,
    sets: 4,
    reps: "100 ft",
    subWhenUnowned: "sandbag",
    subNote: SANDBAG_EVENT_SUB,
  },
  { exerciseId: "walk", reps: "20-30 min" },
];

const BLUEPRINTS: Record<string, BlueItem[]> = {
  lower: LOWER,
  events: EVENTS,
  gpp_optional: GPP,
};

const REST_RECOVERY = ["Easy walk 20-30 min", "Water 3.5-4 L across the day", "Creatine 10 g"];

function titleCase(id: string): string {
  return id
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function mainsScheme(k: number): { sets: number; reps: string; rpeCap: string } {
  for (const r of REP_SCHEMES.mains) {
    const lo = r.k_range[0];
    const hi = r.k_range[1];
    if (lo != null && hi != null && k >= lo && k <= hi) {
      return { sets: r.sets, reps: String(r.reps), rpeCap: r.rpe_cap };
    }
  }
  return { sets: 4, reps: "3", rpeCap: "8" };
}

function libFields(exerciseId: string) {
  const lib = getExercise(exerciseId);
  return {
    name: lib?.name ?? titleCase(exerciseId),
    safety: lib?.safety,
    cues: lib?.cues,
    equipment: lib?.equipment,
    demoSearch: lib?.demo_search,
  };
}

function buildItem(b: BlueItem, day: PlanDay, st: Required<EngineState>): SessionItem | null {
  if (b.fromWeek && day.week < b.fromWeek) return null;
  const deload = day.weekType === "deload";
  if (deload && b.skipOnDeload) return null;

  let loadLiftId = b.loadLiftId;
  let substitutionNote: string | undefined;
  if (b.subWhenUnowned === "sandbag" && !st.equipment.sandbag) {
    substitutionNote = b.subNote ?? SANDBAG_EVENT_SUB;
    if (b.subLoadLiftId) loadLiftId = b.subLoadLiftId;
  } else if (b.subWhenUnowned === "axle" && !st.equipment.axle) {
    substitutionNote = b.subNote ?? AXLE_SUB;
  }

  let weightLb: number | null = null;
  if (b.loadHalfSandbag) {
    weightLb = mround(resolveTM("sandbag", day.quarter, st.tms) * 0.5, 25);
  } else if (loadLiftId) {
    weightLb = targetWeight(loadLiftId, day.week, st.tms);
  }

  let sets: number | string | undefined = b.sets;
  let reps = b.reps;
  let rpeCap = b.rpeCap;
  let notes = b.notes;

  if (b.scheme === "mains") {
    if (deload) {
      sets = REP_SCHEMES.deload.sets;
      reps = String(REP_SCHEMES.deload.reps);
      rpeCap = REP_SCHEMES.deload.rpe_cap;
    } else {
      const m = mainsScheme(buildIndex(day.week));
      sets = m.sets;
      reps = m.reps;
      rpeCap = m.rpeCap;
    }
    if (day.isCalibration) {
      notes = `${notes ?? ""} Week 1 is calibration — find your RPE-7 x5 and save it as your Q1 TM.`.trim();
    }
  } else if (deload) {
    if (b.carry) sets = 2;
    else if (typeof b.sets === "number") sets = Math.min(b.sets, 3);
    rpeCap = "<=6";
  }

  return {
    exerciseId: b.exerciseId,
    liftId: loadLiftId,
    sets,
    reps,
    weightLb,
    rpeCap,
    rest: b.rest,
    notes,
    substitutionNote,
    ...libFields(b.exerciseId),
  };
}

function pressBlock(day: PlanDay, st: Required<EngineState>): SessionItem[] {
  const load = targetWeight("axle_press", day.week, st.tms);
  const sub = !st.equipment.axle ? AXLE_SUB : undefined;
  const make = (
    exerciseId: string,
    sets: number,
    reps: string,
    rpeCap: string,
    notes?: string,
  ): SessionItem => ({
    exerciseId,
    liftId: "axle_press",
    sets,
    reps,
    weightLb: load,
    rpeCap,
    rest: "3 min",
    notes,
    substitutionNote: sub,
    ...libFields(exerciseId),
  });

  if (day.weekType === "deload") {
    return [make("axle_clean_strict_press", 3, "5", "<=6", "Deload — keep it crisp and light.")];
  }
  const k = buildIndex(day.week);
  if (day.quarter === 1 && k <= 3) {
    const q1 = REP_SCHEMES.press_q1_k1to3;
    return [make("axle_clean_strict_press", q1.sets, String(q1.reps), q1.rpe_cap)];
  }
  const strict = REP_SCHEMES.press_thereafter[0]!;
  const push = REP_SCHEMES.press_thereafter[1]!;
  return [
    make("axle_clean_strict_press", strict.sets, String(strict.reps), strict.rpe_cap),
    make(
      "axle_push_press",
      push.sets,
      String(push.reps),
      push.rpe_cap,
      "Same load as the strict target; the legs buy the extra reps.",
    ),
  ];
}

function base(day: PlanDay, title: string): DaySession {
  return {
    date: day.date,
    week: day.week,
    quarter: day.quarter,
    weekType: day.weekType,
    sessionKind: day.sessionKind,
    isCalibration: day.isCalibration,
    isTestWeek: day.isTestWeek,
    title,
    items: [],
  };
}

function heavySingle(
  exerciseId: string,
  liftId: string,
  label: string,
  notes: string,
): SessionItem {
  return {
    exerciseId,
    liftId,
    sets: "Work to heavy single",
    reps: "1 @ RPE 8",
    weightLb: null,
    rest: "as needed",
    notes: `${label} ${notes}`,
    ...libFields(exerciseId),
  };
}

function testWeekSession(day: PlanDay, st: Required<EngineState>): DaySession {
  if (day.dow === "mon") {
    const s = base(day, "Test week — deadlift heavy single");
    s.items = [
      heavySingle(
        "trap_bar_deadlift",
        "trap_bar_deadlift",
        "Trap bar deadlift — work up to a heavy single @ RPE 8.",
        "Log the single, then set next quarter's TM (~85-90% of it, or your new clean 5RM).",
      ),
    ];
    return s;
  }
  if (day.dow === "wed") {
    const s = base(day, "Test week — press heavy single");
    s.items = [
      heavySingle(
        "axle_clean_strict_press",
        "axle_press",
        "Axle strict press — heavy single @ RPE 8.",
        "Log it, then update the press TM for next quarter.",
      ),
    ];
    return s;
  }
  if (day.dow === "sat") {
    const s = base(day, "Test week — events");
    const farmLift = getLift("farmers_carry");
    s.items = [
      {
        exerciseId: "farmers_carry_trap_bar",
        liftId: "farmers_carry",
        sets: "Max distance",
        reps: "1 run @ TM",
        weightLb: mround(resolveTM("farmers_carry", day.quarter, st.tms), farmLift.round_to),
        rest: "full",
        notes: "Carry max distance at your farmer TM. Log the distance.",
        ...libFields("farmers_carry_trap_bar"),
      },
      {
        exerciseId: "sandbag_over_bar",
        liftId: "sandbag",
        sets: "60 s",
        reps: "Max reps",
        weightLb: targetWeight("sandbag", day.week, st.tms),
        rest: "full",
        notes: "Max reps over the bar in 60 seconds. Log reps, then set the next sandbag tier.",
        ...libFields("sandbag_over_bar"),
      },
    ];
    return s;
  }
  const s = base(day, "Test week — rest");
  s.recovery = REST_RECOVERY;
  return s;
}

export function sessionFor(date: string, state: EngineState = {}): DaySession | null {
  const day = dayForDate(date);
  if (!day) return null;
  const st: Required<EngineState> = {
    tms: state.tms ?? {},
    equipment: state.equipment ?? { sandbag: false, axle: false },
  };

  if (day.weekType === "test") return testWeekSession(day, st);

  if (day.sessionKind === "rest") {
    const s = base(day, "Rest & recovery");
    s.recovery = REST_RECOVERY;
    return s;
  }

  const kindLabel = titleCase(day.sessionKind);
  const s = base(day, `${kindLabel} (${day.weekType})`);
  const items: SessionItem[] = [];

  if (day.sessionKind === "press_upper") {
    items.push(...pressBlock(day, st));
    for (const b of PRESS_ACCESSORIES) {
      const it = buildItem(b, day, st);
      if (it) items.push(it);
    }
  } else {
    for (const b of BLUEPRINTS[day.sessionKind] ?? []) {
      const it = buildItem(b, day, st);
      if (it) items.push(it);
    }
  }

  s.items = items;
  return s;
}
