import { appendVitalsEntry } from "../../../utils/vitals-store";

export default defineEventHandler(async (event) => {
  const parsed = await readBody(event);
  const items = Array.isArray((parsed as { metrics?: unknown[] })?.metrics)
    ? (parsed as { metrics: Record<string, unknown>[] }).metrics
    : [parsed as Record<string, unknown>];
  let stored = 0;
  let skipped = 0;
  let invalid = 0;
  for (const item of items) {
    const r = appendVitalsEntry(item);
    if (r === "stored") stored += 1;
    else if (r === "skipped") skipped += 1;
    else invalid += 1;
  }
  return { ok: true, stored, skipped, invalid };
});
