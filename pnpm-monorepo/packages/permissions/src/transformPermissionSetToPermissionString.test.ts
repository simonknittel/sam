import { describe, expect, test } from "vitest";
import {
  transformPermissionSetToPermissionString,
  transformPermissionStringToPermissionSet,
} from "./index.js";

describe("transform permission set to permission string", () => {
  test("joins resource and operation", () => {
    expect(
      transformPermissionSetToPermissionString({
        resource: "wiki",
        operation: "read",
      }),
    ).toBe("wiki;read");
  });

  test("appends attributes in their original order", () => {
    expect(
      transformPermissionSetToPermissionString({
        resource: "note",
        operation: "manage",
        attributes: [
          { key: "noteTypeId", value: "1" },
          { key: "classificationLevelId", value: "2" },
        ],
      }),
    ).toBe("note;manage;noteTypeId=1;classificationLevelId=2");
  });

  test("serializes boolean attribute values the way the comparison reads them", () => {
    expect(
      transformPermissionSetToPermissionString({
        resource: "citizen",
        operation: "read",
        attributes: [{ key: "confirmed", value: true }],
      }),
    ).toBe("citizen;read;confirmed=true");
  });
});

describe("permission string round trip", () => {
  const permissionStrings = [
    "wiki;read",
    "event;manage",
    "otherRole;read;roleId=clhaw95yi0000jr08ybuvy137",
    "citizen;read;confirmed=true",
    "note;manage;noteTypeId=1;classificationLevelId=2",
    "task;read;taskVisibility=*;taskRewardType=silc;taskDeleted=false",
  ];

  test.for(permissionStrings)(
    "survives parsing and serializing: %s",
    (permissionString) => {
      expect(
        transformPermissionSetToPermissionString(
          transformPermissionStringToPermissionSet(permissionString),
        ),
      ).toBe(permissionString);
    },
  );
});
