import { createHmac } from "node:crypto";

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

import { HttpError } from "./request";

export const IP_QUOTA_PREFIX = "parking-anything:ip";
export const GLOBAL_QUOTA_PREFIX = "parking-anything:global";

const UNAVAILABLE_MESSAGE = "Live AI is temporarily unavailable.";

export interface QuotaGate {
  consume(input: { ip: string }): Promise<void>;
}

export interface QuotaLimiter {
  limit(identifier: string): Promise<{
    success: boolean;
    reset: number;
    reason?: string;
  }>;
}

interface QuotaGateDependencies {
  hashSecret: string;
  ipLimiter: QuotaLimiter;
  globalLimiter: QuotaLimiter;
  enabled?: boolean;
  now?: () => number;
  maxRetryAfterSeconds?: number;
}

type QuotaEnvironment = Readonly<Record<string, string | undefined>>;

function unavailable(): HttpError {
  return new HttpError(503, UNAVAILABLE_MESSAGE);
}

function retryAfterSeconds(reset: number, now: number, maximum: number): number {
  const seconds = Math.ceil((reset - now) / 1_000);
  return Math.min(Math.max(seconds, 1), maximum);
}

export function createQuotaGate({
  hashSecret,
  ipLimiter,
  globalLimiter,
  enabled = true,
  now = Date.now,
  maxRetryAfterSeconds = 3_600,
}: QuotaGateDependencies): QuotaGate {
  return {
    async consume({ ip }) {
      if (!enabled) throw unavailable();

      const identifier = createHmac("sha256", hashSecret)
        .update(ip.trim().toLowerCase())
        .digest("hex");

      let ipResult: Awaited<ReturnType<QuotaLimiter["limit"]>>;
      try {
        ipResult = await ipLimiter.limit(identifier);
      } catch {
        throw unavailable();
      }

      if (ipResult.reason === "timeout") throw unavailable();
      if (!ipResult.success) {
        throw new HttpError(
          429,
          "Demo request limit reached.",
          retryAfterSeconds(ipResult.reset, now(), maxRetryAfterSeconds),
        );
      }

      let globalResult: Awaited<ReturnType<QuotaLimiter["limit"]>>;
      try {
        globalResult = await globalLimiter.limit("global");
      } catch {
        throw unavailable();
      }

      if (globalResult.reason === "timeout" || !globalResult.success) {
        throw unavailable();
      }
    },
  };
}

export function getClientIp(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip")?.trim() ||
    "unknown"
  );
}

function positiveInteger(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
}

class MemoryFixedWindowLimiter implements QuotaLimiter {
  private readonly buckets = new Map<string, { count: number; reset: number }>();

  constructor(
    private readonly maximum: number,
    private readonly windowMilliseconds: number,
  ) {}

  async limit(identifier: string) {
    const now = Date.now();
    const current = this.buckets.get(identifier);
    const bucket =
      !current || current.reset <= now
        ? { count: 0, reset: now + this.windowMilliseconds }
        : current;
    bucket.count += 1;
    this.buckets.set(identifier, bucket);

    return {
      success: bucket.count <= this.maximum,
      reset: bucket.reset,
    };
  }
}

export function createProductionQuotaGate(
  environment: QuotaEnvironment = process.env,
): QuotaGate {
  const enabled = environment.DEMO_API_ENABLED !== "false";
  const isProduction = environment.NODE_ENV === "production";
  const url = environment.UPSTASH_REDIS_REST_URL;
  const token = environment.UPSTASH_REDIS_REST_TOKEN;
  const hashSecret = environment.RATE_LIMIT_HASH_SECRET;
  const ipMaximum = positiveInteger(environment.RATE_LIMIT_IP_MAX, 10);
  const ipWindowSeconds = positiveInteger(
    environment.RATE_LIMIT_IP_WINDOW_SECONDS,
    600,
  );
  const globalDailyMaximum = positiveInteger(
    environment.RATE_LIMIT_GLOBAL_DAILY_MAX,
    300,
  );

  if (!enabled) {
    return createQuotaGate({
      enabled: false,
      hashSecret: hashSecret ?? "disabled",
      ipLimiter: new MemoryFixedWindowLimiter(1, 1),
      globalLimiter: new MemoryFixedWindowLimiter(1, 1),
    });
  }

  if (isProduction && (!url || !token || !hashSecret)) throw unavailable();

  if (!url || !token) {
    return createQuotaGate({
      hashSecret: hashSecret ?? "local-development-only",
      ipLimiter: new MemoryFixedWindowLimiter(
        ipMaximum,
        ipWindowSeconds * 1_000,
      ),
      globalLimiter: new MemoryFixedWindowLimiter(
        globalDailyMaximum,
        24 * 60 * 60 * 1_000,
      ),
      maxRetryAfterSeconds: ipWindowSeconds,
    });
  }

  const redis = new Redis({ url, token });
  const ipLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(ipMaximum, `${ipWindowSeconds} s`),
    prefix: IP_QUOTA_PREFIX,
    timeout: 0,
  });
  const globalLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.fixedWindow(globalDailyMaximum, "1 d"),
    prefix: GLOBAL_QUOTA_PREFIX,
    timeout: 0,
  });

  return createQuotaGate({
    hashSecret: hashSecret ?? "local-development-only",
    ipLimiter,
    globalLimiter,
    maxRetryAfterSeconds: ipWindowSeconds,
  });
}
