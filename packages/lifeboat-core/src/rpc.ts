// NEAR RPC client — read-only, pooled, backoff-aware.
//
// Endpoint choice is measured, not inherited. Calibrated 2026-07-14 against the
// live factory (40 sequential view_account calls per endpoint/concurrency):
//
//   free.rpc.fastnear.com    conc=2  -> 40/40 ok   (~11 req/s)   <- primary
//   rpc.mainnet.fastnear.com conc=2  -> 16/40 ok, 24x 429
//   near.lava.build          conc=2  -> 0/40, 403 (needs an API key)
//   rpc.mainnet.near.org             -> DEPRECATED; serves -429 telling you to leave
//
// Two consequences worth stating plainly, because both cost us a wasted pass:
//   1. rpc.mainnet.near.org is retired. Never make it primary.
//   2. Rotating across endpoints to "spread load" BACKFIRES here — the other
//      endpoints reject unkeyed traffic, so rotation just converts good requests
//      into 429/403. One good endpoint + honest pacing beats a pool of bad ones.
//
// Rate limiting is therefore a first-class concern, not an afterthought: a full
// factory pass is ~6.7k calls, and the free tier only yields it at ~10 req/s.

export interface RpcOptions {
  /** Ordered endpoints. First is primary; later ones are only tried if it hard-fails. */
  endpoints?: string[];
  /** Max in-flight requests. >3 on the free tier produces 429 storms. */
  concurrency?: number;
  maxRetries?: number;
  fetchImpl?: typeof fetch;
}

const DEFAULT_ENDPOINTS = ["https://free.rpc.fastnear.com"];

export class RpcError extends Error {
  constructor(message: string, readonly endpoint: string, readonly status?: number) {
    super(message);
    this.name = "RpcError";
  }
}

/** Minimal promise semaphore — keeps us under the free tier's ceiling. */
class Gate {
  private active = 0;
  private queue: (() => void)[] = [];
  constructor(private readonly limit: number) {}
  async run<T>(fn: () => Promise<T>): Promise<T> {
    if (this.active >= this.limit) await new Promise<void>((r) => this.queue.push(r));
    this.active++;
    try {
      return await fn();
    } finally {
      this.active--;
      this.queue.shift()?.();
    }
  }
}

export class NearRpc {
  private readonly endpoints: string[];
  private readonly maxRetries: number;
  private readonly gate: Gate;
  private readonly fetchImpl: typeof fetch;
  /** Observability: the indexer reports these so we can see drift/throttling over time. */
  readonly stats = { calls: 0, retries: 0, throttled: 0 };

  constructor(opts: RpcOptions = {}) {
    this.endpoints = opts.endpoints?.length ? opts.endpoints : DEFAULT_ENDPOINTS;
    this.maxRetries = opts.maxRetries ?? 6;
    this.gate = new Gate(opts.concurrency ?? 3);
    this.fetchImpl = opts.fetchImpl ?? fetch;
  }

  private async once(endpoint: string, payload: unknown): Promise<any> {
    const res = await this.fetchImpl(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.status === 429) throw new RpcError("rate limited", endpoint, 429);
    if (!res.ok) throw new RpcError(`http ${res.status}`, endpoint, res.status);
    const json: any = await res.json();
    // A JSON-RPC 200 can still carry an error body; surface it as a throw.
    if (json?.error) throw new RpcError(JSON.stringify(json.error).slice(0, 200), endpoint);
    return json.result;
  }

  async call(payload: unknown): Promise<any> {
    return this.gate.run(async () => {
      let lastErr: unknown;
      for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
        // Stay on the primary; only reach for a fallback once the primary is exhausted.
        const endpoint =
          attempt < this.maxRetries || this.endpoints.length === 1
            ? this.endpoints[0]!
            : this.endpoints[1]!;
        try {
          this.stats.calls++;
          return await this.once(endpoint, payload);
        } catch (err) {
          lastErr = err;
          if (err instanceof RpcError && err.status === 429) this.stats.throttled++;
          if (attempt === this.maxRetries) break;
          this.stats.retries++;
          // Exponential backoff + jitter; jitter matters because our own pool
          // would otherwise retry in lockstep and re-trigger the limit.
          const wait = Math.min(8000, 400 * 2 ** attempt) * (0.5 + Math.random());
          await new Promise((r) => setTimeout(r, wait));
        }
      }
      throw lastErr;
    });
  }

  /** Contract view call. Returns parsed JSON of the method's return value. */
  async view<T = unknown>(accountId: string, method: string, args?: unknown): Promise<T> {
    const argsB64 = args === undefined ? "" : b64encode(JSON.stringify(args));
    const result = await this.call({
      jsonrpc: "2.0",
      id: "1",
      method: "query",
      params: {
        request_type: "call_function",
        finality: "final",
        account_id: accountId,
        method_name: method,
        args_base64: argsB64,
      },
    });
    if (result?.error) throw new RpcError(String(result.error).slice(0, 200), this.endpoints[0]!);
    return JSON.parse(new TextDecoder().decode(Uint8Array.from(result.result as number[]))) as T;
  }

  async viewAccount(accountId: string): Promise<{
    amount: string;
    locked: string;
    storage_usage: number;
    code_hash: string;
  }> {
    return this.call({
      jsonrpc: "2.0",
      id: "1",
      method: "query",
      params: { request_type: "view_account", finality: "final", account_id: accountId },
    });
  }
}

function b64encode(s: string): string {
  // Works in Workers and Node without pulling a dep.
  if (typeof btoa === "function") return btoa(s);
  return Buffer.from(s, "utf8").toString("base64");
}
