import { describe, expect, it } from "vitest";
import { addDays, dayIndexOf, dowOf, isoForDayIndex, todayISO } from "./dates";
import { buildCalendar, dayForDate, dayForIndex, weekDays } from "./calendar";

describe("date utilities (UTC, no timezone drift)", () => {
  it("knows the plan starts on a Monday", () => {
    expect(dowOf("2026-06-15")).toBe("mon");
  });

  it("adds days across month boundaries", () => {
    expect(addDays("2026-06-15", 0)).toBe("2026-06-15");
    expect(addDays("2026-06-15", 16)).toBe("2026-07-01");
    expect(addDays("2026-06-15", 364)).toBe("2027-06-14");
  });

  it("round-trips day index <-> iso date", () => {
    expect(isoForDayIndex(0)).toBe("2026-06-15");
    expect(dayIndexOf("2026-06-15")).toBe(0);
    expect(dayIndexOf(isoForDayIndex(200))).toBe(200);
  });

  it("formats the device's local date for an injected clock", () => {
    expect(todayISO(new Date(2026, 5, 15, 9, 30))).toBe("2026-06-15");
    expect(todayISO(new Date(2026, 0, 3, 23, 59))).toBe("2026-01-03");
  });
});

describe("buildCalendar — calendar invariants", () => {
  const cal = buildCalendar();

  it("spans exactly 364 days (52 weeks)", () => {
    expect(cal).toHaveLength(364);
  });

  it("starts 2026-06-15 (Mon, wk1, q1, calibration) and ends 2027-06-13 (Sun, wk52)", () => {
    const first = cal[0]!;
    expect(first.date).toBe("2026-06-15");
    expect(first.dow).toBe("mon");
    expect(first.week).toBe(1);
    expect(first.quarter).toBe(1);
    expect(first.isCalibration).toBe(true);

    const last = cal[363]!;
    expect(last.date).toBe("2027-06-13");
    expect(last.dow).toBe("sun");
    expect(last.week).toBe(52);
    expect(last.quarter).toBe(4);
    expect(last.isTestWeek).toBe(true);
  });

  it("gives every one of the 364 days exactly one (valid, non-empty) session kind", () => {
    const valid = new Set(["lower", "gpp_optional", "press_upper", "events", "rest"]);
    for (const d of cal) {
      expect(valid.has(d.sessionKind)).toBe(true);
    }
    expect(cal.filter((d) => !d.sessionKind)).toHaveLength(0);
  });

  it("places test weeks at exactly weeks 13, 26, 39, 52", () => {
    const testWeeks = [...new Set(cal.filter((d) => d.isTestWeek).map((d) => d.week))].sort(
      (a, b) => a - b,
    );
    expect(testWeeks).toEqual([13, 26, 39, 52]);
  });

  it("flags only week 1 as calibration", () => {
    const calWeeks = [...new Set(cal.filter((d) => d.isCalibration).map((d) => d.week))];
    expect(calWeeks).toEqual([1]);
  });

  it("contains 52 contiguous weeks of 7 days each, Mon-first", () => {
    for (let w = 1; w <= 52; w++) {
      const days = weekDays(w);
      expect(days).toHaveLength(7);
      expect(days[0]!.dow).toBe("mon");
      expect(days[6]!.dow).toBe("sun");
      expect(days.every((d) => d.week === w)).toBe(true);
    }
  });

  it("resolves a known date and rejects out-of-range dates", () => {
    expect(dayForDate("2026-06-15")?.week).toBe(1);
    expect(dayForDate("2026-06-14")).toBeNull(); // day before the plan
    expect(dayForDate("2027-06-14")).toBeNull(); // day after the plan (day 364)
  });

  it("resolves day-by-index and rejects out-of-range indices", () => {
    expect(dayForIndex(0)?.date).toBe("2026-06-15");
    expect(dayForIndex(363)?.week).toBe(52);
    expect(dayForIndex(-1)).toBeNull();
    expect(dayForIndex(364)).toBeNull();
  });
});
