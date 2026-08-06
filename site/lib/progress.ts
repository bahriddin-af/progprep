// Sof mantiq — React'siz, brauzersiz test qilinadi.

export type Status = "none" | "learning" | "done" | "skip";

export type ProgressEntry = { status: Status; updatedAt: number };
export type ProgressMap = Record<string, ProgressEntry>;

export const STATUS_ORDER: Status[] = ["none", "learning", "done", "skip"];

export const STATUS_LABEL: Record<Status, string> = {
  none: "Boshlanmagan",
  learning: "Jarayonda",
  done: "Tugatildi",
  skip: "O'tkazildi",
};

export function statusOf(progress: ProgressMap, topicId: string): Status {
  return progress[topicId]?.status ?? "none";
}

export function setStatus(
  progress: ProgressMap,
  topicId: string,
  status: Status,
  now: number = Date.now(),
): ProgressMap {
  if (status === "none") {
    const { [topicId]: _removed, ...rest } = progress;
    return rest;
  }
  return { ...progress, [topicId]: { status, updatedAt: now } };
}

/** Bir xil tugmani qayta bosish holatni bekor qiladi. */
export function toggleStatus(
  progress: ProgressMap,
  topicId: string,
  status: Status,
  now: number = Date.now(),
): ProgressMap {
  const next = statusOf(progress, topicId) === status ? "none" : status;
  return setStatus(progress, topicId, next, now);
}

export function countByStatus(progress: ProgressMap, topicIds: string[]) {
  const counts: Record<Status, number> = { none: 0, learning: 0, done: 0, skip: 0 };
  for (const id of topicIds) counts[statusOf(progress, id)]++;
  return counts;
}

/** Tugatilgan + o'tkazilgan = hisobga olingan. */
export function completionPercent(progress: ProgressMap, topicIds: string[]): number {
  if (topicIds.length === 0) return 0;
  const c = countByStatus(progress, topicIds);
  return Math.round(((c.done + c.skip) / topicIds.length) * 100);
}

/**
 * Ikki qurilma orasidagi konflikt: oxirgi yozilgani yutadi.
 * Pul emas — murakkab birlashtirish kerak emas.
 */
export function mergeProgress(a: ProgressMap, b: ProgressMap): ProgressMap {
  const out: ProgressMap = { ...a };
  for (const [id, entry] of Object.entries(b)) {
    const mine = out[id];
    if (!mine || entry.updatedAt > mine.updatedAt) out[id] = entry;
  }
  return out;
}
