/**
 * Every non-2xx response from the Polylayer API carries a machine code
 * in `{ error: { code, message } }`. `PolylayerError` exposes both plus
 * the HTTP status, so callers can branch on `err.code` rather than
 * parsing strings.
 */
export type PolylayerErrorCode =
  | "missing_bearer"
  | "invalid_key"
  | "wrong_platform"
  | "session_revoked"
  | "session_expired"
  | "bounds_exceeded"
  | "validation_error"
  | "missing_idempotency_key"
  | "idempotency_conflict"
  | "not_found"
  | "rate_limited"
  | "venue_error"
  | "wiring_pending"
  | "internal"
  // client-side, never from the server:
  | "network_error"
  | (string & {});

export class PolylayerError extends Error {
  readonly code: PolylayerErrorCode;
  readonly status: number;
  /** Seconds to wait, parsed from Retry-After on 429s. */
  readonly retryAfter?: number;
  /** Raw parsed response body, when available. */
  readonly body?: unknown;

  constructor(args: {
    code: PolylayerErrorCode;
    message: string;
    status: number;
    retryAfter?: number;
    body?: unknown;
  }) {
    super(args.message);
    this.name = "PolylayerError";
    this.code = args.code;
    this.status = args.status;
    this.retryAfter = args.retryAfter;
    this.body = args.body;
  }

  get isRateLimited(): boolean {
    return this.code === "rate_limited" || this.status === 429;
  }
}
