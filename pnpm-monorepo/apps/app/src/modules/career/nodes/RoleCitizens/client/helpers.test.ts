import { describe, expect, test } from "vitest";
import { isUnlocked } from "./helpers";

describe("isUnlocked", () => {
  test("a", () => {
    const role = {
      id: "1",
    };
    const assignedRoles = [
      {
        id: "1",
        inherits: [],
      },
    ];
    expect(isUnlocked(role, assignedRoles)).toBe(true);
  });

  test("b", () => {
    const role = {
      id: "1",
    };
    const assignedRoles = [
      {
        id: "2",
        inherits: [],
      },
    ];
    expect(isUnlocked(role, assignedRoles)).toBe(false);
  });

  test("c", () => {
    const role = {
      id: "1",
    };
    const assignedRoles = [
      {
        id: "2",
        inherits: [
          {
            id: "1",
          },
        ],
      },
    ];
    expect(isUnlocked(role, assignedRoles)).toBe(true);
  });

  test("d", () => {
    const role = {
      id: "1",
    };
    const assignedRoles = [
      {
        id: "2",
        inherits: [
          {
            id: "3",
          },
        ],
      },
    ];
    expect(isUnlocked(role, assignedRoles)).toBe(false);
  });
});
