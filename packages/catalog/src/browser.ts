export * from "./panic.js";

const MSG =
  "@revertwtf/catalog root APIs bundle the full catalog and must not run in a browser bundle. " +
  "Use @revertwtf/catalog/panic, per-shard data imports, or @revertwtf/client.";

if (typeof window !== "undefined") {
  console.error(`[revertwtf] ${MSG}`);
}

function makeStub(name: string): any {
  const message = `${name} ${MSG}`;
  const reject = (): never => {
    throw new Error(message);
  };
  return new Proxy(function () {} as any, {
    get: reject,
    apply: reject,
  });
}

export const getCatalog = makeStub("getCatalog()");
export const getCatalogShards = makeStub("getCatalogShards()");
export const getCatalogShard = makeStub("getCatalogShard()");
export const getEntry = makeStub("getEntry()");
export const getEntriesByLayer = makeStub("getEntriesByLayer()");
export const getEntriesByCategory = makeStub("getEntriesByCategory()");
export const searchCatalog = makeStub("searchCatalog()");
export const getCatalogStats = makeStub("getCatalogStats()");
export const getCatalogSourceMetadata = makeStub("getCatalogSourceMetadata()");
export const getKnownCatalogSources = makeStub("getKnownCatalogSources()");
export const decorateCatalogEntry = makeStub("decorateCatalogEntry()");
export const getBlockscoutChains = makeStub("getBlockscoutChains()");
export const getBlockscoutChain = makeStub("getBlockscoutChain()");
export const searchBlockscoutChains = makeStub("searchBlockscoutChains()");
export const getBlockscoutChainStats = makeStub("getBlockscoutChainStats()");
