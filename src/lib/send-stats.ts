// Read-only delivery statistics for /analytics, from the Private Handle gateway.
//
// The latest send is found by its request id, "edition-<edition id>" (see
// subscriber-message.ts), via GET /api/owner-message-batches?requestId=…, so
// the site needs no storage of its own. Only counts leave this module: never
// aliases or other per-subscriber data.

import { getAllEditions, type Edition } from "@/lib/editions";
import { gatewayGet } from "@/lib/gateway";
import { requestIdFor } from "@/lib/subscriber-message";

/** How many recent editions to check for the most recent one that was sent. */
const EDITIONS_TO_CHECK = 5;
/** Most failed messages to open to tally failure reasons (one request each). */
const MAX_FAILURE_LOOKUPS = 25;

const EXT = "urn:privatehandle:scim:schemas:extension:2.0:User";

type DeviceCounts = { total: number; delivered: number; accepted: number; pending: number; failed: number };
type BatchItem = { state?: string; error?: string; broadcastId?: string; devices?: Partial<DeviceCounts> };
type BatchView = {
  batchId?: string;
  state?: string;
  createdAt?: string;
  counts?: Record<string, number>;
  items?: BatchItem[];
};

export type SendStats = {
  edition: Edition;
  /** Editions newer than this one that were not sent (or not yet). */
  newerUnsent: Edition[];
  batchId: string;
  state: string;
  createdAt?: string;
  handles: number;
  handlesRefused: number;
  handlesReached: number;
  handlesMultiDevice: number;
  devices: DeviceCounts;
  failureReasons: Record<string, number>;
  failureReasonsPartial: boolean;
};

export type LatestSend =
  | { kind: "found"; stats: SendStats }
  | { kind: "none"; checked: Edition[] }
  | { kind: "error"; message: string };

const n = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : 0);

async function failureReasons(items: BatchItem[]) {
  const failed = items.filter((i) => n(i.devices?.failed) > 0 && i.broadcastId);
  const reasons: Record<string, number> = {};
  await Promise.all(
    failed.slice(0, MAX_FAILURE_LOOKUPS).map(async (i) => {
      const r = await gatewayGet(`/api/owner-messages/${encodeURIComponent(i.broadcastId!)}`);
      const devices = Array.isArray(r.body?.devices) ? (r.body.devices as { state?: string; reason?: string | null }[]) : [];
      for (const d of devices) {
        if (d.state !== "failed") continue;
        const key = d.reason || "undeliverable";
        reasons[key] = (reasons[key] ?? 0) + 1;
      }
    }),
  );
  return { reasons, partial: failed.length > MAX_FAILURE_LOOKUPS };
}

function summarize(edition: Edition, newerUnsent: Edition[], batch: BatchView) {
  const items = Array.isArray(batch.items) ? batch.items : [];
  const devices: DeviceCounts = { total: 0, delivered: 0, accepted: 0, pending: 0, failed: 0 };
  let refused = 0, reached = 0, multi = 0;
  for (const item of items) {
    if (item.state === "refused") refused++;
    const d = item.devices ?? {};
    for (const k of Object.keys(devices) as (keyof DeviceCounts)[]) devices[k] += n(d[k]);
    if (n(d.delivered) > 0) reached++;
    if (n(d.total) > 1) multi++;
  }
  return {
    edition,
    newerUnsent,
    batchId: String(batch.batchId ?? ""),
    state: String(batch.state ?? "unknown"),
    createdAt: batch.createdAt,
    handles: items.length,
    handlesRefused: refused,
    handlesReached: reached,
    handlesMultiDevice: multi,
    devices,
    items,
  };
}

/** The most recent edition that was sent to subscribers, with live delivery counts. */
export async function getLatestSend(): Promise<LatestSend> {
  const recent = getAllEditions().slice(0, EDITIONS_TO_CHECK);
  for (const [i, edition] of recent.entries()) {
    const r = await gatewayGet(
      `/api/owner-message-batches?requestId=${encodeURIComponent(requestIdFor(edition))}`,
    );
    if (r.status === 200 && r.body && Array.isArray(r.body.items)) {
      const { items, ...stats } = summarize(edition, recent.slice(0, i), r.body as BatchView);
      const { reasons, partial } = await failureReasons(items);
      return { kind: "found", stats: { ...stats, failureReasons: reasons, failureReasonsPartial: partial } };
    }
    if (r.status === 404 && r.body?.error === "not_found") continue; // this edition wasn't sent
    if (r.status === 0) return { kind: "error", message: "The gateway could not be reached." };
    if (r.status === 401) return { kind: "error", message: "The gateway refused the API key." };
    // Anything else most likely means the gateway doesn't offer lookup by request id yet.
    return {
      kind: "error",
      message: `Looking up sends by edition is not available on the gateway yet (HTTP ${r.status}).`,
    };
  }
  return { kind: "none", checked: recent };
}

export type SubscriberStats =
  | { kind: "ok"; active: number; departed: number | null; devices: number; multiDevice: number }
  | { kind: "error"; message: string };

/** Who has added news.gwcbroker.com right now (independent of any send). */
export async function getSubscriberStats(): Promise<SubscriberStats> {
  let active = 0, devices = 0, multi = 0, total = 0;
  for (let start = 1; ; start += 500) {
    const r = await gatewayGet(`/api/scim/v2/Users?filter=${encodeURIComponent("active eq true")}&count=500&startIndex=${start}`);
    if (r.status !== 200 || !r.body) return { kind: "error", message: `The subscriber list is unavailable (HTTP ${r.status}).` };
    const users = Array.isArray(r.body.Resources) ? (r.body.Resources as Record<string, unknown>[]) : [];
    for (const u of users) {
      const ext = (u[EXT] ?? {}) as { devices?: unknown[] };
      const count = Array.isArray(ext.devices) ? ext.devices.length : 0;
      active++;
      devices += count;
      if (count > 1) multi++;
    }
    if (users.length < 500) break;
  }
  const all = await gatewayGet(`/api/scim/v2/Users?count=0`);
  if (all.status === 200) total = n(all.body?.totalResults);
  const departed = all.status === 200 ? Math.max(0, total - active) : null;
  return { kind: "ok", active, departed, devices, multiDevice: multi };
}
