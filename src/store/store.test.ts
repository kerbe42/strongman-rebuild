import { beforeEach, describe, expect, it } from "vitest";
import {
  STORAGE_KEY,
  defaultState,
  exportState,
  importState,
  loadState,
  saveState,
} from "./store";

beforeEach(() => localStorage.clear());

describe("defaultState", () => {
  it("starts at version 1 with kcal target unset (null) and gear not owned", () => {
    const s = defaultState();
    expect(s.version).toBe(1);
    expect(s.settings.kcalTarget).toBeNull(); // hard rule: never invent it
    expect(s.settings.equipment).toEqual({ sandbag: false, axle: false });
    expect(s.tms).toEqual({});
    expect(s.trainingLog).toEqual({});
    expect(s.mealLog).toEqual({});
    expect(s.bodyweightLog).toEqual([]);
  });
});

describe("persistence", () => {
  it("round-trips through localStorage", () => {
    const s = defaultState();
    s.settings.bodyweightLb = 290;
    s.tms["trap_bar_deadlift"] = [320, null, null, null];
    saveState(s);
    expect(loadState()).toEqual(s);
    expect(localStorage.getItem(STORAGE_KEY)).toBeTruthy();
  });

  it("returns a fresh default when storage is empty", () => {
    expect(loadState().settings.kcalTarget).toBeNull();
    expect(loadState()).toEqual(defaultState());
  });

  it("falls back to default (never throws) on corrupt storage", () => {
    localStorage.setItem(STORAGE_KEY, "{not valid json");
    expect(() => loadState()).not.toThrow();
    expect(loadState()).toEqual(defaultState());
  });
});

describe("export", () => {
  it("produces a dated, pretty-printed backup of the whole object", () => {
    const s = defaultState();
    s.settings.bodyweightLb = 285;
    const out = exportState(s, new Date(2026, 5, 15));
    expect(out.filename).toBe("strongman-backup-2026-06-15.json");
    expect(out.json).toContain("\n"); // pretty-printed
    expect(JSON.parse(out.json)).toEqual(s);
  });
});

describe("import — validates version, refuses corrupting merges", () => {
  it("accepts a well-formed v1 backup", () => {
    const s = defaultState();
    s.settings.kcalTarget = 3300;
    s.bodyweightLog.push({ date: "2026-06-15", lb: 285 });
    const res = importState(JSON.stringify(s));
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.state).toEqual(s);
  });

  it("rejects a wrong/missing version", () => {
    const bad = { ...defaultState(), version: 2 };
    expect(importState(JSON.stringify(bad)).ok).toBe(false);
    const noVer = JSON.stringify({ settings: {} });
    expect(importState(noVer).ok).toBe(false);
  });

  it("rejects malformed shape and non-JSON", () => {
    expect(importState("{not json").ok).toBe(false);
    expect(importState(JSON.stringify({ version: 1 })).ok).toBe(false); // missing slices
    expect(importState(JSON.stringify({ version: 1, settings: 7 })).ok).toBe(false);
  });

  it("does not write to storage by itself (caller decides to apply)", () => {
    importState(JSON.stringify(defaultState()));
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });
});
