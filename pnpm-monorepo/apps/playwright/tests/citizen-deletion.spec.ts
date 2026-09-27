import type { Locator, Page } from "@playwright/test";
import { EventSource } from "@sam-monorepo/database/client";
import { expectAuditEvents } from "../fixtures/audit";
import {
  createAppEvent,
  createCitizen,
  createParticipant,
  createSilcTransaction,
  futureEvent,
} from "../fixtures/factories";
import {
  ACTION_FEEDBACK_TIMEOUT,
  clickUntilVisible,
  DELETED_TEXT,
  fillUntilVisible,
  modal,
  NOT_FOUND_TEXT,
} from "../fixtures/interactions";
import { expect, test } from "../fixtures/test";

const DELETED_CITIZEN_LABEL = "Gelöschter Citizen";

/**
 * Each search starts with a new page load, because the tile keeps the hits
 * of the previous query while a request runs
 */
const searchInTile = async (page: Page, query: string, reaction: Locator) => {
  await page.goto("/app/dashboard");
  await fillUntilVisible(
    page.getByRole("combobox", { name: "Spynet durchsuchen" }),
    query,
    reaction,
  );
};

/** The popup of the search tile is in a portal, thus it is not in the tile */
const searchHitOf = (page: Page, citizenId: string) =>
  page
    .getByRole("listbox")
    .getByRole("option")
    .filter({ hasText: `Internal ID: ${citizenId}` });

test("a deleted citizen leaves the lists and its records name it as deleted", async ({
  page,
  prisma,
  signIn,
  switchUser,
}) => {
  const admin = await createCitizen(prisma, {
    handle: "spynet-admin",
    permissionStrings: [
      "citizen;read",
      "citizen;delete",
      "spynetCitizen;read",
      "event;read",
      "penaltyEntry;read",
      "silcTransactionOfOtherCitizen;read",
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
  /** A penalty that the deleted citizen gave to an active citizen */
  await prisma.penaltyEntry.create({
    data: {
      citizenId: admin.entity.id,
      createdById: target.entity.id,
      points: 2,
      reason: "Strafe für Drängeln",
    },
  });
  await createSilcTransaction(prisma, {
    receiverId: target.entity.id,
    value: 7,
    description: "Sold für den Probeflug",
    createdById: admin.entity.id,
  });

  await signIn(admin.user);

  /** Before the delete, the search finds the citizen */
  await searchInTile(page, "verschwinder", searchHitOf(page, target.entity.id));

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
  /** The log tables and the system log name an author by the login name */
  expect(
    await prisma.user.findUniqueOrThrow({
      where: { id: target.user.id },
      select: { name: true },
    }),
  ).toEqual({ name: DELETED_CITIZEN_LABEL });
  await expectAuditEvents(prisma, ["CITIZEN_DELETED"]);

  await page.goto("/app/spynet/citizen");
  const rows = page.getByRole("row");
  await expect(rows.filter({ hasText: "spynet-admin" })).toBeVisible({
    timeout: ACTION_FEEDBACK_TIMEOUT,
  });
  await expect(rows.filter({ hasText: "verschwinder" })).toHaveCount(0);

  await page.goto(`/app/spynet/citizen/${target.entity.id}`);
  await expect(page.getByText(NOT_FOUND_TEXT)).toBeVisible();

  await searchInTile(page, "verschwinder", page.getByText("Keine Ergebnisse"));

  await page.goto(`/app/events/${event.id}/participants`);
  await expect(page.getByText(DELETED_CITIZEN_LABEL)).toBeVisible({
    timeout: ACTION_FEEDBACK_TIMEOUT,
  });
  await expect(page.getByText("verschwinder")).toHaveCount(0);

  await page.goto("/app/penalty-points");
  const penaltyRow = page
    .getByRole("row")
    .filter({ hasText: "Strafe für Drängeln" });
  await expect(penaltyRow).toBeVisible({ timeout: ACTION_FEEDBACK_TIMEOUT });
  /** The penalized citizen is active, thus a link */
  await expect(
    penaltyRow.getByRole("link", { name: "spynet-admin" }),
  ).toBeVisible();
  await expect(penaltyRow.getByText(DELETED_CITIZEN_LABEL)).toBeVisible();
  await expect(
    penaltyRow.getByRole("link", { name: DELETED_CITIZEN_LABEL }),
  ).toHaveCount(0);
  await expect(penaltyRow.getByText("verschwinder")).toHaveCount(0);

  await page.goto("/app/silc/transactions");
  const transactionRow = page
    .getByRole("row")
    .filter({ hasText: "Sold für den Probeflug" });
  await expect(transactionRow).toBeVisible({
    timeout: ACTION_FEEDBACK_TIMEOUT,
  });
  /** The author is active, thus a link */
  await expect(
    transactionRow.getByRole("link", { name: "spynet-admin" }),
  ).toBeVisible();
  await expect(transactionRow.getByText(DELETED_CITIZEN_LABEL)).toBeVisible();
  await expect(
    transactionRow.getByRole("link", { name: DELETED_CITIZEN_LABEL }),
  ).toHaveCount(0);
  await expect(transactionRow.getByText("verschwinder")).toHaveCount(0);

  /** The login of the deleted citizen continues as a login without a citizen */
  await switchUser(target.user);
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
