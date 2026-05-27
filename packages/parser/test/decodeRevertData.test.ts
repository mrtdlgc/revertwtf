import { describe, expect, it } from "vitest";
import { decodeRevertData } from "../src/decodeRevertData.js";
import { encodeAbiParameters, encodeErrorResult, type Hex } from "viem";

function makeErrorString(reason: string): Hex {
  const body = encodeAbiParameters([{ type: "string" }], [reason]);
  return `0x08c379a0${body.slice(2)}` as Hex;
}
function makePanic(code: number): Hex {
  const body = encodeAbiParameters([{ type: "uint256" }], [BigInt(code)]);
  return `0x4e487b71${body.slice(2)}` as Hex;
}

describe("decodeRevertData", () => {
  it("empty -> empty", () => {
    expect(decodeRevertData("0x").kind).toBe("empty");
  });

  it("decodes Error(string)", () => {
    const data = makeErrorString("Ownable: caller is not the owner");
    const r = decodeRevertData(data);
    expect(r.kind).toBe("error_string");
    expect(r.reason).toBe("Ownable: caller is not the owner");
  });

  it("decodes Panic(0x11)", () => {
    const r = decodeRevertData(makePanic(0x11));
    expect(r.kind).toBe("panic");
    expect(r.panicCode).toBe("0x11");
    expect(r.panicMeaning).toMatch(/overflow/i);
  });

  it("handles malformed hex", () => {
    expect(decodeRevertData("not hex").kind).toBe("unknown");
  });

  it("unknown selector with no ABI returns custom_error if known via selector catalog", () => {
    // OwnableUnauthorizedAccount(address) selector
    const r = decodeRevertData("0x118cdaa70000000000000000000000000000000000000000000000000000000000000001");
    expect(r.kind).toBe("custom_error");
    expect(r.name).toBe("OwnableUnauthorizedAccount");
  });

  it("decodes custom errors with provided ABI", () => {
    const abi = [
      {
        type: "error",
        name: "InsufficientBalance",
        inputs: [
          { name: "available", type: "uint256" },
          { name: "required", type: "uint256" },
        ],
      },
    ] as const;
    const data = encodeErrorResult({
      abi,
      errorName: "InsufficientBalance",
      args: [1n, 2n],
    });
    const r = decodeRevertData(data, { abi });
    expect(r.kind).toBe("custom_error");
    expect(r.name).toBe("InsufficientBalance");
    expect(r.signature).toBe("InsufficientBalance(uint256,uint256)");
    expect(r.args).toEqual([1n, 2n]);
  });
});
