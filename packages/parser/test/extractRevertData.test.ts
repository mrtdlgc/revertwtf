import { describe, expect, it } from "vitest";
import { extractRevertData } from "../src/extractRevertData.js";

describe("extractRevertData", () => {
  it("finds top-level data", () => {
    const r = extractRevertData({ data: "0x08c379a000" });
    expect(r[0]?.data).toBe("0x08c379a000");
    expect(r[0]?.path).toBe("data");
  });

  it("accepts a raw revert-data string", () => {
    const r = extractRevertData("0x08c379a000");
    expect(r[0]?.data).toBe("0x08c379a000");
    expect(r[0]?.path).toBe("");
  });

  it("walks ethers v6 nested error.data", () => {
    const e = { code: "UNKNOWN_ERROR", error: { data: "0x4e487b7100" } };
    const r = extractRevertData(e);
    expect(r.find((c) => c.data === "0x4e487b7100")).toBeTruthy();
  });

  it("walks MetaMask-style data.originalError.data", () => {
    const e = { data: { originalError: { data: "0x08c379a012" } } };
    const r = extractRevertData(e);
    expect(r.find((c) => c.data === "0x08c379a012")).toBeTruthy();
  });

  it("parses stringified JSON in body", () => {
    const e = { body: JSON.stringify({ error: { data: "0x08c379a099" } }) };
    const r = extractRevertData(e);
    expect(r.find((c) => c.data === "0x08c379a099")).toBeTruthy();
  });

  it("ignores tx calldata-like fields", () => {
    const r = extractRevertData({ input: "0xa9059cbbdeadbeef" });
    expect(r.length).toBe(0);
  });
});
