const MSG =
  "@revertwtf/parser/explain bundles the full catalog and must not run in a browser bundle. " +
  "Call it from a server/API route, or use @revertwtf/client for a hosted fetch wrapper.";

if (typeof window !== "undefined") {
  console.error(`[revertwtf] ${MSG}`);
}

function reject(): never {
  throw new Error(MSG);
}

export const explain: any = new Proxy(function () {} as any, {
  get: reject,
  apply: reject,
});
