import { describe, expect, it } from "vitest";
import {
  getBlockscoutChain,
  getBlockscoutChains,
  getBlockscoutChainStats,
  getCatalog,
  getEntry,
  searchBlockscoutChains,
  searchCatalog,
  getCatalogStats,
  getCatalogSourceMetadata,
} from "../src/index.js";
import { describePanic } from "../src/panic.js";

describe("catalog", () => {
  const entries = getCatalog();

  it("has at least one entry", () => {
    expect(entries.length).toBeGreaterThan(0);
  });

  it("has unique IDs", () => {
    const ids = entries.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("every entry has required fields", () => {
    for (const e of entries) {
      expect(e.title.length).toBeGreaterThan(0);
      expect(e.source?.length).toBeGreaterThan(0);
      expect(e.summary.length).toBeGreaterThan(0);
      expect(e.patterns.length).toBeGreaterThan(0);
      expect(e.likelyCauses.length).toBeGreaterThan(0);
      expect(e.nextSteps.length).toBeGreaterThan(0);
    }
  });

  it("can fetch by id", () => {
    expect(getEntry("aa23-reverted-or-oog")?.title).toMatch(/AA23/);
  });

  it("search finds entries", () => {
    expect(searchCatalog("coalesce").length).toBeGreaterThan(0);
  });

  it("decorates renamed and legacy source metadata", () => {
    expect(getCatalogSourceMetadata("hashi").lifecycle).toBe("legacy");
    expect(getEntry("hashi-array-length-missmatch")?.title).toContain("(legacy)");
    expect(searchCatalog("Everclear").length).toBeGreaterThan(0);
  });

  it("includes x402 protocol and facilitator coverage", () => {
    expect(getCatalogSourceMetadata("x402").displayName).toBe("x402");
    expect(getEntry("x402-invalid-exact-evm-payload-signature")?.title).toMatch(/signature/i);
    expect(searchCatalog("PAYMENT-SIGNATURE").length).toBeGreaterThan(0);
  });

  it("exposes Blockscout chain coverage", () => {
    expect(getBlockscoutChains().length).toBeGreaterThan(700);
    expect(getBlockscoutChain(1)?.name).toBe("Ethereum");
    expect(searchBlockscoutChains("Base").some((chain) => chain.chainId === "8453")).toBe(true);
    expect(getBlockscoutChainStats().byHostedBy.blockscout).toBeGreaterThan(0);
  });

  it("describePanic resolves codes", () => {
    expect(describePanic("0x11")).toMatch(/overflow/i);
    expect(describePanic("0x12")).toMatch(/zero/i);
  });

  it("stats compute", () => {
    const stats = getCatalogStats();
    expect(stats.total).toBe(entries.length);
  });
});
