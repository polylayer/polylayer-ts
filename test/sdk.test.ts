import { describe, it, expect } from "vitest";

import { Polylayer, PolylayerError } from "../src/index.js";

/** Mock fetch that records calls and returns scripted responses. */
function mock(
  responses: Array<{ status?: number; body?: unknown; headers?: Record<string, string> }>,
) {
  const calls: Array<{ url: string; method: string; headers: Record<string, string>; body: unknown }> = [];
  let i = 0;
  const fetchImpl = (async (url: string, init: RequestInit) => {
    const headers = init.headers as Record<string, string>;
    calls.push({
      url: String(url),
      method: init.method ?? "GET",
      headers,
      body: init.body ? JSON.parse(init.body as string) : undefined,
    });
    const r = responses[Math.min(i++, responses.length - 1)] ?? { status: 200, body: {} };
    return new Response(r.body === undefined ? "" : JSON.stringify(r.body), {
      status: r.status ?? 200,
      headers: r.headers,
    });
  }) as unknown as typeof fetch;
  return { fetchImpl, calls };
}

function client(m: ReturnType<typeof mock>, opts = {}) {
  return new Polylayer({ apiKey: "plyr_test", baseUrl: "https://api.test", fetch: m.fetchImpl, maxRetries: 2, ...opts });
}

