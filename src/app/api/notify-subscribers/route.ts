// POST /api/notify-subscribers: message every Private Handle subscriber a
// summary of the latest edition (every story, in homepage order).
//
// Called by .github/workflows/notify-subscribers.yml after Vercel reports a
// successful production deployment. Not for browsers.
//
// Auth: `Authorization: Bearer <NOTIFY_SECRET>`. Without NOTIFY_SECRET set (at
// least 16 characters) every request is refused.
//
// Body (JSON, optional):
//   editionId  the edition the caller expects to be latest, e.g. "2026-11-25-0841".
//              If this deployment's latest edition differs, nothing is sent (409),
//              so a late notification for an older deployment can't go out.
//   dryRun     true = build and return the message without sending it.
//
// Safe to call repeatedly: the gateway batch requestId is "edition-<id>", so a
// repeat for the same edition sends nothing new (status "already-sent").

import { createHash, timingSafeEqual } from "node:crypto";
import { getLatestEdition, IS_SANDBOX } from "@/lib/editions";
import { gatewayPost, GatewayConfigError } from "@/lib/gateway";
import { buildSubscriberMessage } from "@/lib/subscriber-message";

/** Seconds SignalBoot keeps retrying offline devices: news is stale after 2 days. */
const DELIVERY_DEADLINE_SECONDS = 2 * 24 * 60 * 60;

const json = (status: number, body: Record<string, unknown>) =>
  Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

/** Shortest NOTIFY_SECRET accepted (16+ random characters). */
const MIN_SECRET_LENGTH = 16;

function authorized(request: Request): boolean | "missing" | "too-short" {
  const secret = process.env.NOTIFY_SECRET?.trim();
  if (!secret) return "missing";
  if (secret.length < MIN_SECRET_LENGTH) return "too-short";
  const header = request.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  // Compare fixed-length digests so the comparison time reveals nothing.
  const digest = (s: string) => createHash("sha256").update(s).digest();
  return timingSafeEqual(digest(token), digest(secret));
}

export async function POST(request: Request) {
  const auth = authorized(request);
  if (auth === "missing" || auth === "too-short") {
    // Says why, but nothing about the value itself.
    return json(503, {
      error: "notify_not_configured",
      reason: auth === "missing" ? "NOTIFY_SECRET is not set" : `NOTIFY_SECRET is shorter than ${MIN_SECRET_LENGTH} characters`,
    });
  }
  if (!auth) return json(401, { error: "unauthorized" });

  let input: { editionId?: unknown; dryRun?: unknown } = {};
  const raw = await request.text();
  if (raw.trim()) {
    try {
      input = JSON.parse(raw);
    } catch {
      return json(400, { error: "invalid_json" });
    }
  }
  const dryRun = input.dryRun === true;

  const edition = getLatestEdition();
  if (!edition) return json(404, { error: "no_edition" });
  if (input.editionId !== undefined && input.editionId !== edition.id) {
    return json(409, {
      error: "edition_mismatch",
      expected: input.editionId,
      latest: edition.id,
    });
  }

  const message = buildSubscriberMessage(edition);
  const summary = {
    editionId: edition.id,
    requestId: message.requestId,
    stories: edition.stories.length,
    detail: message.detail,
    textBytes: Buffer.byteLength(message.text, "utf8"),
  };
  if (dryRun) return json(200, { status: "dry-run", ...summary, subject: message.subject, text: message.text });
  // Never send made-up sandbox editions to real subscribers.
  if (IS_SANDBOX) return json(403, { error: "sandbox_send_refused", ...summary });

  let result;
  try {
    result = await gatewayPost("/api/owner-message-batches", {
      requestId: message.requestId,
      everyCustomer: {
        text: message.text,
        thread: { subject: message.subject, kind: "edition" },
        deliveryDeadlineSeconds: DELIVERY_DEADLINE_SECONDS,
      },
    });
  } catch (err) {
    if (err instanceof GatewayConfigError) return json(503, { error: "gateway_not_configured", message: err.message });
    throw err;
  }

  const gw = result.body ?? {};
  const batch = { batchId: gw.batchId, gatewayStatus: result.status };
  switch (result.status) {
    case 202:
      return json(202, { status: "sent", ...summary, ...batch });
    case 200:
      return json(200, { status: "already-sent", ...summary, ...batch });
    case 409:
      if (gw.error === "request_id_conflict") {
        // This edition was already sent, and its message has changed since
        // (the edition was corrected, or the message format changed).
        // Subscribers are not notified again.
        return json(200, { status: "already-sent-content-changed", ...summary, ...batch });
      }
      return json(502, { error: "gateway_refused", ...summary, ...batch, gateway: gw });
    default:
      return json(502, { error: "gateway_error", ...summary, ...batch, gateway: gw });
  }
}
