import { describe, expect, it } from "vitest";
import { encodeAbiParameters, type Hex } from "viem";
import { extractTraceFailures } from "../src/extractTraceFailures.js";
import { extractRevertData } from "../src/extractRevertData.js";
import { normalizeError } from "../src/normalizeError.js";

function makeErrorString(reason: string): Hex {
  const body = encodeAbiParameters([{ type: "string" }], [reason]);
  return `0x08c379a0${body.slice(2)}` as Hex;
}

describe("trace payload extraction", () => {
  it("summarizes failed Tenderly-style trace frames", () => {
    const output = makeErrorString("ERC20: transfer amount exceeds balance");
    const frames = extractTraceFailures({
      transaction: { status: "failed" },
      trace: [
        { type: "CALL", from: "0xabc", to: "0xdef", functionName: "swapExactTokensForTokens", success: true },
        {
          type: "CALL",
          from: "0xdef",
          to: "0xToken",
          contractName: "USDC",
          functionName: "transferFrom",
          error: "execution reverted",
          output,
        },
      ],
    });

    expect(frames.at(-1)?.functionName).toBe("transferFrom");
    expect(frames.at(-1)?.contractName).toBe("USDC");
    expect(frames.at(-1)?.output).toBe(output.toLowerCase());
  });

  it("extracts revert bytes from failed trace output but ignores successful output", () => {
    const output = makeErrorString("only owner");
    expect(extractRevertData({ trace: [{ success: true, output }] })).toEqual([]);
    expect(extractRevertData({ trace: [{ success: false, output }] })[0]?.data).toBe(output.toLowerCase());
  });

  it("normalizes stringified JSON payload messages", () => {
    const normalized = normalizeError(JSON.stringify({ error: { code: -32000, message: "nonce too low" } }));
    expect(normalized.codes.find((code) => code.value === -32000)).toBeTruthy();
    expect(normalized.messages.find((message) => message.value === "nonce too low")).toBeTruthy();
  });
});
