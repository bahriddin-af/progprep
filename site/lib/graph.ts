// roadmap.sh uslubidagi joylashuv: markazda magistral, chap va o'ngga tarmoqlar.
// React'siz, DOM'siz — sof hisob, unit test qilinadi.

export type Side = "center" | "left" | "right";

export type SpineNode = {
  id: string;
  kind: "stage" | "topic";
  side: Side;
  x: number;
  y: number;
  w: number;
  h: number;
};

/** SVG `path` uchun tayyor `d` — komponentda hech narsa hisoblanmaydi. */
export type SpineEdge = {
  id: string;
  kind: "spine" | "branch";
  d: string;
};

export type Spine = {
  nodes: SpineNode[];
  edges: SpineEdge[];
  width: number;
  height: number;
};

export type SpineInput = {
  id: string;
  topics: { id: string }[];
}[];

export const STAGE_W = 356;
export const STAGE_H = 60;
export const TOPIC_W = 300;
export const TOPIC_H = 48;
export const TOPIC_GAP = 12;
export const COL_GAP = 80;
export const STAGE_GAP = 64;

/** Bir tomonda ustun bo'lib turaverishi qulay bo'lgan maksimal mavzu soni. */
export const SPLIT_AFTER = 6;

export const CANVAS_W = STAGE_W + 2 * COL_GAP + 2 * TOPIC_W;

const CENTER = CANVAS_W / 2;
const STAGE_X = CENTER - STAGE_W / 2;
const RIGHT_X = CENTER + STAGE_W / 2 + COL_GAP;
const LEFT_X = CENTER - STAGE_W / 2 - COL_GAP - TOPIC_W;

/** Tarmoq shinasi — tarmoqlar shu vertikal chiziqda yig'ilib, keyin tarqaladi. */
const RIGHT_BUS = CENTER + STAGE_W / 2 + COL_GAP / 2;
const LEFT_BUS = CENTER - STAGE_W / 2 - COL_GAP / 2;

function columnHeight(n: number): number {
  return n === 0 ? 0 : n * TOPIC_H + (n - 1) * TOPIC_GAP;
}

/**
 * Mavzularni tomonlarga bo'ladi. Kam bo'lsa — bitta tomon, bosqichma-bosqich
 * almashadi (zigzag). Ko'p bo'lsa — ikkiga bo'linadi, aks holda ustun
 * cho'zilib, magistral uzilib qoladi.
 */
export function splitSides<T>(
  items: T[],
  stageIndex: number,
): { left: T[]; right: T[] } {
  if (items.length <= SPLIT_AFTER) {
    return stageIndex % 2 === 0 ? { left: [], right: items } : { left: items, right: [] };
  }
  const half = Math.ceil(items.length / 2);
  return { left: items.slice(half), right: items.slice(0, half) };
}

function branchPath(
  fromX: number,
  fromY: number,
  busX: number,
  toX: number,
  toY: number,
): string {
  return `M ${fromX} ${fromY} H ${busX} V ${toY} H ${toX}`;
}

export function buildSpine(stages: SpineInput): Spine {
  const nodes: SpineNode[] = [];
  const edges: SpineEdge[] = [];

  let y = 0;
  let previousBottom: number | undefined;

  stages.forEach((stage, si) => {
    const { left, right } = splitSides(stage.topics, si);
    const blockH = Math.max(
      columnHeight(left.length),
      columnHeight(right.length),
      STAGE_H,
    );

    const stageY = y + (blockH - STAGE_H) / 2;
    nodes.push({
      id: stage.id,
      kind: "stage",
      side: "center",
      x: STAGE_X,
      y: stageY,
      w: STAGE_W,
      h: STAGE_H,
    });

    if (previousBottom !== undefined) {
      edges.push({
        id: `spine-${stage.id}`,
        kind: "spine",
        d: `M ${CENTER} ${previousBottom} V ${stageY}`,
      });
    }
    previousBottom = stageY + STAGE_H;

    const stageMidY = stageY + STAGE_H / 2;

    const place = (list: { id: string }[], side: "left" | "right") => {
      const top = y + (blockH - columnHeight(list.length)) / 2;
      list.forEach((topic, i) => {
        const ty = top + i * (TOPIC_H + TOPIC_GAP);
        const x = side === "right" ? RIGHT_X : LEFT_X;
        nodes.push({ id: topic.id, kind: "topic", side, x, y: ty, w: TOPIC_W, h: TOPIC_H });
        edges.push({
          id: `branch-${topic.id}`,
          kind: "branch",
          d:
            side === "right"
              ? branchPath(STAGE_X + STAGE_W, stageMidY, RIGHT_BUS, x, ty + TOPIC_H / 2)
              : branchPath(STAGE_X, stageMidY, LEFT_BUS, x + TOPIC_W, ty + TOPIC_H / 2),
        });
      });
    };

    place(right, "right");
    place(left, "left");

    y += blockH + STAGE_GAP;
  });

  return {
    nodes,
    edges,
    width: CANVAS_W,
    height: Math.max(0, y - STAGE_GAP),
  };
}
