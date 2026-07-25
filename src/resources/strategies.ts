import type { HttpClient } from "../client.js";
import type {
  StrategyBodyV2,
  StrategyCreateResponse,
  StrategyListResponse,
  StrategyValidateResponse,
  StrategyWithBody,
} from "../types.js";

interface WriteOpts {
  idempotencyKey?: string;
}

/** Advanced Orders Engine / Automations. */
export class StrategiesResource {
  constructor(private readonly http: HttpClient) {}

  /** List your automations. */
  list(): Promise<StrategyListResponse> {
    return this.http.request({
      method: "GET",
      path: "/strategies",
    });
  }

  /** Fetch an automation with metadata + body. */
  get(id: string): Promise<StrategyWithBody> {
    return this.http.request({
      method: "GET",
      path: `/strategies/${encodeURIComponent(id)}`,
    });
  }

  /** Create and arm an automation. Validate first when generating bodies. */
  create(
    body: StrategyBodyV2,
    opts: WriteOpts = {},
  ): Promise<StrategyCreateResponse> {
    return this.http.request({
      method: "POST",
      path: "/strategies",
      body,
      write: true,
      idempotencyKey: opts.idempotencyKey,
    });
  }

  /** Replace the body of an armed automation. */
  update(
    id: string,
    body: StrategyBodyV2,
    opts: WriteOpts = {},
  ): Promise<{ ok: boolean }> {
    return this.http.request({
      method: "PATCH",
      path: `/strategies/${encodeURIComponent(id)}`,
      body,
      write: true,
      idempotencyKey: opts.idempotencyKey,
    });
  }

  /** Cancel an automation. */
  cancel(id: string, opts: WriteOpts = {}): Promise<{ ok: boolean }> {
    return this.http.request({
      method: "DELETE",
      path: `/strategies/${encodeURIComponent(id)}`,
      write: true,
      idempotencyKey: opts.idempotencyKey,
    });
  }

  /** Dry-run validate a strategy body without arming it. */
  validate(body: StrategyBodyV2): Promise<StrategyValidateResponse> {
    return this.http.request({
      method: "POST",
      path: "/strategies/validate",
      body,
    });
  }

  /** Fetch the JSON Schema for StrategyBodyV2. */
  schema(): Promise<Record<string, unknown>> {
    return this.http.request({
      method: "GET",
      path: "/strategies/schema",
    });
  }
}
