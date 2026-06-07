/**
 * Low-level HTTP client for the Polylayer v1 API.
 *
 * Handles bearer auth, JSON encode/decode, automatic Idempotency-Key
 * generation on writes, error normalization to PolylayerError, and
 * optional retry on 429 / 5xx. Resource namespaces (client.hyperliquid,
 * client.jupiter, …) are layered on top in index.ts.
 */
import { PolylayerError, type PolylayerErrorCode } from "./errors.js";

export interface PolylayerOptions {
  /** Your `plyr_<key>` bearer key. Required. */
  apiKey: string;
  /** Defaults to https://polylayer.xyz. */
  baseUrl?: string;
  /** Per-request timeout in ms. Defaults 30000. */
  timeoutMs?: number;
  /** Retry attempts on 429 / 5xx (in addition to the first try). Defaults 2. */
  maxRetries?: number;
  /** Inject a custom fetch (tests, proxies). Defaults global fetch. */
  fetch?: typeof fetch;
}

const DEFAULT_BASE_URL = "https://polylayer.xyz";

interface RequestOpts {
  method: "GET" | "POST" | "DELETE";
  path: string;
  /** JSON body for writes. */
  body?: unknown;
  /** Query params for reads. */
  query?: Record<string, string | number | undefined>;
  /** Override / supply the Idempotency-Key (writes only). */
  idempotencyKey?: string;
  /** True for POST/DELETE — auto-attaches an Idempotency-Key. */
  write?: boolean;
}

function randomIdempotencyKey(): string {
  const c = (globalThis as { crypto?: Crypto }).crypto;
  if (c?.randomUUID) return c.randomUUID();
  // Fallback for ancient runtimes: time-free random hex (32 chars).
  let s = "";
  for (let i = 0; i < 32; i++) s += Math.floor(Math.random() * 16).toString(16);
  return s;
}

const sleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

export class HttpClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly maxRetries: number;
  private readonly fetchImpl: typeof fetch;

  constructor(opts: PolylayerOptions) {
    if (!opts.apiKey) throw new Error("Polylayer: apiKey is required");
    this.apiKey = opts.apiKey;
    this.baseUrl = (opts.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, "");
    this.timeoutMs = opts.timeoutMs ?? 30_000;
    this.maxRetries = opts.maxRetries ?? 2;
    const f = opts.fetch ?? globalThis.fetch;
    if (!f) {
      throw new Error(
        "Polylayer: no global fetch available — pass `fetch` in options (Node <18)",
      );
    }
    this.fetchImpl = f;
  }

  async request<T>(opts: RequestOpts): Promise<T> {
    const url = new URL(`${this.baseUrl}/api/v1${opts.path}`);
    if (opts.query) {
      for (const [k, v] of Object.entries(opts.query)) {
        if (v !== undefined) url.searchParams.set(k, String(v));
      }
    }

    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.apiKey}`,
      Accept: "application/json",
    };
    if (opts.body !== undefined) headers["Content-Type"] = "application/json";
    if (opts.write) {
      headers["Idempotency-Key"] =
        opts.idempotencyKey ?? randomIdempotencyKey();
    }

    let lastError: PolylayerError | undefined;
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.timeoutMs);
      let res: Response;
      try {
        res = await this.fetchImpl(url.toString(), {
          method: opts.method,
          headers,
          body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
          signal: controller.signal,
        });
      } catch (err) {
        clearTimeout(timer);
        lastError = new PolylayerError({
          code: "network_error",
          message: `request failed: ${(err as Error).message}`,
          status: 0,
        });
        // Retry transient network failures, but never replay a write with
        // a fresh idempotency key — the same key is reused across attempts.
        if (attempt < this.maxRetries) {
          await sleep(backoffMs(attempt));
          continue;
        }
        throw lastError;
      } finally {
        clearTimeout(timer);
      }

      const text = await res.text();
      const parsed = text ? safeJson(text) : undefined;

      if (res.ok) return parsed as T;

      const errObj = (parsed as { error?: { code?: string; message?: string } })
        ?.error;
      const retryAfter = parseRetryAfter(res.headers.get("retry-after"));
      lastError = new PolylayerError({
        code: (errObj?.code as PolylayerErrorCode) ?? `http_${res.status}`,
        message: errObj?.message ?? `HTTP ${res.status}`,
        status: res.status,
        retryAfter,
        body: parsed,
      });

      const retryable = res.status === 429 || res.status >= 500;
      if (retryable && attempt < this.maxRetries) {
        await sleep(retryAfter != null ? retryAfter * 1000 : backoffMs(attempt));
        continue;
      }
      throw lastError;
    }
    // Unreachable, but satisfies the type checker.
    throw lastError ?? new PolylayerError({
      code: "internal",
      message: "request exhausted retries with no error",
      status: 0,
    });
  }
}

function backoffMs(attempt: number): number {
  // 250ms, 500ms, 1s … (deterministic; no jitter to keep retries cheap).
  return 250 * 2 ** attempt;
}

function parseRetryAfter(header: string | null): number | undefined {
  if (!header) return undefined;
  const n = Number(header);
  return Number.isFinite(n) ? n : undefined;
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return { error: { code: "internal", message: text.slice(0, 240) } };
  }
}
