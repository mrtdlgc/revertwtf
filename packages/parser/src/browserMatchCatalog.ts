const MSG =
  "@revertwtf/parser/match-catalog bundles the full catalog and must not run in a browser bundle. " +
  "Call it from a server/API route, or use @revertwtf/client for hosted explanations.";

if (typeof window !== "undefined") {
  console.error(`[revertwtf] ${MSG}`);
}

function reject(): never {
  throw new Error(MSG);
}

export const matchCatalog: any = new Proxy(function () {} as any, {
  get: reject,
  apply: reject,
});
