if (typeof window !== "undefined") {
  console.error(
    "[revertwtf] @revertwtf/aa root import can include catalog-backed explanation surfaces. " +
      "Use @revertwtf/aa/parse or @revertwtf/client in browser bundles.",
  );
}

export * from "./codes.js";
export * from "./parseAACode.js";
export * from "./entryPointAbi.js";
export * from "./decodeEntryPointError.js";
export { explainAAError } from "./browserExplain.js";
