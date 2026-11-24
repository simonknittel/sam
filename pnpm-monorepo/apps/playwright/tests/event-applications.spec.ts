import type { Page } from "@playwright/test";
import { expectAuditEvents } from "../fixtures/audit";
import {
  createAppEvent,
  createCitizen,
  futureEvent,
} from "../fixtures/factories";
import {
  clickUntilVisible,
  fillUntilValue,
  SAVED_TEXT,
  sectionByHeading,
  toggleLabel,
  waitForAppShellHydration,
} from "../fixtures/interactions";
import { expect, test } from "../fixtures/test";

/** The tile also has the switch of the participation. */
const applicationSwitch = (page: Page) =>
  toggleLabel(
    page,
    page.getByRole("checkbox", { name: "Teilnahmeanfragen", exact: true }),
  );

const applicationRow = (page: Page, handle: string) =>
  sectionByHeading(page, /^Teilnahmeanfragen/)
    .getByRole("row")
    .filter({ hasText: handle });

test("a manager requires applications, a citizen applies with a comment, and the manager approves", async ({
  page,
  prisma,
  signIn,
  switchUser,
}) => {
  const manager = await createCitizen(prisma, {
    handle: "anfrage-manager",
    permissionStrings: ["event;read"],
  });
  const applicant = await createCitizen(prisma, {
    handle: "anfrage-pilot",
    permissionStrings: ["event;read"],
  });
  const event = await createAppEvent(prisma, {
    name: "Operation Gästeliste",
    createdById: manager.entity.id,
    ...futureEvent(),
  });

  await signIn(manager.user);
  await page.goto(`/app/events/${event.id}/settings`);
  await waitForAppShellHydration(page);
  await applicationSwitch(page).click();
  await expect(page.getByText(SAVED_TEXT)).toBeVisible();
  await expect
    .poll(async () =>
      prisma.event.findUniqueOrThrow({
        where: { id: event.id },
        select: { applicationRequired: true },
      }),
    )
    .toEqual({ applicationRequired: true });

  await page.goto(`/app/events/${event.id}`);
  await waitForAppShellHydration(page);
  await expect(
    sectionByHeading(page, "Meine Teilnahme").getByRole("button", {
      name: "Anmelden",
    }),
  ).toBeVisible();

  await switchUser(applicant.user);
  await page.goto(`/app/events/${event.id}`);
  await waitForAppShellHydration(page);
  const tile = sectionByHeading(page, "Meine Teilnahme");
  await expect(tile.getByRole("button", { name: "Anmelden" })).toHaveCount(0);
  await fillUntilValue(tile.getByLabel("Kommentar"), "Mit der Cutlass.");
  await tile.getByRole("button", { name: "Teilnahme anfragen" }).click();

  await expect(
    page.getByText(
      "Teilnahme angefragt. Ein Manager entscheidet über deine Anfrage.",
    ),
  ).toBeVisible();
  await expect(
    tile
      .getByText("Teilnahme angefragt", { exact: true })
      .filter({ visible: true }),
  ).toBeVisible();
  await expect(
    tile.getByRole("button", { name: "Anfrage zurückziehen" }),
  ).toBeVisible();

  await switchUser(manager.user);
  await page.goto(`/app/events/${event.id}/participants`);
  await waitForAppShellHydration(page);
  const row = applicationRow(page, "anfrage-pilot");
  await expect(row).toContainText("Offen");
  await expect(row).toContainText("Mit der Cutlass.");

  await row.getByTitle("Teilnahmeanfrage annehmen").click();
  await page
    .getByRole("alertdialog", { name: "Teilnahmeanfrage annehmen?" })
    .getByRole("button", { name: "Annehmen" })
    .click();

  await expect(page.getByText("Teilnahmeanfrage angenommen.")).toBeVisible();
  await expect(page.getByText("Teilnehmer (1)")).toBeVisible();
  await expect(sectionByHeading(page, /^Teilnahmeanfragen/)).toHaveCount(0);

  expect(
    await prisma.eventParticipant.findFirstOrThrow({
      where: { eventId: event.id, citizenId: applicant.entity.id },
      select: { comment: true, cancelledAt: true },
    }),
  ).toEqual({ comment: "Mit der Cutlass.", cancelledAt: null });
  expect(
    await prisma.eventApplication.findFirstOrThrow({
      where: { eventId: event.id, citizenId: applicant.entity.id },
      select: { approvedById: true, declinedAt: true, withdrawnAt: true },
    }),
  ).toEqual({
    approvedById: manager.entity.id,
    declinedAt: null,
    withdrawnAt: null,
  });
  await expectAuditEvents(prisma, [
    "EVENT_APPLICATION_REQUIREMENT_CHANGED",
    "EVENT_APPLICATION_CREATED",
    "EVENT_APPLICATION_APPROVED",
  ]);

  await page.goto(`/app/events/${event.id}/activity`);
  const appliedRow = page
    .getByRole("row")
    .filter({ hasText: "Teilnahme angefragt" });
  await expect(appliedRow).toContainText("anfrage-pilot");
  await expect(appliedRow).toContainText("Mit der Cutlass.");
  await expect(
    page.getByRole("row").filter({ hasText: "Teilnahmeanfrage angenommen" }),
  ).toContainText("anfrage-manager");
});

