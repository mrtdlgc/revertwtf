const MSG =
  "@revertwtf/aa/explain can call the full catalog-backed parser and must not run in a browser bundle. " +
  "Call it from a server/API route, or use @revertwtf/client for a hosted fetch wrapper.";

if (typeof window !== "undefined") {
  console.error(`[revertwtf] ${MSG}`);
}

function reject(): never {
  throw new Error(MSG);
}

export const explainAAError: any = new Proxy(function () {} as any, {
  get: reject,
  apply: reject,
});
