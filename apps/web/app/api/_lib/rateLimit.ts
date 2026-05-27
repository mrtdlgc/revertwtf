import { mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname } from "node:path";
import { errorResponse } from "./http";
import { isApiKeyValid, readApiKey, requestIdentity } from "./apiKey";

const require = createRequire(import.meta.url);

const DEFAULT_PER_MINUTE = Number.parseInt(process.env.RATE_LIMIT_PER_MIN ?? "30", 10);
const DEFAULT_PER_HOUR = Number.parseInt(process.env.RATE_LIMIT_PER_HOUR ?? "200", 10);
const ANON_PER_MINUTE = Number.parseInt(process.env.RATE_LIMIT_ANON_PER_MIN ?? String(DEFAULT_PER_MINUTE), 10);
const ANON_PER_HOUR = Number.parseInt(process.env.RATE_LIMIT_ANON_PER_HOUR ?? String(DEFAULT_PER_HOUR), 10);
const MINUTE = 60;
const HOUR = 60 * 60;

export interface RateLimitConfig {
  perMinute: number;
  perHour: number;
}

export interface RateLimitResult {
  ok: boolean;
  retryAfterSeconds?: number;
  limit: { minute: number; hour: number };
  remaining: { minute: number; hour: number };
}

interface Statement {
  get(...args: unknown[]): { count?: number } | undefined;
  run(...args: unknown[]): void;
}

interface Database {
  pragma(sql: string): void;
  exec(sql: string): void;
  prepare(sql: string): Statement;
}

let db: Database | undefined;

export function checkRateLimit(
  route: string,
  identity: string,
  cfg: Partial<RateLimitConfig> = {},
): RateLimitResult {
  const limits = configFor(identity, cfg);
  const now = Math.floor(Date.now() / 1000);
  const minuteStart = now - (now % MINUTE);
  const hourStart = now - (now % HOUR);
  const database = getDb();

  database.prepare("DELETE FROM rl_hits WHERE window_start < ?").run(hourStart - HOUR);

  const minuteKey = `${route}:${identity}`;
  const hourKey = `all:${identity}`;
  const minuteCount = readCount(database, minuteKey, minuteStart);
  const hourCount = readCount(database, hourKey, hourStart);

  if (minuteCount >= limits.perMinute) {
    return {
      ok: false,
      retryAfterSeconds: minuteStart + MINUTE - now,
      limit: { minute: limits.perMinute, hour: limits.perHour },
      remaining: { minute: 0, hour: Math.max(0, limits.perHour - hourCount) },
    };
  }

  if (hourCount >= limits.perHour) {
    return {
      ok: false,
      retryAfterSeconds: hourStart + HOUR - now,
      limit: { minute: limits.perMinute, hour: limits.perHour },
      remaining: { minute: Math.max(0, limits.perMinute - minuteCount), hour: 0 },
    };
  }

  increment(database, minuteKey, minuteStart);
  increment(database, hourKey, hourStart);

  return {
    ok: true,
    limit: { minute: limits.perMinute, hour: limits.perHour },
    remaining: {
      minute: Math.max(0, limits.perMinute - minuteCount - 1),
      hour: Math.max(0, limits.perHour - hourCount - 1),
    },
  };
}

export function withRateLimit(
  route: string,
  handler: (request: Request) => Promise<Response>,
): (request: Request) => Promise<Response> {
  return async (request) => {
    const key = readApiKey(request);
    if (!isApiKeyValid(key)) {
      return errorResponse("Invalid or missing API key", 401);
    }

    const identity = requestIdentity(request);
    const rate = checkRateLimit(route, identity);
    if (!rate.ok) {
      return errorResponse("Rate limit exceeded", 429, rateLimitHeaders(rate));
    }

    const response = await handler(request);
    const headers = new Headers(response.headers);
    for (const [keyName, value] of Object.entries(rateLimitHeaders(rate))) {
      headers.set(keyName, value);
    }
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  };
}

function configFor(identity: string, cfg: Partial<RateLimitConfig>): RateLimitConfig {
  if (identity === "anon") {
    return {
      perMinute: cfg.perMinute ?? ANON_PER_MINUTE,
      perHour: cfg.perHour ?? ANON_PER_HOUR,
    };
  }
  return {
    perMinute: cfg.perMinute ?? DEFAULT_PER_MINUTE,
    perHour: cfg.perHour ?? DEFAULT_PER_HOUR,
  };
}

function rateLimitHeaders(rate: RateLimitResult): Record<string, string> {
  return {
    ...(rate.retryAfterSeconds ? { "retry-after": String(rate.retryAfterSeconds) } : {}),
    "x-ratelimit-limit-minute": String(rate.limit.minute),
    "x-ratelimit-limit-hour": String(rate.limit.hour),
    "x-ratelimit-remaining-minute": String(rate.remaining.minute),
    "x-ratelimit-remaining-hour": String(rate.remaining.hour),
  };
}

function getDb(): Database {
  if (db) return db;

  const dbPath = process.env.RATE_LIMIT_DB_PATH ?? "./.data/ratelimit.sqlite";
  mkdirSync(dirname(dbPath), { recursive: true });

  // If SQLite ever becomes painful in a target runtime, keep this module's
  // public interface and swap the internal store for an in-memory Map fallback.
  const BetterSqlite3 = require("better-sqlite3") as { new(path: string): Database };
  db = new BetterSqlite3(dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("synchronous = NORMAL");
  db.exec(`
    CREATE TABLE IF NOT EXISTS rl_hits (
      key TEXT NOT NULL,
      window_start INTEGER NOT NULL,
      count INTEGER NOT NULL,
      PRIMARY KEY (key, window_start)
    ) WITHOUT ROWID;
    CREATE INDEX IF NOT EXISTS rl_window_idx ON rl_hits(window_start);
  `);
  return db;
}

function readCount(database: Database, key: string, windowStart: number): number {
  return database.prepare("SELECT count FROM rl_hits WHERE key = ? AND window_start = ?").get(key, windowStart)?.count ?? 0;
}

function increment(database: Database, key: string, windowStart: number): void {
  database
    .prepare(`
      INSERT INTO rl_hits (key, window_start, count)
      VALUES (?, ?, 1)
      ON CONFLICT(key, window_start)
      DO UPDATE SET count = count + 1
    `)
    .run(key, windowStart);
}
