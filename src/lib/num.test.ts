import { describe, expect, it } from "vitest";
import { parseNum } from "./num";

describe("parseNum — string -> number | null (never NaN)", () => {
  it("parses clean numbers", () => {
    expect(parseNum("315")).toBe(315);
    expect(parseNum("12.5")).toBe(12.5);
    expect(parseNum("  90  ")).toBe(90);
  });

  it("returns null for empty input", () => {
    expect(parseNum("")).toBeNull();
    expect(parseNum("   ")).toBeNull();
  });

  it("returns null (not NaN) for anything non-finite", () => {
    expect(parseNum("12kg")).toBeNull();
    expect(parseNum("225/side")).toBeNull();
    expect(parseNum("8-10")).toBeNull();
    expect(parseNum("-")).toBeNull();
    expect(parseNum("e")).toBeNull();
    expect(parseNum("1 2")).toBeNull();
    expect(parseNum("NaN")).toBeNull();
    expect(parseNum("Infinity")).toBeNull();
  });
});
