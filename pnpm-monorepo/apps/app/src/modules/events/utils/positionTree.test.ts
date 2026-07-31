import { describe, expect, it } from "vitest";
import {
  buildPositionTree,
  canPasteSubtree,
  getPositionLevel,
  getPositionSubtree,
  getSubtreeDepth,
  getSubtreeSize,
  MAX_LINEUP_DEPTH,
} from "./positionTree";

/**
 * ```
 * alpha
 *   alphaOne
 *     alphaOneDeep
 *   alphaTwo
 * bravo
 * ```
 */
const positions = [
  { id: "alpha", parentPositionId: null },
  { id: "alphaOne", parentPositionId: "alpha" },
  { id: "alphaOneDeep", parentPositionId: "alphaOne" },
  { id: "alphaTwo", parentPositionId: "alpha" },
  { id: "bravo", parentPositionId: null },
];

describe("getSubtreeDepth", () => {
  it("returns 1 for a position without child positions", () => {
    expect(getSubtreeDepth({ childPositions: [] })).toBe(1);
    expect(getSubtreeDepth({})).toBe(1);
  });

  it("returns the depth of the deepest branch", () => {
    const tree = buildPositionTree(positions);

    expect(getSubtreeDepth(tree[0])).toBe(3);
    expect(getSubtreeDepth(tree[1])).toBe(1);
  });
});

describe("getSubtreeSize", () => {
  it("counts the position itself and all of its descendants", () => {
    const tree = buildPositionTree(positions);

    expect(getSubtreeSize(tree[0])).toBe(4);
    expect(getSubtreeSize(tree[1])).toBe(1);
  });
});

describe("canPasteSubtree", () => {
  it("allows a subtree which fits into the remaining levels", () => {
    expect(canPasteSubtree(0, MAX_LINEUP_DEPTH)).toBe(true);
    expect(canPasteSubtree(3, 1)).toBe(true);
  });

  it("rejects a subtree which would exceed the maximum depth", () => {
    expect(canPasteSubtree(1, MAX_LINEUP_DEPTH)).toBe(false);
    expect(canPasteSubtree(3, 2)).toBe(false);
  });
});

describe("buildPositionTree", () => {
  it("nests child positions below their parent position", () => {
    const tree = buildPositionTree(positions);

    expect(tree.map((position) => position.id)).toEqual(["alpha", "bravo"]);
    expect(tree[0].childPositions.map((position) => position.id)).toEqual([
      "alphaOne",
      "alphaTwo",
    ]);
    expect(
      tree[0].childPositions[0].childPositions.map((position) => position.id),
    ).toEqual(["alphaOneDeep"]);
  });

  it("keeps the order of the given list", () => {
    const tree = buildPositionTree([...positions].toReversed());

    expect(tree.map((position) => position.id)).toEqual(["bravo", "alpha"]);
    expect(tree[1].childPositions.map((position) => position.id)).toEqual([
      "alphaTwo",
      "alphaOne",
    ]);
  });
});

describe("getPositionSubtree", () => {
  it("returns the position including its descendants", () => {
    const subtree = getPositionSubtree(positions, "alphaOne");

    expect(subtree?.id).toBe("alphaOne");
    expect(subtree?.childPositions.map((position) => position.id)).toEqual([
      "alphaOneDeep",
    ]);
  });

  it("returns null for a position of another event", () => {
    expect(getPositionSubtree(positions, "charlie")).toBeNull();
  });
});

describe("getPositionLevel", () => {
  it("returns the number of levels above the position", () => {
    expect(getPositionLevel(positions, "alpha")).toBe(1);
    expect(getPositionLevel(positions, "alphaOne")).toBe(2);
    expect(getPositionLevel(positions, "alphaOneDeep")).toBe(3);
  });

  it("terminates on a cyclic parent chain", () => {
    const cyclicPositions = [
      { id: "alpha", parentPositionId: "bravo" },
      { id: "bravo", parentPositionId: "alpha" },
    ];

    expect(getPositionLevel(cyclicPositions, "alpha")).toBe(2);
  });
});
