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

  test("returns a permission set granted by more than one role only once", () => {
    expect(
      getPermissionSetsByRoles([
        roleWith("wiki;read", "task;read"),
        roleWith("wiki;read"),
        roleWith("task;read", "wiki;read"),
      ]),
    ).toEqual([
      { resource: "wiki", operation: "read" },
      { resource: "task", operation: "read" },
    ]);
  });

  test("keeps permission strings which differ only in their attributes", () => {
    expect(
      getPermissionSetsByRoles([
        roleWith("note;manage;noteTypeId=1"),
        roleWith("note;manage;noteTypeId=2"),
      ]),
    ).toEqual([
      {
        resource: "note",
        operation: "manage",
        attributes: [{ key: "noteTypeId", value: "1" }],
      },
      {
        resource: "note",
        operation: "manage",
        attributes: [{ key: "noteTypeId", value: "2" }],
      },
    ]);
  });

  test("propagates invalid permission strings as errors", () => {
    expect(() => getPermissionSetsByRoles([roleWith("wiki")])).toThrow();
  });
});
