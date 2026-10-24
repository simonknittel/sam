import { describe, expect, test } from "vitest";
import { isPermissionRule, PERMISSION_CATALOG } from "./permissionCatalog.js";
import { PERMISSION_STRING_PATTERN } from "./permissionStringPattern.js";

describe("permission catalog", () => {
  test("each string is unique and agrees with the CHECK constraint of the database", () => {
    const permissionStrings = PERMISSION_CATALOG.map(
      (permission) => permission.permissionString,
    );

    expect(new Set(permissionStrings).size).toBe(permissionStrings.length);
    for (const permissionString of permissionStrings)
      expect(permissionString).toMatch(PERMISSION_STRING_PATTERN);
  });

  test("the rules have the format of the role page", () => {
    expect(isPermissionRule("otherRole;assign;roleId=clx123abc")).toBe(true);
    expect(isPermissionRule("otherRole;read;roleId=*")).toBe(true);
    expect(
      isPermissionRule(
        "note;readRedacted;noteTypeId=*;classificationLevelId=clx123abc;alsoUnconfirmed=true",
      ),
    ).toBe(true);

    expect(isPermissionRule("otherRole;read")).toBe(false);
    expect(isPermissionRule("otherRole;delete;roleId=*")).toBe(false);
    expect(isPermissionRule("note;read;noteTypeId=*")).toBe(false);
    expect(
      isPermissionRule(
        "note;read;noteTypeId=*;classificationLevelId=*;alsoUnconfirmed=false",
      ),
    ).toBe(false);
  });
});
