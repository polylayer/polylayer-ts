import type { HttpClient } from "../client.js";
import type {
  EarnDepositParams,
  EarnSummary,
  EarnWithdrawParams,
  EarnWriteResult,
} from "../types.js";

interface WriteOpts {
  idempotencyKey?: string;
}

/**
 * USDC yield (earn). Deposit/withdraw on Solana (Jupiter Lend, RockawayX's
 * Kamino vault) and Hyperliquid (HyperLend, Felix) from one unified key. The protocols are abstracted;
 * pick a `protocol` directly, or read `summary()` and deposit into the chain's
 * best APY (`bestProtocolId`). Requires a unified key.
 */
export class EarnResource {
  constructor(private readonly http: HttpClient) {}

  /** Per-chain APY (best of the chain's protocols) + your position + earned. */
  summary(): Promise<EarnSummary> {
    return this.http.request({ method: "GET", path: "/yield" });
  }

  /** Deposit USDC into a protocol to earn yield. */
  deposit(
    params: EarnDepositParams,
    opts: WriteOpts = {},
  ): Promise<EarnWriteResult> {
    return this.http.request({
      method: "POST",
      path: "/yield/deposit",
      body: params,
      write: true,
      idempotencyKey: opts.idempotencyKey,
    });
  }

  /** Withdraw USDC (or "max") from a protocol back to your own address. */
  withdraw(
    params: EarnWithdrawParams,
    opts: WriteOpts = {},
  ): Promise<EarnWriteResult> {
    return this.http.request({
      method: "POST",
      path: "/yield/withdraw",
      body: params,
      write: true,
      idempotencyKey: opts.idempotencyKey,
    });
  }
}