test("a manager declines an application with a reason, and the citizen cannot apply again", async ({
  page,
  prisma,
  signIn,
  switchUser,
}) => {
  const manager = await createCitizen(prisma, {
    handle: "absage-orga",
    permissionStrings: ["event;read"],
  });
  const applicant = await createCitizen(prisma, {
    handle: "abgelehnter-pilot",
    permissionStrings: ["event;read"],
  });
  const event = await createAppEvent(prisma, {
    name: "Operation Volles Haus",
    createdById: manager.entity.id,
    ...futureEvent(),
  });
  await prisma.event.update({
    where: { id: event.id },
    data: { applicationRequired: true },
  });
  await prisma.eventApplication.create({
    data: {
      eventId: event.id,
      citizenId: applicant.entity.id,
      comment: "Ich bringe eine Vanguard mit.",
    },
  });

  await signIn(manager.user);
  await page.goto(`/app/events/${event.id}/participants`);
  await waitForAppShellHydration(page);
  const row = applicationRow(page, "abgelehnter-pilot");
  await row.getByTitle("Teilnahmeanfrage ablehnen").click();
  const declineDialog = page.getByRole("alertdialog", {
    name: "Teilnahmeanfrage ablehnen?",
  });
  await fillUntilValue(
    declineDialog.getByLabel("Grund (optional)"),
    "Alle Plätze sind vergeben.",
  );
  await declineDialog.getByRole("button", { name: "Ablehnen" }).click();

  await expect(page.getByText("Teilnahmeanfrage abgelehnt.")).toBeVisible();
  await expect(row).toContainText("Abgelehnt");
  await expect(row).toContainText("absage-orga");
  await expect(row).toContainText("Alle Plätze sind vergeben.");
  await expect(row.getByTitle("Teilnahmeanfrage annehmen")).toHaveCount(0);

  await switchUser(applicant.user);
  await page.goto(`/app/events/${event.id}`);
  await waitForAppShellHydration(page);
  const tile = sectionByHeading(page, "Meine Teilnahme");
  await expect(
    tile
      .getByText("Teilnahmeanfrage abgelehnt", { exact: true })
      .filter({ visible: true }),
  ).toBeVisible();
  await expect(tile.getByText("Alle Plätze sind vergeben.")).toBeVisible();
  await expect(
    tile.getByRole("button", { name: "Teilnahme anfragen" }),
  ).toHaveCount(0);
  await expectAuditEvents(prisma, ["EVENT_APPLICATION_DECLINED"]);
});

