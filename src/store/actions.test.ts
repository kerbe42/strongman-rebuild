import { describe, expect, it } from "vitest";
import { defaultState } from "./store";
import {
  addBodyweight,
  setDailyChecks,
  setOverride,
  setPinnedDemo,
  setTM,
  updateSettings,
} from "./actions";

describe("setTM", () => {
  it("creates a 4-slot array and sets the chosen quarter (immutably)", () => {
    const s0 = defaultState();
    const s1 = setTM(s0, "trap_bar_deadlift", 1, 320);
    expect(s1.tms["trap_bar_deadlift"]).toEqual([320, null, null, null]);
    expect(s0.tms["trap_bar_deadlift"]).toBeUndefined(); // original untouched
    const s2 = setTM(s1, "trap_bar_deadlift", 3, 360);
    expect(s2.tms["trap_bar_deadlift"]).toEqual([320, null, 360, null]);
  });

  it("clears a slot back to null (fall back to suggestion formula)", () => {
    const s = setTM(setTM(defaultState(), "axle_press", 1, 110), "axle_press", 1, null);
    expect(s.tms["axle_press"]).toEqual([null, null, null, null]);
  });
});

describe("setDailyChecks", () => {
  it("merges a patch onto sane defaults for a new day", () => {
    const s = setDailyChecks(defaultState(), "2026-06-15", { waterL: 3.5 });
    expect(s.dailyChecks["2026-06-15"]).toEqual({
      waterL: 3.5,
      creatine: false,
      flareProtocol: false,
    });
  });

  it("merges onto an existing day without dropping other fields", () => {
    let s = setDailyChecks(defaultState(), "2026-06-15", { creatine: true });
    s = setDailyChecks(s, "2026-06-15", { flareProtocol: true });
    expect(s.dailyChecks["2026-06-15"]).toEqual({
      waterL: 0,
      creatine: true,
      flareProtocol: true,
    });
  });
});

describe("addBodyweight", () => {
  it("appends and keeps the log sorted by date", () => {
    let s = addBodyweight(defaultState(), { date: "2026-06-20", lb: 284 });
    s = addBodyweight(s, { date: "2026-06-15", lb: 285 });
    expect(s.bodyweightLog.map((e) => e.date)).toEqual(["2026-06-15", "2026-06-20"]);
  });

  it("replaces an existing entry for the same date", () => {
    let s = addBodyweight(defaultState(), { date: "2026-06-15", lb: 285 });
    s = addBodyweight(s, { date: "2026-06-15", lb: 283 });
    expect(s.bodyweightLog).toEqual([{ date: "2026-06-15", lb: 283 }]);
  });
});

describe("setOverride / setPinnedDemo / updateSettings", () => {
  it("clears an override when passed null", () => {
    let s = setOverride(defaultState(), "2026-06-15", { skipped: true, skipReason: "tweak" });
    expect(s.overrides["2026-06-15"]).toBeTruthy();
    s = setOverride(s, "2026-06-15", null);
    expect(s.overrides["2026-06-15"]).toBeUndefined();
  });

  it("pins and unpins a demo URL", () => {
    let s = setPinnedDemo(defaultState(), "trap_bar_deadlift", "https://youtu.be/abc");
    expect(s.settings.pinnedDemos["trap_bar_deadlift"]).toBe("https://youtu.be/abc");
    s = setPinnedDemo(s, "trap_bar_deadlift", null);
    expect(s.settings.pinnedDemos["trap_bar_deadlift"]).toBeUndefined();
  });

  it("patches settings immutably", () => {
    const s0 = defaultState();
    const s1 = updateSettings(s0, { kcalTarget: 3300 });
    expect(s1.settings.kcalTarget).toBe(3300);
    expect(s0.settings.kcalTarget).toBeNull();
  });
});
