import type { Page } from "@playwright/test";
import { expectAuditEvents } from "../fixtures/audit";
import {
  createAppEvent,
  createCitizen,
  createEventTemplate,
  createParticipant,
  EventSource,
  futureEvent,
  LINEUP_PERMISSIONS,
} from "../fixtures/factories";
import {
  clickUntilVisible,
  fillUntilValue,
  modal,
  NOT_FOUND_TEXT,
  SAVED_TEXT,
  sectionByHeading,
  toggleLabel,
  waitForAppShellHydration,
} from "../fixtures/interactions";
import { expect, test } from "../fixtures/test";

/**
 * The paths of the tabs of an event that exist only while its participation
 * is on. The main navigation can have a "Flotte" link too, thus the tabs are
 * found by their URL.
 */
const PARTICIPATION_TAB_PATHS = ["lineup", "participants", "fleet"] as const;

const eventTab = (page: Page, eventId: string, path: string) =>
  page.locator(`a[href="/app/events/${eventId}/${path}"]`);

/**
 * The visible state of the participation switch on the settings page. The
 * switch is disabled while its action runs, and React resets the form when
 * the action ends: thus the state is read after that.
 */
const expectParticipationSwitch = async (page: Page, stateLabel: string) => {
  const tile = sectionByHeading(page, "Teilnahme");
  await expect(tile.getByRole("checkbox", { name: "Teilnahme" })).toBeEnabled();
  await expect(tile.getByText(stateLabel, { exact: true })).toBeVisible();
};

test("a manager turns the participation off: the sign-ups are cancelled and the participation pages are gone", async ({
  page,
  prisma,
  signIn,
  switchUser,
}) => {
  const organizer = await createCitizen(prisma, {
    handle: "teilnahme-orga",
    permissionStrings: [...LINEUP_PERMISSIONS, "orgFleet;read"],
  });
  const participant = await createCitizen(prisma, {
    handle: "teilnahme-pilot",
    permissionStrings: ["event;read"],
  });
  const event = await createAppEvent(prisma, {
    name: "Operation Funkstille",
    createdById: organizer.entity.id,
    lineupEnabled: true,
    ...futureEvent(),
  });
  await createParticipant(prisma, {
    eventId: event.id,
    citizen: participant,
    source: EventSource.APP,
  });
  const position = await prisma.eventPosition.create({
    data: {
      eventId: event.id,
      name: "Navigator",
      citizenId: participant.entity.id,
    },
  });

  await signIn(organizer.user);
  await page.goto(`/app/events/${event.id}`);
  for (const path of PARTICIPATION_TAB_PATHS)
    await expect(eventTab(page, event.id, path)).toBeVisible();

  await page.goto(`/app/events/${event.id}/settings`);
  await waitForAppShellHydration(page);
  const participationTile = sectionByHeading(page, "Teilnahme");
  const confirmation = page.getByRole("alertdialog", {
    name: "Teilnahme abschalten?",
  });

  /** The dialog names the sign-ups, and a cancel keeps everything */
  await toggleLabel(participationTile, "Aktiviert").click();
  await expect(confirmation).toContainText("1 aktive Anmeldung wird storniert");
  await confirmation.getByRole("button", { name: "Abbrechen" }).click();
  await expectParticipationSwitch(page, "Aktiviert");

  await toggleLabel(participationTile, "Aktiviert").click();
  await confirmation.getByRole("button", { name: "Abschalten" }).click();
  await expect(page.getByText(SAVED_TEXT)).toBeVisible();
  await expectParticipationSwitch(page, "Deaktiviert");

  await expect
    .poll(() =>
      prisma.event.findUniqueOrThrow({
        where: { id: event.id },
        select: { participationEnabled: true, lineupEnabled: true },
      }),
    )
    // The stored lineup switch stays
    .toEqual({ participationEnabled: false, lineupEnabled: true });
  expect(
    await prisma.eventParticipant.findFirstOrThrow({
      where: { eventId: event.id, citizenId: participant.entity.id },
      select: { cancelledAt: true, cancelledById: true },
    }),
  ).toMatchObject({
    cancelledAt: expect.any(Date),
    cancelledById: organizer.entity.id,
  });
  // The position stays, without its citizen
  expect(
    await prisma.eventPosition.findUniqueOrThrow({
      where: { id: position.id },
      select: { citizenId: true },
    }),
  ).toEqual({ citizenId: null });
  await expectAuditEvents(prisma, ["EVENT_PARTICIPATION_STATUS_CHANGED"]);

  /** The overview keeps only what has no participants */
  await page.goto(`/app/events/${event.id}`);
  await expect(
    page.getByText("Für dieses Event gibt es keine Anmeldung."),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Übersicht" })).toBeVisible();
  for (const path of PARTICIPATION_TAB_PATHS)
    await expect(eventTab(page, event.id, path)).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "Flotte der Teilnehmer" }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "Rollen/Zertifikate der Teilnehmer" }),
  ).toHaveCount(0);

  for (const path of PARTICIPATION_TAB_PATHS) {
    await page.goto(`/app/events/${event.id}/${path}`);
    await expect(page.getByText(NOT_FOUND_TEXT)).toBeVisible();
  }

  await page.goto(`/app/events/${event.id}/activity`);
  await expect(
    page.getByText("Teilnahme abgeschaltet (1 Anmeldung storniert)"),
  ).toBeVisible();

  /** The card of the events list has no sign-up and no participant count */
  await switchUser(participant.user);
  await page.goto("/app/events");
  const card = page
    .getByRole("article")
    .filter({ hasText: "Operation Funkstille" });
  await expect(card.getByRole("link", { name: "Details" })).toBeVisible();
  await expect(card.getByRole("button", { name: "Anmelden" })).toHaveCount(0);
  await expect(card.getByTitle(/^Teilnehmer:/)).toHaveCount(0);

  /** The switch to true needs no confirmation and restores nothing */
  await switchUser(organizer.user);
  await page.goto(`/app/events/${event.id}/settings`);
  await waitForAppShellHydration(page);
  await expectParticipationSwitch(page, "Deaktiviert");
  await toggleLabel(sectionByHeading(page, "Teilnahme"), "Deaktiviert").click();
  await expect(page.getByText(SAVED_TEXT)).toBeVisible();
  await expectParticipationSwitch(page, "Aktiviert");
  await expect
    .poll(() =>
      prisma.event.findUniqueOrThrow({
        where: { id: event.id },
        select: { participationEnabled: true },
      }),
    )
    .toEqual({ participationEnabled: true });
  expect(
    await prisma.eventParticipant.count({
      where: { eventId: event.id, cancelledAt: null },
    }),
  ).toBe(0);
});

