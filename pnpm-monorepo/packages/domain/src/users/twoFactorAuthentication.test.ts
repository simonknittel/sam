import { UserRole } from "@sam-monorepo/database/browser";
import { describe, expect, test } from "vitest";
import type { PermissionSet } from "../permissions/PermissionSet.js";
import { isMissingTwoFactorAuthentication } from "./twoFactorAuthentication.js";

const LOGIN: PermissionSet = { resource: "login", operation: "manage" };

describe("isMissingTwoFactorAuthentication", () => {
  test.each([
    { resource: "role", operation: "manage" },
    { resource: "user", operation: "read" },
    { resource: "user", operation: "manage" },
    { resource: "systemLog", operation: "read" },
  ] satisfies PermissionSet[])(
    "$resource;$operation requires the two-factor authentication",
    (permissionSet) => {
      const permissionSets = [LOGIN, permissionSet];

      for (const discordTwoFactorEnabled of [false, null])
        expect(
          isMissingTwoFactorAuthentication({
            userRole: null,
            permissionSets,
            discordTwoFactorEnabled,
          }),
        ).toBe(true);

      expect(
        isMissingTwoFactorAuthentication({
          userRole: null,
          permissionSets,
          discordTwoFactorEnabled: true,
        }),
      ).toBe(false);
    },
  );

  test("an admin requires the two-factor authentication without a permission", () => {
    expect(
      isMissingTwoFactorAuthentication({
        userRole: UserRole.ADMIN,
        permissionSets: [],
        discordTwoFactorEnabled: null,
      }),
    ).toBe(true);
    expect(
      isMissingTwoFactorAuthentication({
        userRole: UserRole.ADMIN,
        permissionSets: [],
        discordTwoFactorEnabled: true,
      }),
    ).toBe(false);
  });

  test("other permissions do not require the two-factor authentication", () => {
    expect(
      isMissingTwoFactorAuthentication({
        userRole: null,
        permissionSets: [
          LOGIN,
          { resource: "event", operation: "manage" },
          { resource: "otherRole", operation: "read" },
        ],
        discordTwoFactorEnabled: false,
      }),
    ).toBe(false);
  });
});
