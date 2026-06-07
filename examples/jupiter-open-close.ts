// Open a 5x SOL long on Jupiter, then close it.
// Run: POLYLAYER_API_KEY=plyr_... npx tsx examples/jupiter-open-close.ts
import { Polylayer } from "polylayer";

const client = new Polylayer({ apiKey: process.env.POLYLAYER_API_KEY! });

const opened = await client.jupiter.open({ asset: "SOL", side: "long", size_usd: 25, leverage: 5 });
console.log("open tx:", opened.tx_signature);

// Find the position id from the unified read, then close.
const pos = (await client.positions.list({ platform: "jupiter" })).filter((p) => p.platform === "jupiter");
for (const p of pos) {
  if (p.platform === "jupiter") {
    const closed = await client.jupiter.close({ position_id: p.position_id });
    console.log("close tx:", closed.tx_signature);
  }
}
