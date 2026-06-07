// Read unified positions, open orders, and recent fills across all venues.
// Run: POLYLAYER_API_KEY=plyr_... npx tsx examples/read-portfolio.ts
import { Polylayer } from "polylayer";

const client = new Polylayer({ apiKey: process.env.POLYLAYER_API_KEY! });

console.log("positions:", await client.positions.list());
console.log("open orders:", await client.orders.open());
console.log("fills (24h):", (await client.fills.list()).fills.length);
