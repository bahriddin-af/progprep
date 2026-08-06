import { describe, it, expect } from "vitest";
import {
  setStatus,
  toggleStatus,
  statusOf,
  completionPercent,
  countByStatus,
  mergeProgress,
  type ProgressMap,
} from "../progress";

describe("progress", () => {
  it("holatni o'rnatadi va o'qiydi", () => {
    const p = setStatus({}, "m1-1", "done", 100);
    expect(statusOf(p, "m1-1")).toBe("done");
    expect(statusOf(p, "yo-q")).toBe("none");
  });

  it("none — yozuvni butunlay olib tashlaydi", () => {
    const p = setStatus(setStatus({}, "m1-1", "done", 100), "m1-1", "none", 200);
    expect(Object.keys(p)).toHaveLength(0);
  });

  it("bir xil tugmani qayta bosish bekor qiladi", () => {
    let p = toggleStatus({}, "m1-1", "done", 100);
    expect(statusOf(p, "m1-1")).toBe("done");
    p = toggleStatus(p, "m1-1", "done", 200);
    expect(statusOf(p, "m1-1")).toBe("none");
  });

  it("boshqa tugma holatni almashtiradi", () => {
    let p = toggleStatus({}, "m1-1", "learning", 100);
    p = toggleStatus(p, "m1-1", "done", 200);
    expect(statusOf(p, "m1-1")).toBe("done");
  });

  it("tugatilgan va o'tkazilgan — ikkalasi ham hisobga olinadi", () => {
    let p: ProgressMap = {};
    p = setStatus(p, "a", "done", 1);
    p = setStatus(p, "b", "skip", 1);
    p = setStatus(p, "c", "learning", 1);
    expect(completionPercent(p, ["a", "b", "c", "d"])).toBe(50);
  });

  it("bo'sh ro'yxat — 0%", () => {
    expect(completionPercent({}, [])).toBe(0);
  });

  it("holatlarni sanaydi", () => {
    const p = setStatus(setStatus({}, "a", "done", 1), "b", "learning", 1);
    expect(countByStatus(p, ["a", "b", "c"])).toEqual({
      none: 1,
      learning: 1,
      done: 1,
      skip: 0,
    });
  });

  it("konfliktda oxirgi yozilgani yutadi", () => {
    const eski: ProgressMap = { a: { status: "learning", updatedAt: 100 } };
    const yangi: ProgressMap = { a: { status: "done", updatedAt: 200 } };
    expect(mergeProgress(eski, yangi).a.status).toBe("done");
    expect(mergeProgress(yangi, eski).a.status).toBe("done");
  });
});
