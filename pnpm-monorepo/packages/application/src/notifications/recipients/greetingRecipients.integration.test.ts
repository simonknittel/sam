import { beforeEach, describe, expect, test } from "vitest";
import { createTestApplicationContext } from "../../../test/applicationContext.js";
import {
  createCitizenWithInheritedPermissions,
  createCitizenWithPermissions,
} from "../../../test/citizensWithPermissions.js";
import { truncateAllTables } from "../../../test/database.js";
import { findGreetingRecipient } from "./greetingRecipients.js";

beforeEach(async () => {
  await truncateAllTables();
});

describe("findGreetingRecipient", () => {
  test("greets a citizen who can log in", async () => {
    const citizen = await createCitizenWithPermissions("can-log-in", [
      "login;manage",
    ]);
    const { context } = createTestApplicationContext();

    expect(
      await findGreetingRecipient(context, { citizenId: citizen.id }),
    ).toEqual({ citizenId: citizen.id });
  });

  test("greets a citizen who can log in only through an inherited role", async () => {
    const citizen = await createCitizenWithInheritedPermissions("inherited", [
      "login;manage",
    ]);
    const { context } = createTestApplicationContext();

    expect(
      await findGreetingRecipient(context, { citizenId: citizen.id }),
    ).toEqual({ citizenId: citizen.id });
  });

  test("does not greet a citizen whose login a role negates", async () => {
    const citizen = await createCitizenWithPermissions("negated-login", [
      "login;manage",
      "login;negate",
    ]);
    const { context } = createTestApplicationContext();

    expect(
      await findGreetingRecipient(context, { citizenId: citizen.id }),
    ).toBeNull();
  });
});
