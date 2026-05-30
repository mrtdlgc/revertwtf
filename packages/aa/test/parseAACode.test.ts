import { describe, expect, it } from "vitest";
import { parseAACode } from "../src/parseAACode.js";

describe("parseAACode", () => {
  it("parses AA23 reverted", () => {
    expect(parseAACode("AA23 reverted")?.code).toBe("AA23");
  });
  it("parses AA23 reverted or OOG", () => {
    expect(parseAACode("AA23 reverted or OOG")?.message).toMatch(/reverted/i);
  });
  it("parses FailedOp wrapper", () => {
    expect(parseAACode('FailedOp(0, "AA24 signature error")')?.code).toBe("AA24");
  });
  it("knows v0.7/v0.8 gas and aggregator codes", () => {
    expect(parseAACode("AA26 over verificationGasLimit")?.category).toBe("gas");
    expect(parseAACode("AA94 gas values overflow")?.message).toMatch(/overflow/i);
    expect(parseAACode("AA96 invalid aggregator")?.category).toBe("aggregator");
  });
  it("returns null when absent", () => {
    expect(parseAACode("random text")).toBeNull();
  });
});
