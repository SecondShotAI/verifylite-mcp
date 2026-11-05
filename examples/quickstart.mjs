// VerifyLite quickstart: pay for one call with a plain wallet key.
//
//   npm i @x402/fetch @x402/core @x402/evm viem
//   EVM_PRIVATE_KEY=0x... node quickstart.mjs
//
// Use a NEW wallet holding a little USDC on Base (a dollar covers hundreds of calls).
// Never use a key that holds real funds. The call below costs $0.001.
import { wrapFetchWithPayment } from "@x402/fetch";
import { x402Client } from "@x402/core/client";
import { registerExactEvmScheme } from "@x402/evm/exact/client";
import { privateKeyToAccount } from "viem/accounts";

const BASE_URL = "https://verifylite.hydratinghealingtouch.workers.dev";

const client = new x402Client();
registerExactEvmScheme(client, { signer: privateKeyToAccount(process.env.EVM_PRIVATE_KEY) });
const fetchPaid = wrapFetchWithPayment(fetch, client); // pays the 402 automatically, then retries

// 1. Cheapest call, to prove payment works.
const ping = await fetchPaid(`${BASE_URL}/ping`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ echo: "hello" }),
});
console.log("ping:", ping.status, await ping.json());

// 2. A real one: explain a transaction before signing it (about $0.0095).
// const check = await fetchPaid(`${BASE_URL}/chain/preflight`, {
//   method: "POST",
//   headers: { "content-type": "application/json" },
//   body: JSON.stringify({ to: "0x833589fCD6eDb6E08f4c7C32D4f71b54bDa02913", data: "0x095ea7b3...", from: "0xYourWallet" }),
// });
// console.log((await check.json()).summary);