test("the switch of the applications to false approves the open applications after a confirmation", async ({
  page,
  prisma,
  signIn,
}) => {
  const manager = await createCitizen(prisma, {
    handle: "freigabe-orga",
    permissionStrings: ["event;read"],
  });
  const applicant = await createCitizen(prisma, {
    handle: "wartender-pilot",
    permissionStrings: ["event;read"],
  });
  const event = await createAppEvent(prisma, {
    name: "Operation Offene Tür",
    createdById: manager.entity.id,
    ...futureEvent(),
  });
  await prisma.event.update({
    where: { id: event.id },
    data: { applicationRequired: true },
  });
  await prisma.eventApplication.create({
    data: {
      eventId: event.id,
      citizenId: applicant.entity.id,
      comment: "Gerne als Schütze.",
    },
  });

  await signIn(manager.user);
  await page.goto(`/app/events/${event.id}/settings`);
  await waitForAppShellHydration(page);
  await applicationSwitch(page).click();
  const confirmation = page.getByRole("alertdialog", {
    name: "Teilnahmeanfragen abschalten?",
  });
  await expect(confirmation).toContainText(
    "Alle offenen Teilnahmeanfragen werden angenommen",
  );
  await confirmation.getByRole("button", { name: "Abschalten" }).click();
  await expect(page.getByText(SAVED_TEXT)).toBeVisible();

  await expect
    .poll(async () =>
      prisma.eventParticipant.findFirst({
        where: { eventId: event.id, citizenId: applicant.entity.id },
        select: { comment: true },
      }),
    )
    .toEqual({ comment: "Gerne als Schütze." });
  expect(
    await prisma.event.findUniqueOrThrow({
      where: { id: event.id },
      select: { applicationRequired: true },
    }),
  ).toEqual({ applicationRequired: false });
  await expectAuditEvents(prisma, [
    "EVENT_APPLICATION_REQUIREMENT_CHANGED",
    "EVENT_APPLICATION_APPROVED",
  ]);
});

test("on the events list, an invited citizen accepts the invitation of an event that requires applications", async ({
  page,
  prisma,
  signIn,
}) => {
  const manager = await createCitizen(prisma, { handle: "listen-einlader" });
  const guest = await createCitizen(prisma, {
    handle: "listen-gast",
    permissionStrings: ["event;read"],
  });
  const event = await createAppEvent(prisma, {
    name: "Operation Gästeliste",
    createdById: manager.entity.id,
    ...futureEvent(),
  });
  await prisma.event.update({
    where: { id: event.id },
    data: { applicationRequired: true },
  });
  await prisma.eventInvitation.create({
    data: {
      eventId: event.id,
      citizenId: guest.entity.id,
      createdById: manager.entity.id,
      message: "Wir halten dir einen Platz frei.",
    },
  });

  await signIn(guest.user);
  await page.goto("/app/events");
  await waitForAppShellHydration(page);

  const preview = page
    .getByRole("article")
    .filter({ hasText: "Operation Gästeliste" });
  const dialog = page.getByRole("dialog");
  await clickUntilVisible(
    preview.getByRole("button", { name: "Eingeladen" }),
    page.getByRole("heading", { name: "Teilnahme - Operation Gästeliste" }),
  );
  await expect(
    dialog.getByText("Wir halten dir einen Platz frei."),
  ).toBeVisible();
  await expect(
    dialog.getByRole("button", { name: "Teilnahme anfragen" }),
  ).toHaveCount(0);
  await dialog.getByRole("button", { name: "Annehmen" }).click();

  await expect(
    page.getByText("Einladung angenommen. Du bist angemeldet."),
  ).toBeVisible();
  expect(
    await prisma.eventParticipant.count({
      where: { eventId: event.id, citizenId: guest.entity.id },
    }),
  ).toBe(1);
});
