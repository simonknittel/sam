import { EventSource } from "@sam-monorepo/database/client";
import { expectAuditEvents } from "../fixtures/audit";
import {
  createAppEvent,
  createCitizen,
  createParticipant,
  futureEvent,
} from "../fixtures/factories";
import {
  ACTION_FEEDBACK_TIMEOUT,
  clickUntilVisible,
  DELETED_TEXT,
  modal,
  NOT_FOUND_TEXT,
} from "../fixtures/interactions";
import { expect, test } from "../fixtures/test";

const DELETED_CITIZEN_LABEL = "Gelöschter Citizen";

test("a deleted citizen leaves the lists and its records name it as deleted", async ({
  page,
  prisma,
  signIn,
}) => {
  const admin = await createCitizen(prisma, {
    handle: "spynet-admin",
    permissionStrings: [
      "citizen;read",
      "citizen;delete",
      "spynetCitizen;read",
      "event;read",
    ],
  });
  const target = await createCitizen(prisma, { handle: "verschwinder" });
  const event = await createAppEvent(prisma, {
    name: "Abschiedsflug",
    createdById: admin.entity.id,
    ...futureEvent(),
  });
  await createParticipant(prisma, {
    eventId: event.id,
    citizen: target,
    source: EventSource.APP,
  });

  await signIn(admin.user);
  await page.goto(`/app/spynet/citizen/${target.entity.id}`);

  const deleteDialog = page.getByRole("alertdialog");
  await clickUntilVisible(
    page.getByRole("button", { name: "Löschen" }),
    deleteDialog,
  );
  await deleteDialog.getByRole("button", { name: "Löschen" }).click();
  await expect(page.getByText(DELETED_TEXT)).toBeVisible({
    timeout: ACTION_FEEDBACK_TIMEOUT,
  });

  /** Nothing is deleted: the citizen stays, without its login */
  await expect
    .poll(async () =>
      prisma.citizen.findUniqueOrThrow({
        where: { id: target.entity.id },
        select: { deletedAt: true, userId: true },
      }),
    )
    .toMatchObject({ deletedAt: expect.any(Date), userId: null });
  expect(
    await prisma.eventParticipant.count({
      where: { citizenId: target.entity.id },
    }),
  ).toBe(1);
  await expectAuditEvents(prisma, ["CITIZEN_DELETED"]);

  await page.goto("/app/spynet/citizen");
  const rows = page.getByRole("row");
  await expect(rows.filter({ hasText: "spynet-admin" })).toBeVisible({
    timeout: ACTION_FEEDBACK_TIMEOUT,
  });
  await expect(rows.filter({ hasText: "verschwinder" })).toHaveCount(0);

  await page.goto(`/app/spynet/citizen/${target.entity.id}`);
  await expect(page.getByText(NOT_FOUND_TEXT)).toBeVisible();

  await page.goto(`/app/events/${event.id}/participants`);
  await expect(page.getByText(DELETED_CITIZEN_LABEL)).toBeVisible({
    timeout: ACTION_FEEDBACK_TIMEOUT,
  });
  await expect(page.getByText("verschwinder")).toHaveCount(0);
});

test("the login of a deleted citizen continues without a citizen", async ({
  page,
  prisma,
  signIn,
}) => {
  const target = await createCitizen(prisma, { handle: "ehemaliger" });
  await prisma.citizen.update({
    where: { id: target.entity.id },
    data: { deletedAt: new Date(), userId: null },
  });

  await signIn(target.user);
  await page.goto("/app/dashboard");

  await expect(page).toHaveURL("/clearance", {
    timeout: ACTION_FEEDBACK_TIMEOUT,
  });
});

test("a citizen can be added again with the Spectrum ID of a deleted one", async ({
  page,
  prisma,
  signIn,
}) => {
  const admin = await createCitizen(prisma, {
    handle: "spynet-anleger",
    permissionStrings: ["citizen;create", "citizen;read"],
  });
  const deleted = await prisma.citizen.create({
    data: {
      spectrumId: "RUECKKEHRER",
      deletedAt: new Date(),
      logs: { create: { type: "spectrum-id", content: "RUECKKEHRER" } },
    },
  });

  await signIn(admin.user);
  await page.goto("/app/spynet");

  const createDialog = modal(page, "Neuer Citizen");
  await clickUntilVisible(
    page.getByRole("button", { name: "Citizen" }),
    createDialog,
  );
  await createDialog.getByLabel("Spectrum ID").fill("RUECKKEHRER");
  await createDialog.getByRole("button", { name: "Anlegen" }).click();

  await expect(page).toHaveURL(/\/app\/spynet\/citizen\/[a-z0-9]+$/, {
    timeout: ACTION_FEEDBACK_TIMEOUT,
  });
  expect(page.url()).not.toContain(deleted.id);
  await expect(page.getByText(NOT_FOUND_TEXT)).toHaveCount(0);
  expect(
    await prisma.citizen.count({
      where: { spectrumId: "RUECKKEHRER", deletedAt: null },
    }),
  ).toBe(1);
});
