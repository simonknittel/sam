import { describe, expect, test } from "vitest";
import { getPermissionSetsByRoles } from "./index.js";

const roleWith = (...permissionStrings: string[]) => ({
  permissionStrings: permissionStrings.map((permissionString) => ({
    permissionString,
  })),
});

describe("get permission sets by roles", () => {
  test("returns no permission sets for no roles", () => {
    expect(getPermissionSetsByRoles([])).toEqual([]);
  });

  test("returns no permission sets for roles without permission strings", () => {
    expect(getPermissionSetsByRoles([roleWith(), roleWith()])).toEqual([]);
  });

  test("flattens the permission strings of all roles in order", () => {
    expect(
      getPermissionSetsByRoles([
        roleWith("wiki;read", "note;manage;noteTypeId=1"),
        roleWith("task;read"),
      ]),
    ).toEqual([
      { resource: "wiki", operation: "read" },
      {
        resource: "note",
        operation: "manage",
        attributes: [{ key: "noteTypeId", value: "1" }],
      },
      { resource: "task", operation: "read" },
    ]);
  });

  test("keeps permission sets granted by more than one role", () => {
    expect(
      getPermissionSetsByRoles([roleWith("wiki;read"), roleWith("wiki;read")]),
    ).toEqual([
      { resource: "wiki", operation: "read" },
      { resource: "wiki", operation: "read" },
    ]);
  });

  test("propagates invalid permission strings as errors", () => {
    expect(() => getPermissionSetsByRoles([roleWith("wiki")])).toThrow();
  });
});