describe("client transport", () => {
  it("requires an apiKey", () => {
    expect(() => new Polylayer({ apiKey: "" })).toThrow(/apiKey/);
  });

  it("sends Bearer auth + Accept on every request", async () => {
    const m = mock([{ body: { positions: [] } }]);
    await client(m).positions.list();
    expect(m.calls[0].headers.Authorization).toBe("Bearer plyr_test");
    expect(m.calls[0].headers.Accept).toBe("application/json");
  });

  it("auto-generates an Idempotency-Key on writes, not reads", async () => {
    const m = mock([{ body: { positions: [] } }, { body: { status: "ok" } }]);
    const c = client(m);
    await c.positions.list();
    expect(m.calls[0].headers["Idempotency-Key"]).toBeUndefined();
    await c.hyperliquid.placeOrder({ coin: "BTC", is_buy: true, sz: "0.001", mode: "market_open" });
    expect(m.calls[1].headers["Idempotency-Key"]).toMatch(/.{8,}/);
    expect(m.calls[1].headers["Content-Type"]).toBe("application/json");
  });

  it("honors a caller-supplied idempotencyKey", async () => {
    const m = mock([{ body: {} }]);
    await client(m).hyperliquid.placeOrder(
      { coin: "BTC", is_buy: true, sz: "0.001", mode: "market_open" },
      { idempotencyKey: "my-key-123" },
    );
    expect(m.calls[0].headers["Idempotency-Key"]).toBe("my-key-123");
  });

  it("builds query params + strips a trailing slash on baseUrl", async () => {
    const m = mock([{ body: { positions: [] } }]);
    await new Polylayer({ apiKey: "plyr_x", baseUrl: "https://api.test/", fetch: m.fetchImpl }).positions.list({ platform: "hyperliquid" });
    expect(m.calls[0].url).toBe("https://api.test/api/v1/positions?platform=hyperliquid");
  });

  it("throws a typed PolylayerError on 4xx with the error envelope", async () => {
    const m = mock([{ status: 403, body: { error: { code: "bounds_exceeded", message: "cap" } } }]);
    await expect(
      client(m).hyperliquid.placeOrder({ coin: "BTC", is_buy: true, sz: "9", mode: "market_open" }),
    ).rejects.toMatchObject({ code: "bounds_exceeded", status: 403 });
    // only one attempt — 4xx is not retried
    expect(m.calls.length).toBe(1);
  });

  it("retries 429 (reusing the same Idempotency-Key) then succeeds", async () => {
    const m = mock([
      { status: 429, headers: { "retry-after": "0" }, body: { error: { code: "rate_limited", message: "slow" } } },
      { body: { status: "ok" } },
    ]);
    const res = await client(m).hyperliquid.placeOrder({ coin: "BTC", is_buy: true, sz: "0.001", mode: "market_open" });
    expect(res).toMatchObject({ status: "ok" });
    expect(m.calls.length).toBe(2);
    expect(m.calls[0].headers["Idempotency-Key"]).toBe(m.calls[1].headers["Idempotency-Key"]);
  });

  it("retries 5xx up to maxRetries then throws", async () => {
    const m = mock([
      { status: 500, body: { error: { code: "internal", message: "x" } } },
      { status: 500, body: { error: { code: "internal", message: "x" } } },
      { status: 500, body: { error: { code: "internal", message: "x" } } },
    ]);
    await expect(client(m, { maxRetries: 2 }).jupiter.markets()).rejects.toBeInstanceOf(PolylayerError);
    expect(m.calls.length).toBe(3); // 1 + 2 retries
  });

  it("isRateLimited reflects 429", async () => {
    const m = mock([{ status: 429, headers: { "retry-after": "0" }, body: { error: { code: "rate_limited", message: "x" } } }]);
    try {
      await client(m, { maxRetries: 0 }).polymarket.placeOrder({ market_id: "1", side: "BUY", price: 0.5, size_usdc: "1000000" });
      throw new Error("should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(PolylayerError);
      expect((e as PolylayerError).isRateLimited).toBe(true);
      expect((e as PolylayerError).retryAfter).toBe(0);
    }
  });
});

describe("hyperliquid resource", () => {
  it("placeOrder POSTs the body to /hyperliquid/orders", async () => {
    const m = mock([{ body: {} }]);
    await client(m).hyperliquid.placeOrder({ coin: "BTC", is_buy: true, sz: "0.01", limit_px: "65000", mode: "limit", tif: "Gtc" });
    expect(m.calls[0].method).toBe("POST");
    expect(m.calls[0].url).toBe("https://api.test/api/v1/hyperliquid/orders");
    expect(m.calls[0].body).toMatchObject({ coin: "BTC", is_buy: true, sz: "0.01", limit_px: "65000", mode: "limit", tif: "Gtc" });
  });

  it("cancel by oid → DELETE with ?coin=", async () => {
    const m = mock([{ body: {} }]);
    await client(m).hyperliquid.cancel({ coin: "BTC", oid: 123 });
    expect(m.calls[0].method).toBe("DELETE");
    expect(m.calls[0].url).toBe("https://api.test/api/v1/hyperliquid/orders/123?coin=BTC");
  });

  it("cancel by cloid → DELETE with the cloid in the path", async () => {
    const m = mock([{ body: {} }]);
    await client(m).hyperliquid.cancel({ coin: "ETH", cloid: "0xabc" });
    expect(m.calls[0].url).toBe("https://api.test/api/v1/hyperliquid/orders/0xabc?coin=ETH");
  });

  it("cancel without oid/cloid throws", () => {
    const m = mock([{ body: {} }]);
    // @ts-expect-error intentionally invalid
    expect(() => client(m).hyperliquid.cancel({ coin: "BTC" })).toThrow(/cloid or oid/);
  });

  it("placeTpsl builds entry + TP + SL normalTpsl legs with numeric triggerPx", async () => {
    const m = mock([{ body: {} }]);
    await client(m).hyperliquid.placeTpsl({ coin: "SOL", is_buy: true, sz: "0.18", entry_px: "62", tp_px: "65", sl_px: "59" });
    const b = m.calls[0].body as { orders: any[]; grouping: string };
    expect(m.calls[0].url).toBe("https://api.test/api/v1/hyperliquid/bulk-orders");
    expect(b.grouping).toBe("normalTpsl");
    expect(b.orders).toHaveLength(3);
    expect(b.orders[0]).toMatchObject({ coin: "SOL", is_buy: true, limit_px: "62" });
    expect(b.orders[1]).toMatchObject({ is_buy: false, reduce_only: true, order_type: { trigger: { triggerPx: 65, tpsl: "tp" } } });
    expect(b.orders[2].order_type.trigger).toMatchObject({ triggerPx: 59, tpsl: "sl" });
    expect(typeof b.orders[1].order_type.trigger.triggerPx).toBe("number");
  });

  it("placeTpsl with neither tp nor sl throws", () => {
    const m = mock([{ body: {} }]);
    expect(() => client(m).hyperliquid.placeTpsl({ coin: "SOL", is_buy: true, sz: "1", entry_px: "62" })).toThrow(/tp_px and\/or sl_px/);
  });

  it("setLeverage / transfer / withdraw hit their routes", async () => {
    const m = mock([{ body: {} }, { body: {} }, { body: {} }]);
    const c = client(m);
    await c.hyperliquid.setLeverage({ coin: "BTC", leverage: 5, is_cross: true });
    await c.hyperliquid.transfer({ direction: "to_perp", amount: "10" });
    await c.hyperliquid.withdraw({ amount: "5" });
    expect(m.calls.map((x) => x.url)).toEqual([
      "https://api.test/api/v1/hyperliquid/leverage",
      "https://api.test/api/v1/hyperliquid/transfer",
      "https://api.test/api/v1/hyperliquid/withdraw",
    ]);
  });
});

describe("jupiter resource", () => {
  it("open/close/modify/tpsl POST to their routes", async () => {
    const m = mock([{ body: { tx_signature: "a" } }, { body: { tx_signature: "b" } }, { body: { tx_signature: "c" } }, { body: { tx_signature: "d", tx_signatures: ["d"], tpsl_pubkeys: [] } }]);
    const c = client(m);
    await c.jupiter.open({ asset: "SOL", side: "long", size_usd: 25, leverage: 5 });
    await c.jupiter.close({ position_id: "P".repeat(40) });
    await c.jupiter.modify({ position_id: "P".repeat(40), delta_collateral_usdc: "1000000" });
    await c.jupiter.tpsl({ position_id: "P".repeat(40), asset: "SOL", size_usd: 25, tp_price_usd: 100 });
    expect(m.calls.map((x) => x.url)).toEqual([
      "https://api.test/api/v1/jupiter/positions/open",
      "https://api.test/api/v1/jupiter/positions/close",
      "https://api.test/api/v1/jupiter/positions/modify",
      "https://api.test/api/v1/jupiter/positions/tpsl",
    ]);
    expect(m.calls[0].body).toMatchObject({ asset: "SOL", side: "long", size_usd: 25, leverage: 5 });
  });

  it("markets() unwraps { markets }", async () => {
    const m = mock([{ body: { markets: [{ a: 1 }], cached: true } }]);
    const out = await client(m).jupiter.markets();
    expect(out).toEqual([{ a: 1 }]);
    expect(m.calls[0].method).toBe("GET");
  });
});

describe("polymarket resource", () => {
  it("placeOrder POSTs to /polymarket/orders", async () => {
    const m = mock([{ body: { orderID: "o1" } }]);
    await client(m).polymarket.placeOrder({ market_id: "713210", side: "BUY", price: 0.62, size_usdc: "10000000", neg_risk: false });
    expect(m.calls[0].url).toBe("https://api.test/api/v1/polymarket/orders");
    expect(m.calls[0].body).toMatchObject({ market_id: "713210", side: "BUY", price: 0.62, size_usdc: "10000000" });
  });

  it("cancel → DELETE /polymarket/orders/:id", async () => {
    const m = mock([{ body: {} }]);
    await client(m).polymarket.cancel("order-xyz");
    expect(m.calls[0].method).toBe("DELETE");
    expect(m.calls[0].url).toBe("https://api.test/api/v1/polymarket/orders/order-xyz");
  });

  it("split/merge/redeem POST condition_id + amount", async () => {
    const m = mock([{ body: {} }, { body: {} }, { body: {} }]);
    const c = client(m);
    await c.polymarket.split({ condition_id: "0xabc", amount_usdc: "1000000" });
    await c.polymarket.merge({ condition_id: "0xabc", amount_usdc: "1000000" });
    await c.polymarket.redeem({ condition_id: "0xabc", amount_usdc: "1000000" });
    expect(m.calls.map((x) => x.url)).toEqual([
      "https://api.test/api/v1/polymarket/split",
      "https://api.test/api/v1/polymarket/merge",
      "https://api.test/api/v1/polymarket/redeem",
    ]);
  });
});

describe("reads", () => {
  it("positions/orders/fills unwrap their envelopes", async () => {
    const m = mock([
      { body: { positions: [{ platform: "hyperliquid" }] } },
      { body: { orders: [{ platform: "polymarket" }] } },
      { body: { fills: [{ platform: "hyperliquid" }], next_cursor: null } },
    ]);
    const c = client(m);
    expect(await c.positions.list()).toEqual([{ platform: "hyperliquid" }]);
    expect(await c.orders.open()).toEqual([{ platform: "polymarket" }]);
    expect(await c.fills.list({ since: 1, platform: "hyperliquid" })).toEqual({ fills: [{ platform: "hyperliquid" }], next_cursor: null });
    expect(m.calls[2].url).toBe("https://api.test/api/v1/fills?since=1&platform=hyperliquid");
  });
});
