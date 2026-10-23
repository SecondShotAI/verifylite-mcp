# VerifyLite

Pay-per-call **website safety checks**, **web page reading**, **link previews**, **domain and email checks**, **SEO audits**, **URL validation**, **prompt-injection checks**, **JSON repair**, **news/RSS reading**, **audio transcription**, **Base on-chain data**, and **agent basics** (time, UUIDs, randomness, IP checks, paid ping) for AI agents. Every call is paid per request in **USDC on Base** via [x402](https://x402.org): no accounts, no API keys. **Requests that fail are not charged.**

- **Live service:** https://verifylite.hydratinghealingtouch.workers.dev
- **Remote MCP server:** `https://verifylite.hydratinghealingtouch.workers.dev/mcp` (Streamable HTTP)
- **Official MCP Registry:** `io.github.SecondShotAI/verifylite`
- **Agent docs:** [llms.txt](https://verifylite.hydratinghealingtouch.workers.dev/llms.txt) · [OpenAPI](https://verifylite.hydratinghealingtouch.workers.dev/openapi.json) · [x402 discovery](https://verifylite.hydratinghealingtouch.workers.dev/.well-known/x402)

This repository documents the hosted service. The service's source code is not public.

## What it does

| Service | HTTP endpoint | MCP tool | Price |
|---|---|---|---|
| URL syntax check (never contacts the site) | `POST /verify` | `verify_url` | $0.005 |
| Website safety check | `POST /safe` | `check_site_safety` | $0.009 |
| Website safety check + Google Web Risk (malware, phishing) | `POST /safe-pro` | `check_site_safety_pro` | $0.10 |
| Batch website safety check (up to 8 URLs) | `POST /safe-batch` | `check_sites_batch` | $0.008 per URL |
| Audio/video transcription with SRT and WebVTT captions | `POST /transcribe` | `transcribe_audio` | $0.05 per file |
| Web page as clean markdown | `POST /read` | `read_page` | $0.0028 |
| Link preview (title, description, image, favicon) | `POST /preview` | `link_preview` | $0.002 |
| Domain report (registration, expiry, DNS, SPF/DMARC) | `POST /domain` | `domain_report` | $0.007 |
| Email check (format, accepts mail, disposable/role) | `POST /email-check` | `check_email` | $0.003 |
| SEO check (indexability, title/description, robots, sitemap) | `POST /seo-check` | `seo_check` | $0.01 |
| JSON repair for LLM output, with optional JSON Schema check | `POST /sanitize-json` | `repair_json` | $0.0039 |
| Prompt-injection check for text or a web page (hidden instructions, jailbreaks, exfiltration, hidden Unicode/HTML) | `POST /injection-check` | `check_prompt_injection` | $0.0044 |
| News/RSS reader: latest headlines, links, dates, summaries from any feed or site | `POST /feed` | `read_feed` | $0.0038 |
| **Base on-chain data** (Base mainnet, read-only) | | | |
| Wallet balance: ETH, USDC, transaction count, wallet or contract | `POST /chain/balance` | `chain_balance` | $0.0035 |
| Transaction status: success/failed/pending, fee, confirmations, decoded USDC transfers | `POST /chain/tx` | `chain_tx` | $0.0055 |
| Token info: name, symbol, decimals, total supply | `POST /chain/token` | `chain_token` | $0.0048 |
| Contract inspection: code size, EIP-1967 proxy, ERC-20/721/1155 detection | `POST /chain/contract` | `chain_contract` | $0.0046 |
| Gas prices and typical transaction costs | `POST /chain/gas` | `chain_gas` | $0.0015 |
| Block info: number, time, transaction count, base fee | `POST /chain/block` | `chain_block` | $0.0016 |
| Crypto prices from Chainlink: ETH, BTC, cbBTC, SOL, USDC, DAI, EUR in USD | `POST /chain/price` | `crypto_price` | $0.0029 |
| **Agent basics** | | | |
| Current time in UTC and any time zone | `POST /time` | `get_time` | $0.0011 |
| UUID v4 or v7, up to 100 | `POST /uuid` | `new_uuid` | $0.0012 |
| Secure random numbers or a random pick from a list | `POST /random` | `random_number` | $0.0013 |
| IP address check (public, private, reserved); your own IP over HTTP | `POST /ip` | `ip_info` | $0.0014 |
| Paid ping, for testing x402 payment clients | `POST /ping` | `ping` | $0.001 |
| Current prices | `GET /` | `list_prices` | free |

Prices are introductory launch prices and may change. The live prices are always in the payment request, in `list_prices`, and on the [service page](https://verifylite.hydratinghealingtouch.workers.dev/).

### Website safety check

A passive check: it reads what the site publicly serves, the way a browser does, and doesn't probe for vulnerabilities. It looks at:

- TLS certificate validity
- HTTP to HTTPS redirect, the redirect chain, and redirects to other domains
- Security headers (HSTS, CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy)
- Mixed content and forms that submit over plain HTTP
- Domain age from the official registry (RDAP)
- Pro only: Google Web Risk lookup for malware, social engineering (phishing), and unwanted software

It returns a **verdict** (`safe`, `caution`, or `unsafe`), a **0-100 score**, and every finding as a flag with its evidence. `safe` means no warning signs were found, not a guarantee.

### Transcription

Whisper (turbo) on a GPU. Send a link to an audio or video file up to 25 MB, about 25 minutes of typical MP3. You get back the full text, timed segments, ready-made **SRT** and **WebVTT** captions, and the detected language. Optionally, it also translates the speech to English.

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

Request bodies:

| Endpoint | Body |
|---|---|
| `/verify`, `/safe`, `/safe-pro` | `{"url": "https://..."}` |
| `/safe-batch` | `{"urls": ["https://...", "https://..."]}` |
| `/transcribe` | `{"url": "https://.../audio.mp3", "language": "en", "translate": false}` (`language` and `translate` optional) |
| `/read`, `/preview`, `/seo-check` | `{"url": "https://..."}` |
| `/domain` | `{"domain": "example.com"}` |
| `/email-check` | `{"email": "name@example.com"}` |
| `/sanitize-json` | `{"text": "<broken JSON or LLM reply>", "schema": {...}}` (`schema` optional, up to 30,000 characters) |
| `/injection-check` | `{"text": "..."}` (up to 50,000 characters) or `{"url": "https://..."}` |
| `/feed` | `{"url": "https://...", "limit": 20}` (`limit` optional, 1 to 50) |
| `/chain/balance`, `/chain/token`, `/chain/contract` | `{"address": "0x..."}` |
| `/chain/tx` | `{"hash": "0x..."}` |
| `/chain/gas` | `{}` |
| `/chain/price` | `{"pair": "ETH/USD"}` (omit for all pairs) |
| `/chain/block` | `{"number": "latest"}` (optional) |
| `/time` | `{"tz": "America/Chicago"}` (optional) |
| `/uuid` | `{"version": "v7", "count": 5}` (both optional) |
| `/random` | `{"min": 1, "max": 6, "count": 2}` or `{"choices": ["a", "b", "c"]}` (all optional) |
| `/ip` | `{"ip": "203.0.113.7"}` (omit to get your own IP) |
| `/ping` | `{"echo": "hello"}` (optional) |

Example responses are in [`examples/`](examples/).

## Payments

- **Network:** Base mainnet (`eip155:8453`)
- **Asset:** USDC
- **Facilitator:** Coinbase CDP
- **Not charged on failure:** any error response (invalid input, unreachable site, file too large, failed transcription, blocklist unavailable, transaction not found, Base network unreachable) cancels the payment.

## Contact

Operated by Unfallowed Ground LLC. Open an issue in this repository for questions or problems.
