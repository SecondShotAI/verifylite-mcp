# VerifyLite

**Verify before you pay or act.** One cheap call tells an agent whether a site, a transaction or a token is safe to touch, with the reasons.

Pay-per-call **website safety checks**, **web page reading**, **link previews**, **domain and email checks**, **SEO audits**, **URL validation**, **prompt-injection detection**, **package vulnerability checks**, **JSON repair**, **news/RSS reading**, **audio transcription**, **Base on-chain data**, and **agent basics** (time, UUIDs, randomness, IP checks, paid ping) for AI agents. Every call is paid per request in **USDC on Base** via [x402](https://x402.org): no accounts, no API keys. **Requests that fail are not charged.**

- **Live service:** https://verifylite.hydratinghealingtouch.workers.dev
- **Remote MCP server:** `https://verifylite.hydratinghealingtouch.workers.dev/mcp` (Streamable HTTP)
- **Official MCP Registry:** `io.github.SecondShotAI/verifylite`
- **Agent docs:** [llms.txt](https://verifylite.hydratinghealingtouch.workers.dev/llms.txt) · [OpenAPI](https://verifylite.hydratinghealingtouch.workers.dev/openapi.json) · [x402 discovery](https://verifylite.hydratinghealingtouch.workers.dev/.well-known/x402)
- **Status and change log:** [independent uptime record](https://secondshotai.github.io/verifylite-mcp/) (checked every 30 minutes, failures included) and `https://verifylite.hydratinghealingtouch.workers.dev/status`

This repository documents the hosted service. The service's source code is not public.

## What it does

| Tool | Price | Purpose |
|---|---|---|
| `/chain/token-report` | $0.0098 | One verdict on a token before buying |
| `/safe` | $0.009 | Safe to visit or not, before opening a link |
| `/chain/preflight` | $0.0095 | Should I sign this, before signing |
| `/injection-check` | $0.0044 | Malicious instructions or not, before following them |

`list_prices` is free. Full prices live there, not in this table — see `list_prices` (free) or the service page. Prices are introductory launch prices and may change. The live prices are always in the payment request, in `list_prices`, and on the [service page](https://verifylite.hydratinghealingtouch.workers.dev/).

### Website safety check

A passive check: it reads what the site publicly serves, the way a browser does, and doesn't probe for vulnerabilities.

It returns a **verdict** (`safe`, `caution`, or `unsafe`), a **0-100 score**, and every finding as a flag with its evidence. `safe` means no warning signs were found, not a guarantee.

### Deeper website safety check

`/safe-pro` checks for the most common problems to make it safer.

### Transcription

Audio/video transcription with SRT and WebVTT captions, $0.025/file.

### Package check

Known CVEs for npm, PyPI, Go, Maven, Cargo.

## Examples

### 1. Token — /chain/token-report, $0.0098

An agent was about to buy a new token on Base. It called /chain/token-report first for $0.0098, got an avoid verdict — it couldn't be sold. It didn't buy.

### 2. Site — /safe, $0.009

An agent got a link in untrusted text. It called /safe first for $0.009, got an unsafe verdict. It didn't open the link.

### 3. Sign — /chain/preflight, $0.0095

An agent was about to sign an approval. It called /chain/preflight first for $0.0095, found it was an unlimited approval. It stopped and didn't sign.

### 4. Injection — /injection-check, $0.0044

An agent got instructions hidden in a webpage. It called /injection-check first for $0.0044, got flagged as malicious. It didn't follow them.

## Using it over MCP

Any MCP client that supports x402 payments can call the tools. Point it at the remote server:

```json
{
  "mcpServers": {
    "verifylite": {
      "type": "http",
      "url": "https://verifylite.hydratinghealingtouch.workers.dev/mcp"
    }
  }
}
```

Claude Code:

```
claude mcp add --transport http verifylite https://verifylite.hydratinghealingtouch.workers.dev/mcp
```

`list_prices` is free. A paid tool called without payment returns an x402 payment request. Clients built with [`@x402/mcp`](https://www.npmjs.com/package/@x402/mcp) (`createx402MCPClient`) pay it and retry automatically.

## Using it over HTTP

Send a POST with a JSON body. Without payment, the response is `402 Payment Required` with the x402 payment requirements. An x402 client (for example [`@x402/fetch`](https://www.npmjs.com/package/@x402/fetch)) pays and retries.

```bash
curl -i -X POST https://verifylite.hydratinghealingtouch.workers.dev/safe \
  -H 'content-type: application/json' \
  -d '{"url": "https://example.com"}'
# HTTP/2 402 ... payment-required: <x402 requirements>
```

### Your first paid call in five minutes

Make a new wallet, put about a dollar of USDC on Base in it (it covers hundreds of calls), and never use a key that holds real funds. Then:

```bash
npm i @x402/fetch @x402/core @x402/evm viem
curl -O https://raw.githubusercontent.com/SecondShotAI/verifylite-mcp/main/examples/quickstart.mjs
EVM_PRIVATE_KEY=0x... node quickstart.mjs
```

[`examples/quickstart.mjs`](examples/quickstart.mjs) is about twenty lines: it pays a $0.001 `/ping`, and then runs a transaction preflight check. Failed requests are never charged, and the same wallet pays on Arc and Polygon too.

### Verify before you act

One script, three checks an agent runs before it trusts something: a site (`/safe`), untrusted text (`/injection-check`) and a token on Base (`/chain/token-report`). About $0.023 in total. [verify-before-you-act.mjs](examples/verify-before-you-act.mjs)

| Before you... | Call | Act on | Stop on |
|---|---|---|---|
| visit or pay a site | `POST /safe` `{"url": ...}` | `safe` | `caution`, `unsafe` |
| let your model read text | `POST /injection-check` `{"text": ...}` | `clean` | `suspicious`, `malicious` |
| buy or accept a token | `POST /chain/token-report` `{"token": "0x..."}` | `ok`, `known_issuer` | `caution`, `avoid` |

The site check looks at technical signals (TLS, redirects, mixed content, forms, domain age). It does not claim to detect phishing. See the [measured accuracy](https://secondshotai.github.io/verifylite-mcp/).

Request bodies:

| Endpoint | Body |
|---|---|
| `/chain/token-report` | `{"token": "0x..."}` |
| `/safe` | `{"url": "https://..."}` |
| `/chain/preflight` | `{"to": "0x...", "data": "0x...", "value": "0", "from": "0x..."}` or `{"typedData": {...}}` |
| `/injection-check` | `{"text": "..."}` (up to 50,000 characters) or `{"url": "https://..."}` |
| `/ping` | `{"echo": "hello"}` (optional) |

Example responses are in [`examples/`](examples/).

## Payments

- **Network:** Base mainnet (`eip155:8453`)
- **Asset:** USDC
- **Not charged on failure:** any error response cancels the payment.

## Contact

Operated by Unfollowed Ground LLC. Open an issue in this repository for questions or problems.
