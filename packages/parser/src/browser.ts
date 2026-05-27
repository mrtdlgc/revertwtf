if (typeof window !== "undefined") {
  console.error(
    "[revertwtf] @revertwtf/parser root import may include catalog-backed surfaces. " +
      "Use precise subpaths in browser bundles, or @revertwtf/client for hosted explanations.",
  );
}

export * from "./decodeRevertData.js";
export * from "./extractRevertData.js";
export * from "./extractTraceFailures.js";
export * from "./normalizeError.js";
export { explain } from "./browserExplain.js";
export { matchCatalog } from "./browserMatchCatalog.js";
