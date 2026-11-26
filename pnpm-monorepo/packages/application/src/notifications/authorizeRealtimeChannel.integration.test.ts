import {
  getCitizenChannelName,
  getRemoteControlProgramChannelName,
} from "@sam-monorepo/domain";
import { expect, test } from "vitest";
import {
  createTestActor,
  createTestApplicationContext,
} from "../../test/applicationContext.js";
import { ForbiddenError } from "../errors.js";
import { authorizeRealtimeChannel } from "./authorizeRealtimeChannel.js";
import { NotificationErrorMessage } from "./notificationErrors.js";

const CITIZEN = { id: "citizen-1", handle: "citizen" };

test("opens the Remote Control Program channel only to the own citizen with the permission or in admin mode, and not to an admin who assumes the citizen", async () => {
  const { context } = createTestApplicationContext();
  const createActor = (
    permissionStrings: readonly string[],
    assumedByAdminId: string | null = null,
  ) =>
    createTestActor({
      userId: "user-1",
      citizen: CITIZEN,
      permissionStrings,
      assumedByAdminId,
    });
  const user = createActor(["remoteControlProgram;use"]);
  const admin = createTestActor({
    userId: "admin-user",
    citizen: CITIZEN,
    adminMode: true,
  });
  const assumedUser = createActor(["remoteControlProgram;use"], "admin-user");
  const ownChannel = {
    channel_name: getRemoteControlProgramChannelName(CITIZEN.id),
  };
  const forbidden = new ForbiddenError(
    NotificationErrorMessage.RealtimeChannelForbidden,
  );

  await expect(
    authorizeRealtimeChannel(context, user, ownChannel),
  ).resolves.toBeUndefined();
  await expect(
    authorizeRealtimeChannel(context, admin, ownChannel),
  ).resolves.toBeUndefined();
  for (const actor of [user, admin])
    await expect(
      authorizeRealtimeChannel(context, actor, {
        channel_name: getRemoteControlProgramChannelName("citizen-2"),
      }),
    ).rejects.toThrow(forbidden);
  await expect(
    authorizeRealtimeChannel(context, createActor([]), ownChannel),
  ).rejects.toThrow(forbidden);
  await expect(
    authorizeRealtimeChannel(context, assumedUser, ownChannel),
  ).rejects.toThrow(forbidden);

  // The admin who assumes the citizen still gets the notifications of the citizen
  await expect(
    authorizeRealtimeChannel(context, assumedUser, {
      channel_name: getCitizenChannelName(CITIZEN.id),
    }),
  ).resolves.toBeUndefined();
});
