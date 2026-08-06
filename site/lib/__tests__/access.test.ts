import { describe, it, expect } from "vitest";
import { freeTopicIds, isFreeTopic, isLocked, FREE_TOPIC_COUNT } from "../access";

const stages = [
  { topics: [{ id: "a" }, { id: "b" }, { id: "c" }] },
  { topics: [{ id: "d" }, { id: "e" }] },
];

describe("kirish huquqi", () => {
  it("ochiq mavzular soni chegaralangan", () => {
    expect(freeTopicIds(stages)).toEqual(["a", "b", "c", "d"]);
    expect(freeTopicIds(stages)).toHaveLength(FREE_TOPIC_COUNT);
  });

  it("mavzu chegaradan kam bo'lsa hammasi ochiq", () => {
    expect(freeTopicIds([{ topics: [{ id: "a" }] }])).toEqual(["a"]);
  });

  it("birinchilar ochiq, keyingilar yopiq", () => {
    expect(isFreeTopic(stages, "a")).toBe(true);
    expect(isFreeTopic(stages, "e")).toBe(false);
  });

  it("kirgan foydalanuvchi uchun hech narsa qulflanmaydi", () => {
    expect(isLocked(stages, "e", true)).toBe(false);
    expect(isLocked(stages, "e", false)).toBe(true);
    expect(isLocked(stages, "a", false)).toBe(false);
  });
});
