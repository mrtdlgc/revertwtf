import { describe, expect, it } from "vitest";
import { lookupSelector, isKnownSelector } from "../src/index.js";

describe("selectors", () => {
  it("finds Error(string)", () => {
    const r = lookupSelector("0x08c379a0");
    expect(r[0]?.name).toBe("Error");
  });
  it("finds Panic", () => {
    expect(lookupSelector("0x4e487b71")[0]?.name).toBe("Panic");
  });
  it("isKnownSelector", () => {
    expect(isKnownSelector("0x08c379a0")).toBe(true);
    expect(isKnownSelector("0xdeadbeef")).toBe(false);
  });
  it("is case-insensitive", () => {
    expect(lookupSelector("0x08C379A0").length).toBeGreaterThan(0);
  });
  it("finds generated protocol selectors", () => {
    const r = lookupSelector("0x5a46ac3a");
    expect(r.find((entry) => entry.signature === "AccountHasMadeLayerZeroRival(address,bytes32)")).toBeTruthy();
  });
});
