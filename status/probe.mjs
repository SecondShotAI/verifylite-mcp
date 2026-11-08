// probe.mjs: public uptime record for VerifyLite.
// Runs on GitHub Actions every 30 minutes. One attempt per check, no retries,
// so a blip shows up as a blip. It checks that each endpoint answers and asks
// for payment (HTTP 402), that /health is 200, and that the MCP server lists
// its tools. It spends nothing and does not test paid delivery.
//
//   node probe.mjs <data-dir> <changelog.json> [accuracy.json]
// Reads and writes <data-dir>/history.csv, writes latest.json and status.json.
import { readFileSync, writeFileSync, existsSync, mkdirSync, copyFileSync } from "node:fs";
import { join } from "node:path";

const BASE = process.env.BASE || "https://verifylite.hydratinghealingtouch.workers.dev";
const dir = process.argv[2] || "data";
const changelog = process.argv[3];
const TIMEOUT_MS = 20000;
const MIN_TOOLS = Number(process.env.MIN_TOOLS || 40);

const post = (path, body) => ({ name: path, path, method: "POST", body, want: 402 });
const CHECKS = [
  { name: "/health", path: "/health", method: "GET", want: 200 },
  post("/safe", { url: "https://example.com" }),
  post("/read", { url: "https://example.com" }),
  post("/domain", { domain: "example.com" }),
  post("/email-check", { email: "a@example.com" }),
  post("/injection-check", { text: "hello" }),
  post("/package-check", { ecosystem: "npm", name: "lodash", version: "4.17.15" }),
  post("/chain/balance", {}),
  post("/chain/token-report", {}),
  post("/chain/honeypot", {}),
  post("/chain/preflight", {}),
  post("/chain/sanctions", {}),
  post("/federal-register", {}),
];

async function timed(url, init) {
  const t0 = performance.now();
  try {
    const res = await fetch(url, { ...init, signal: AbortSignal.timeout(TIMEOUT_MS) });
    const text = await res.text();
    return { status: res.status, ms: Math.round(performance.now() - t0), text };
  } catch (e) {
    return { status: 0, ms: Math.round(performance.now() - t0), text: "", error: String(e?.name || "error") };
  }
}

const results = [];
for (const c of CHECKS) {
  const init = { method: c.method, headers: { accept: "application/json" } };
  if (c.body) { init.body = JSON.stringify(c.body); init.headers["content-type"] = "application/json"; }
  const r = await timed(BASE + c.path, init);
  results.push({ name: c.name, want: c.want, status: r.status, ms: r.ms, ok: r.status === c.want });
}
{ // MCP: tool list is complete
  const r = await timed(BASE + "/mcp", { method: "POST", headers: { "content-type": "application/json", accept: "application/json, text/event-stream" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list", params: {} }) });
  let n = 0;
  try {
    const m = r.text.match(/\{[\s\S]*\}/);
    n = JSON.parse(m ? m[0] : "{}")?.result?.tools?.length ?? 0;
  } catch { n = 0; }
  results.push({ name: "/mcp tools/list", want: `${MIN_TOOLS}+ tools`, status: r.status, ms: r.ms, tools: n, ok: r.status === 200 && n >= MIN_TOOLS });
}

const now = new Date();
const passed = results.filter((r) => r.ok).length;
const sorted = results.map((r) => r.ms).sort((a, b) => a - b);
const median = sorted[Math.floor(sorted.length / 2)];
const failed = results.filter((r) => !r.ok).map((r) => r.name);
mkdirSync(dir, { recursive: true });
const histPath = join(dir, "history.csv");
if (!existsSync(histPath)) writeFileSync(histPath, "time,ok,passed,total,median_ms,max_ms,failed\n");
const row = [now.toISOString(), failed.length ? 0 : 1, passed, results.length, median, sorted[sorted.length - 1], failed.join("|")].join(",");
writeFileSync(histPath, readFileSync(histPath, "utf8") + row + "\n");
writeFileSync(join(dir, "latest.json"), JSON.stringify({ checkedAt: now.toISOString(), base: BASE, ok: failed.length === 0, passed, total: results.length, results }, null, 2));

// Summaries over 24 hours, 7 days and 30 days
const rows = readFileSync(histPath, "utf8").trim().split("\n").slice(1).map((l) => {
  const [time, ok, p, t, med, mx, f] = l.split(",");
  return { time: Date.parse(time), ok: ok === "1", med: Number(med), failed: f || "" };
}).filter((r) => Number.isFinite(r.time));
const windowStats = (days) => {
  const rs = rows.filter((r) => r.time >= now.getTime() - days * 86400000);
  if (!rs.length) return null;
  const meds = rs.map((r) => r.med).sort((a, b) => a - b);
  return { days, runs: rs.length, upPercent: Math.round((rs.filter((r) => r.ok).length / rs.length) * 10000) / 100, medianMs: meds[Math.floor(meds.length / 2)] };
};
const lastBad = [...rows].reverse().find((r) => !r.ok);
const status = {
  generatedAt: now.toISOString(),
  base: BASE,
  now: { ok: failed.length === 0, passed, total: results.length, failed },
  windows: [windowStats(1), windowStats(7), windowStats(30)].filter(Boolean),
  recordSince: rows.length ? new Date(rows[0].time).toISOString() : null,
  totalRuns: rows.length,
  lastProblem: lastBad ? { time: new Date(lastBad.time).toISOString(), failed: lastBad.failed.split("|").filter(Boolean) } : null,
  measures: "Each run makes one request per endpoint with no retries. A check passes when /health answers 200, every paid endpoint answers 402 (payment required), and the MCP server lists its full tool set. It does not make paid calls, so it shows availability, not result quality.",
};
writeFileSync(join(dir, "status.json"), JSON.stringify(status, null, 2));
if (changelog && existsSync(changelog)) copyFileSync(changelog, join(dir, "changelog.json"));
const accuracy = process.argv[4];
if (accuracy && existsSync(accuracy)) copyFileSync(accuracy, join(dir, "accuracy.json"));
console.log(`${failed.length ? "PROBLEM" : "ok"}: ${passed}/${results.length} checks, median ${median} ms`);
if (failed.length) console.log("failed: " + failed.join(", "));
