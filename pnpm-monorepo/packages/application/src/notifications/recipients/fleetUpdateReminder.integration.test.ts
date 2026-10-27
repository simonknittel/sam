import { beforeEach, describe, expect, test } from "vitest";
import { createTestApplicationContext } from "../../../test/applicationContext.js";
import { createCitizenWithPermissions } from "../../../test/citizensWithPermissions.js";
import { truncateAllTables } from "../../../test/database.js";
import { findFleetUpdateReminderRecipient } from "./fleetUpdateReminder.js";

beforeEach(async () => {
  await truncateAllTables();
});

describe("findFleetUpdateReminderRecipient", () => {
  test("reminds a citizen who can manage their ships", async () => {
    const citizen = await createCitizenWithPermissions("ship-owner", [
      "login;manage",
      "ship;manage",
    ]);
    const { context } = createTestApplicationContext();

    expect(
      await findFleetUpdateReminderRecipient(context, {
        citizenId: citizen.id,
      }),
    ).toEqual({ citizenId: citizen.id });
  });

  test("does not remind a citizen who cannot manage ships", async () => {
    const citizen = await createCitizenWithPermissions("no-ships", [
      "login;manage",
    ]);
    const { context } = createTestApplicationContext();

    expect(
      await findFleetUpdateReminderRecipient(context, {
        citizenId: citizen.id,
      }),
    ).toBeNull();
  });
});
