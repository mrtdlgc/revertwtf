import { describe, expect, it } from "vitest";
import { isHex, normalizeHex, selectorOf, bodyAfterSelector } from "../src/hex.js";

describe("hex helpers", () => {
  it("accepts valid hex", () => {
    expect(isHex("0x08c379a0")).toBe(true);
    expect(isHex("0x")).toBe(true);
  });
  it("rejects invalid hex", () => {
    expect(isHex("0xZZ")).toBe(false);
    expect(isHex("hello")).toBe(false);
    expect(isHex(42)).toBe(false);
  });
  it("normalizes uppercase hex", () => {
    expect(normalizeHex("0xABcd")).toBe("0xabcd");
    expect(normalizeHex("not")).toBeNull();
  });
  it("extracts selector + body", () => {
    expect(selectorOf("0x08c379a0deadbeef")).toBe("0x08c379a0");
    expect(bodyAfterSelector("0x08c379a0deadbeef")).toBe("0xdeadbeef");
    expect(selectorOf("0x12")).toBeNull();
  });
});