test("the create dialog offers the participation switch, and a template prefills it", async ({
  page,
  prisma,
  signIn,
}) => {
  const creator = await createCitizen(prisma, {
    handle: "teilnahme-ersteller",
    permissionStrings: ["event;read", "event;create"],
  });
  const { template } = await createEventTemplate(prisma, {
    name: "Briefing ohne Anmeldung",
    ownedById: creator.entity.id,
  });
  await prisma.eventTemplate.update({
    where: { id: template.id },
    data: { participationEnabled: false },
  });

  await signIn(creator.user);
  await page.goto("/app/events");
  await clickUntilVisible(
    page.getByRole("button", { name: "Event erstellen" }),
    modal(page, "Neues Event"),
  );

  const createDialog = modal(page, "Neues Event");
  const participation = createDialog.getByLabel("Teilnahme");
  await expect(participation).toBeChecked();

  await createDialog
    .getByLabel("Vorlage (optional)")
    .selectOption({ label: "Briefing ohne Anmeldung" });
  await expect(participation).not.toBeChecked();

  await fillUntilValue(createDialog.getByLabel("Start"), "2999-01-01T18:00");
  await fillUntilValue(createDialog.getByLabel("Ende"), "2999-01-01T20:00");
  await createDialog.getByRole("button", { name: "Speichern" }).click();
  await expect(page).toHaveURL(/\/app\/events\/[^/]+$/);

  const event = await prisma.event.findFirstOrThrow({
    where: { name: "Briefing ohne Anmeldung" },
    select: { id: true, participationEnabled: true },
  });
  expect(event.participationEnabled).toBe(false);
  await expect(page.getByRole("link", { name: "Übersicht" })).toBeVisible();
  await expect(eventTab(page, event.id, "participants")).toHaveCount(0);
});
