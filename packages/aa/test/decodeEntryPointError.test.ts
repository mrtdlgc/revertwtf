import { describe, expect, it } from "vitest";
import { encodeAbiParameters, type Hex } from "viem";
import { decodeEntryPointError } from "../src/decodeEntryPointError.js";

function buildFailedOp(opIndex: number, reason: string): Hex {
  const body = encodeAbiParameters([{ type: "uint256" }, { type: "string" }], [BigInt(opIndex), reason]);
  return `0x220266b6${body.slice(2)}` as Hex;
}

describe("decodeEntryPointError", () => {
  it("decodes FailedOp + extracts AA code", () => {
    const data = buildFailedOp(0, "AA23 reverted or OOG");
    const r = decodeEntryPointError(data);
    expect(r.kind).toBe("FailedOp");
    expect(r.aaCode?.code).toBe("AA23");
    expect(r.opIndex).toBe(0n);
  });
});
