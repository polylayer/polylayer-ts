// Place then cancel a Polymarket CLOB limit order.
// Run: POLYLAYER_API_KEY=plyr_... npx tsx examples/polymarket-order.ts
import { Polylayer } from "polylayer";

const client = new Polylayer({ apiKey: process.env.POLYLAYER_API_KEY! });

// market_id is the CLOB token id (decimal uint256, as gamma/CLOB return it).
const res = await client.polymarket.placeOrder({
  market_id: process.env.TOKEN_ID!,
  side: "BUY",
  price: 0.4,
  size_usdc: "2000000", // $2
  order_type: "GTC",
});
console.log("order:", res);

for (const o of await client.orders.open({ platform: "polymarket" })) {
  if (o.platform === "polymarket") await client.polymarket.cancel(o.order_id);
}
console.log("cancelled open orders");
