import { describe, expect, it } from "vitest";
import { runCli } from "../src/index.js";

describe("cli", () => {
  it("shows help with no args", () => {
    expect(runCli([]).output).toMatch(/revertwtf/);
  });
  it("aa command parses AA23", () => {
    const r = runCli(["aa", "AA23 reverted or OOG"]);
    expect(r.status).toBe("ok");
    expect(r.output).toMatch(/AA23/);
  });
  it("decode command", () => {
    const r = runCli(["decode", "0x"]);
    expect(r.status).toBe("ok");
    expect(r.output).toMatch(/empty/);
  });
  it("catalog list", () => {
    const r = runCli(["catalog", "list"]);
    expect(r.status).toBe("ok");
    expect(r.output.length).toBeGreaterThan(50);
  });
});
