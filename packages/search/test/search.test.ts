import { describe, expect, it } from "vitest";
import { getCatalogStats, listEntrySummaries, listEntryUrls } from "../src/index.js";

describe("@revertwtf/search", () => {
  it("returns bounded ranked catalog search results", () => {
    const result = listEntrySummaries({ query: "AA23", limit: 5 });

    expect(result.returned).toBeGreaterThan(0);
    expect(result.totalMatches).toBeGreaterThan(0);
    expect(result.entries.some((entry) => entry.id === "aa23-reverted-or-oog")).toBe(true);
    expect(result).not.toHaveProperty("rows");
    expect(result.entries[0]).not.toHaveProperty("patterns");
  });

  it("returns stats and sitemap URL batches", () => {
    expect(getCatalogStats().total).toBeGreaterThan(1_000);
    expect(listEntryUrls({ limit: 3 })).toHaveLength(3);
  });
});
