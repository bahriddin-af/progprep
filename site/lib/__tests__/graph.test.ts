import { describe, it, expect } from "vitest";
import {
  buildSpine,
  splitSides,
  CANVAS_W,
  SPLIT_AFTER,
  type SpineInput,
} from "../graph";

const topics = (n: number) => Array.from({ length: n }, (_, i) => ({ id: `t${i}` }));

const stages: SpineInput = [
  { id: "s1", topics: topics(3) },
  { id: "s2", topics: topics(2) },
];

describe("spine layout", () => {
  it("har bosqich va mavzu uchun bitta tugun beradi", () => {
    const s = buildSpine(stages);
    expect(s.nodes).toHaveLength(2 + 5);
  });

  it("oz mavzu bo'lsa tomonlar bosqichma-bosqich almashadi", () => {
    expect(splitSides(topics(4), 0).right).toHaveLength(4);
    expect(splitSides(topics(4), 1).left).toHaveLength(4);
  });

  it("mavzu ko'p bo'lsa ikki tomonga taqsimlanadi", () => {
    const { left, right } = splitSides(topics(SPLIT_AFTER + 1), 0);
    expect(left.length).toBeGreaterThan(0);
    expect(right.length).toBeGreaterThan(0);
    expect(left.length + right.length).toBe(SPLIT_AFTER + 1);
    expect(Math.abs(right.length - left.length)).toBeLessThanOrEqual(1);
  });

  it("tugunlar kesishmaydi", () => {
    const s = buildSpine([
      { id: "s1", topics: topics(9) },
      { id: "s2", topics: topics(5) },
      { id: "s3", topics: topics(16) },
    ]);
    for (let i = 0; i < s.nodes.length; i++) {
      for (let j = i + 1; j < s.nodes.length; j++) {
        const a = s.nodes[i];
        const b = s.nodes[j];
        const overlap =
          a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
        expect(overlap, `${a.id} va ${b.id} kesishdi`).toBe(false);
      }
    }
  });

  it("tugunlar kanvas ichida qoladi", () => {
    const s = buildSpine(stages);
    for (const n of s.nodes) {
      expect(n.x).toBeGreaterThanOrEqual(0);
      expect(n.x + n.w).toBeLessThanOrEqual(CANVAS_W);
      expect(n.y + n.h).toBeLessThanOrEqual(s.height);
    }
  });

  it("ketma-ket bosqichlarni magistral tutashtiradi", () => {
    const s = buildSpine(stages);
    const spineEdges = s.edges.filter((e) => e.kind === "spine");
    expect(spineEdges).toHaveLength(1);
    expect(spineEdges[0].id).toBe("spine-s2");
  });

  it("har mavzuga bitta tarmoq chizig'i to'g'ri keladi", () => {
    const s = buildSpine(stages);
    const branches = s.edges.filter((e) => e.kind === "branch");
    expect(branches).toHaveLength(5);
    for (const e of branches) {
      expect(e.d).toMatch(/^M [\d.]+ [\d.]+ H [\d.]+ V [\d.]+ H [\d.]+$/);
    }
  });

  it("bo'sh ro'yxatda balandlik nol", () => {
    expect(buildSpine([]).height).toBe(0);
  });
});
