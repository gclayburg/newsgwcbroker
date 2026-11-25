// Server-side client for the Private Handle gateway of news.gwcbroker.com.
//
// Configuration (server-side environment variables only; never NEXT_PUBLIC_*):
//   GATEWAY_URL      e.g. https://register.privatehandle.com/owner/news.gwcbroker.com
//   GATEWAY_API_KEY  the gateway's single full-rights API key
//
// Browsers must never call the gateway: the key would leak. Import this module
// only from route handlers / server code.

export type GatewayResult = {
  status: number;
  body: Record<string, unknown> | null;
};

export class GatewayConfigError extends Error {}

function config(): { url: string; key: string } {
  const url = process.env.GATEWAY_URL?.trim().replace(/\/+$/, "");
  const key = process.env.GATEWAY_API_KEY?.trim();
  if (!url || !key) throw new GatewayConfigError("GATEWAY_URL and GATEWAY_API_KEY must be set");
  const local = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?(\/|$)/.test(url); // local mock only
  if (!url.startsWith("https://") && !local) {
    throw new GatewayConfigError("GATEWAY_URL must use https://");
  }
  return { url, key };
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * POST JSON to a gateway API route. Retries 429 (honouring Retry-After), 503
 * and network errors a few times with the SAME body, so the request id makes
 * the retry safe. Gives up after ~25 s so the caller can retry later.
 */
export async function gatewayPost(path: string, body: unknown): Promise<GatewayResult> {
  const { url, key } = config();
  const deadline = Date.now() + 25_000;
  let delay = 1_000;
  for (let attempt = 1; ; attempt++) {
    let res: Response | undefined;
    try {
      res = await fetch(`${url}${path}`, {
        method: "POST",
        headers: { "X-Gateway-Api-Key": key, "Content-Type": "application/json" },
        body: JSON.stringify(body),
        cache: "no-store",
        signal: AbortSignal.timeout(15_000),
      });
    } catch (err) {
      if (attempt >= 4 || Date.now() + delay > deadline) {
        return { status: 0, body: { error: "network_error", message: String(err) } };
      }
    }
    if (res) {
      const parsed = (await res.json().catch(() => null)) as Record<string, unknown> | null;
      const retryable = res.status === 429 || res.status === 503;
      if (!retryable) return { status: res.status, body: parsed };
      const after = Number(res.headers.get("retry-after"));
      if (Number.isFinite(after) && after > 0) delay = Math.max(delay, after * 1000);
      if (attempt >= 4 || Date.now() + delay > deadline) return { status: res.status, body: parsed };
    }
    await sleep(delay);
    delay = Math.min(delay * 2, 10_000);
  }
}
