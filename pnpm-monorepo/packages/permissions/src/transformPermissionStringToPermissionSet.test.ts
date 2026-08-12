import { describe, expect, test } from "vitest";
import { transformPermissionStringToPermissionSet } from "./index.js";

describe("transform permission string to permission set", () => {
  test("splits resource and operation", () => {
    expect(transformPermissionStringToPermissionSet("wiki;read")).toEqual({
      resource: "wiki",
      operation: "read",
    });
  });

  test("omits the attributes key when there are none", () => {
    expect(
      transformPermissionStringToPermissionSet("wiki;read"),
    ).not.toHaveProperty("attributes");
  });

  test("parses attributes into key/value pairs", () => {
    expect(
      transformPermissionStringToPermissionSet(
        "note;manage;noteTypeId=1;classificationLevelId=2",
      ),
    ).toEqual({
      resource: "note",
      operation: "manage",
      attributes: [
        { key: "noteTypeId", value: "1" },
        { key: "classificationLevelId", value: "2" },
      ],
    });
  });

  test("rejects a string without an operation", () => {
    expect(() => transformPermissionStringToPermissionSet("wiki")).toThrow();
    expect(() => transformPermissionStringToPermissionSet("wiki;")).toThrow();
    expect(() => transformPermissionStringToPermissionSet("")).toThrow();
  });

  test("rejects attributes without a key or value", () => {
    expect(() =>
      transformPermissionStringToPermissionSet("note;manage;noteTypeId"),
    ).toThrow();
    expect(() =>
      transformPermissionStringToPermissionSet("note;manage;noteTypeId="),
    ).toThrow();
    expect(() =>
      transformPermissionStringToPermissionSet("note;manage;=1"),
    ).toThrow();
  });
});
