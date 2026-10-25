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
    { resource: "discord-id", operation: "create" },
    { resource: "discord-id", operation: "confirm" },
    { resource: "discord-id", operation: "delete" },
    { resource: "discord-id", operation: "manage" },
    { resource: "classificationLevel", operation: "manage" },
    { resource: "noteType", operation: "manage" },
    {
      resource: "otherRole",
      operation: "assign",
      attributes: [{ key: "roleId", value: "*" }],
    },
    {
      resource: "otherRole",
      operation: "manage",
      attributes: [{ key: "roleId", value: "clx123abc" }],
    },
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
          { resource: "discord-id", operation: "read" },
          {
            resource: "otherRole",
            operation: "read",
            attributes: [{ key: "roleId", value: "*" }],
          },
          {
            resource: "otherRole",
            operation: "dismiss",
            attributes: [{ key: "roleId", value: "*" }],
          },
        ],
        discordTwoFactorEnabled: false,
      }),
    ).toBe(false);
  });
});
