import type { Page } from "@playwright/test";
import {
  ConfirmationStatus,
  OrganizationMembershipType,
  OrganizationMembershipVisibility,
} from "@sam-monorepo/database/client";
import { expectAuditEvents } from "../fixtures/audit";
import {
  createCitizen,
  createUserWithoutCitizen,
  ONE_MINUTE_MS,
} from "../fixtures/factories";
import {
  clickUntilVisible,
  DELETED_TEXT,
  modal,
  SAVED_TEXT,
  sectionByHeading,
  waitForAppShellHydration,
} from "../fixtures/interactions";
import { expect, test } from "../fixtures/test";

/**
 * The value of one row of the Übersicht tile. Each row names the attribute
 * on the left and holds its value on the right.
 */
const overviewAttribute = (page: Page, name: string) =>
  sectionByHeading(page, "Übersicht")
    .locator("dl > div")
    .filter({ has: page.getByText(name, { exact: true }) })
    .locator("dd");

test("a citizen is created from a Spectrum ID and deleted again", async ({
  page,
  prisma,
  signIn,
}) => {
  const admin = await createCitizen(prisma, {
    handle: "spynet-anleger",
    permissionStrings: ["citizen;create", "citizen;read", "citizen;delete"],
  });

  await signIn(admin.user);
  await page.goto("/app/spynet");

  const createDialog = modal(page, "Neuer Citizen");
  await clickUntilVisible(
    page.getByRole("button", { name: "Citizen" }),
    createDialog,
  );
  await createDialog.getByLabel("Spectrum ID").fill("NEWCOMER");
  await createDialog.getByRole("button", { name: "Anlegen" }).click();

  await expect(page).toHaveURL(/\/app\/spynet\/citizen\/[a-z0-9]+$/);

  const created = await prisma.citizen.findFirstOrThrow({
    where: { spectrumId: "NEWCOMER" },
  });
  /** The creator of a citizen is the citizen of the login */
  expect(created.createdById).toBe(admin.entity.id);
  /** The Spectrum ID is recorded as the citizen's first log entry */
  const spectrumIdLog = await prisma.citizenLog.findFirstOrThrow({
    where: { citizenId: created.id, type: "spectrum-id" },
  });
  expect(spectrumIdLog.content).toBe("NEWCOMER");

  await expect(page.getByText("NEWCOMER").first()).toBeVisible();

  /**
   * Delete — a soft delete: the citizen and its logs stay, hidden
   */
  const deleteDialog = page.getByRole("alertdialog");
  await clickUntilVisible(
    page.getByRole("button", { name: "Löschen" }),
    deleteDialog,
  );
  await expect(page.getByText("Citizen löschen?")).toBeVisible();
  await deleteDialog.getByRole("button", { name: "Löschen" }).click();

  await expect(page.getByText(DELETED_TEXT)).toBeVisible();
  await expect
    .poll(
      async () =>
        (
          await prisma.citizen.findUniqueOrThrow({
            where: { id: created.id },
            select: { deletedAt: true },
          })
        ).deletedAt,
    )
    .not.toBeNull();
  expect(
    await prisma.citizenLog.count({ where: { citizenId: created.id } }),
  ).toBe(1);

  await expectAuditEvents(prisma, ["CITIZEN_CREATED", "CITIZEN_DELETED"]);
});

test("a known Spectrum ID opens its citizen and creates no second one", async ({
  page,
  prisma,
  signIn,
}) => {
  const admin = await createCitizen(prisma, {
    handle: "spynet-anleger",
    permissionStrings: ["citizen;create", "citizen;read"],
  });
  const known = await prisma.citizen.create({
    data: { handle: "bekannter", spectrumId: "BEKANNTER" },
  });

  await signIn(admin.user);
  await page.goto("/app/spynet");

  const createDialog = modal(page, "Neuer Citizen");
  await clickUntilVisible(
    page.getByRole("button", { name: "Citizen" }),
    createDialog,
  );
  await createDialog.getByLabel("Spectrum ID").fill("BEKANNTER");
  await createDialog.getByRole("button", { name: "Anlegen" }).click();

  await expect(page.getByRole("heading", { name: "bekannter" })).toBeVisible();
  await expect(createDialog).toHaveCount(0);
  await expect(page).toHaveURL(`/app/spynet/citizen/${known.id}`);

  expect(
    await prisma.citizen.count({ where: { spectrumId: "BEKANNTER" } }),
  ).toBe(1);
  expect(await prisma.citizenLog.count()).toBe(0);
  expect(
    await prisma.auditEvent.count({ where: { type: "CITIZEN_CREATED" } }),
  ).toBe(0);
});

test("a Spectrum ID of only spaces creates no citizen", async ({
  page,
  prisma,
  signIn,
}) => {
  const admin = await createCitizen(prisma, {
    handle: "spynet-anleger",
    permissionStrings: ["citizen;create", "citizen;read"],
  });

  await signIn(admin.user);
  await page.goto("/app/spynet");

  const createDialog = modal(page, "Neuer Citizen");
  await clickUntilVisible(
    page.getByRole("button", { name: "Citizen" }),
    createDialog,
  );
  await createDialog.getByLabel("Spectrum ID").fill("   ");
  await createDialog.getByRole("button", { name: "Anlegen" }).click();

  await expect(createDialog.getByText("Ungültige Anfrage")).toBeVisible();
  expect(
    await prisma.citizen.count({ where: { createdById: admin.entity.id } }),
  ).toBe(0);
});

test("a deleted member leaves the member list of its organization", async ({
  page,
  prisma,
  signIn,
}) => {
  const admin = await createCitizen(prisma, {
    handle: "spynet-admin",
    permissionStrings: [
      "citizen;read",
      "citizen;delete",
      "organization;read",
      "organizationMembership;read",
    ],
  });
  const member = await createCitizen(prisma, { handle: "mitglied" });

  const organization = await prisma.organization.create({
    data: {
      name: "Recorded Org",
      spectrumId: "RECORDEDORG",
      createdById: admin.entity.id,
      activeMemberships: {
        create: {
          citizenId: member.entity.id,
          type: OrganizationMembershipType.MAIN,
          visibility: OrganizationMembershipVisibility.PUBLIC,
        },
      },
    },
  });

  await signIn(admin.user);
  await page.goto(`/app/spynet/organization/${organization.id}`);
  await expect(page.getByText("Mitglieder (1)")).toBeVisible();
  await expect(page.getByRole("link", { name: "mitglied" })).toBeVisible();

  await page.goto(`/app/spynet/citizen/${member.entity.id}`);
  const deleteDialog = page.getByRole("alertdialog");
  await clickUntilVisible(
    page.getByRole("button", { name: "Löschen" }),
    deleteDialog,
  );
  await deleteDialog.getByRole("button", { name: "Löschen" }).click();
  await expect(page.getByText(DELETED_TEXT)).toBeVisible();

  /** The membership stays in the database, only the list hides it */
  expect(
    await prisma.activeOrganizationMembership.count({
      where: { citizenId: member.entity.id },
    }),
  ).toBe(1);

  await page.goto(`/app/spynet/organization/${organization.id}`);
  await expect(page.getByText("Keine Mitglieder")).toBeVisible();
  await expect(page.getByText("Mitglieder (0)")).toBeVisible();
});

test("a log entry is confirmed, and a second one marked a false report", async ({
  page,
  prisma,
  signIn,
}) => {
  const admin = await createCitizen(prisma, {
    handle: "spynet-pruefer",
    permissionStrings: [
      "citizen;read",
      "handle;create",
      "handle;read",
      "handle;confirm",
    ],
  });
  const target = await createCitizen(prisma, { handle: "zielperson" });

  await signIn(admin.user);
  await page.goto(`/app/spynet/citizen/${target.entity.id}`);

  const historyDialog = modal(page, "Handle History");
  await clickUntilVisible(
    page.getByRole("button", { name: "Handle History" }),
    historyDialog,
  );

  /**
   * Two entries, both unconfirmed until somebody decides about them
   */
  for (const content of ["ersterhandle", "zweiterhandle"]) {
    await historyDialog.getByPlaceholder("Neuer Eintrag ...").fill(content);
    await historyDialog.getByRole("button", { name: "Speichern" }).click();
    await expect(
      historyDialog.getByText(content, { exact: true }),
    ).toBeVisible();
  }

  const entryOf = (content: string) =>
    historyDialog.getByRole("listitem").filter({ hasText: content });

  await expect(entryOf("zweiterhandle").getByText("Unbestätigt")).toBeVisible();

  await entryOf("zweiterhandle")
    .getByRole("button", { name: "Bestätigen" })
    .click();
  await expect(entryOf("zweiterhandle").getByText("Unbestätigt")).toHaveCount(
    0,
  );

  /** Deciding removes the entry's own decision buttons */
  await entryOf("ersterhandle")
    .getByRole("button", { name: "Falschmeldung" })
    .click();
  await expect(
    entryOf("ersterhandle").getByRole("button", { name: "Falschmeldung" }),
  ).toHaveCount(0);

  await expect
    .poll(async () => {
      const logs = await prisma.citizenLog.findMany({
        where: {
          citizenId: target.entity.id,
          type: "handle",
          confirmed: { not: null },
        },
        select: { content: true, confirmed: true },
      });
      return Object.fromEntries(
        logs.map((log) => [log.content, log.confirmed]),
      );
    })
    .toEqual({ ersterhandle: "FALSE_REPORT", zweiterhandle: "CONFIRMED" });

  /** Only the confirmed one becomes the citizen's handle */
  await expect
    .poll(async () => {
      const entity = await prisma.citizen.findUniqueOrThrow({
        where: { id: target.entity.id },
        select: { handle: true },
      });
      return entity.handle;
    })
    .toBe("zweiterhandle");
});

test("a deleted log entry leaves the history, and the overview shows the previous confirmed value", async ({
  page,
  prisma,
  signIn,
}) => {
  const admin = await createCitizen(prisma, {
    handle: "spynet-aufraeumer",
    permissionStrings: ["citizen;read", "handle;read", "handle;delete"],
  });
  const target = await createCitizen(prisma, { handle: "neuerhandle" });
  const now = Date.now();
  await prisma.citizenLog.createMany({
    data: ["alterhandle", "neuerhandle"].map((content, index) => {
      const createdAt = new Date(now - (2 - index) * ONE_MINUTE_MS);

      return {
        citizenId: target.entity.id,
        type: "handle",
        content,
        confirmed: ConfirmationStatus.CONFIRMED,
        confirmedAt: createdAt,
        createdAt,
      };
    }),
  });

  await signIn(admin.user);
  await page.goto(`/app/spynet/citizen/${target.entity.id}`);
  await expect(overviewAttribute(page, "Handle")).toContainText("neuerhandle");

  const historyDialog = modal(page, "Handle History");
  await clickUntilVisible(
    page.getByRole("button", { name: "Handle History" }),
    historyDialog,
  );
  const entryOf = (content: string) =>
    historyDialog.getByRole("listitem").filter({ hasText: content });

  const deleteDialog = page.getByRole("alertdialog", {
    name: "Eintrag löschen?",
  });
  await clickUntilVisible(
    entryOf("neuerhandle").getByRole("button", { name: "Löschen" }),
    deleteDialog,
  );
  await deleteDialog.getByRole("button", { name: "Löschen" }).click();

  await expect(page.getByText(DELETED_TEXT)).toBeVisible();
  await expect(entryOf("neuerhandle")).toHaveCount(0);
  await expect(entryOf("alterhandle")).toBeVisible();

  /** The page behind the modal shows the change without a new load */
  await page.keyboard.press("Escape");
  await expect(historyDialog).not.toBeVisible();
  await expect(overviewAttribute(page, "Handle")).toContainText("alterhandle");

  expect(
    await prisma.citizenLog.count({
      where: { citizenId: target.entity.id, content: "neuerhandle" },
    }),
  ).toBe(0);
  /** The login takes the handle that is confirmed now */
  expect(
    await prisma.user.findUniqueOrThrow({
      where: { id: target.user.id },
      select: { name: true },
    }),
  ).toEqual({ name: "alterhandle" });
  await expectAuditEvents(prisma, ["ENTITY_LOG_DELETED"]);
});

test("confirming a Discord ID links the citizen to the login with that ID", async ({
  page,
  prisma,
  signIn,
}) => {
  const admin = await createCitizen(prisma, {
    handle: "spynet-verknuepfer",
    permissionStrings: [
      "citizen;read",
      "discord-id;create",
      "discord-id;read",
      "discord-id;confirm",
    ],
  });
  const newcomer = await createUserWithoutCitizen(prisma, { name: "neuling" });
  const { providerAccountId } = await prisma.account.findFirstOrThrow({
    where: { userId: newcomer.id },
  });
  const target = await prisma.citizen.create({ data: { handle: "neuling" } });

  await signIn(admin.user);
  await page.goto(`/app/spynet/citizen/${target.id}`);

  const historyDialog = modal(page, "Discord ID History");
  await clickUntilVisible(
    page.getByRole("button", { name: "Discord ID History" }),
    historyDialog,
  );
  await historyDialog
    .getByPlaceholder("Neuer Eintrag ...")
    .fill(providerAccountId);
  await historyDialog.getByRole("button", { name: "Speichern" }).click();

  const entry = historyDialog
    .getByRole("listitem")
    .filter({ hasText: providerAccountId });
  await entry.getByRole("button", { name: "Bestätigen" }).click();

  await expect
    .poll(
      async () =>
        (
          await prisma.citizen.findUniqueOrThrow({
            where: { id: target.id },
            select: { userId: true },
          })
        ).userId,
    )
    .toBe(newcomer.id);
});

test("a decision about a Discord ID that a different user decided after the page loaded shows a message and keeps the decision", async ({
  page,
  prisma,
  signIn,
}) => {
  const admin = await createCitizen(prisma, {
    handle: "spynet-verknuepfer",
    permissionStrings: [
      "citizen;read",
      "discord-id;create",
      "discord-id;read",
      "discord-id;confirm",
    ],
  });
  const otherReviewer = await createCitizen(prisma, {
    handle: "anderer-pruefer",
  });
  const newcomer = await createUserWithoutCitizen(prisma, { name: "neuling" });
  const { providerAccountId } = await prisma.account.findFirstOrThrow({
    where: { userId: newcomer.id },
  });
  const target = await prisma.citizen.create({ data: { handle: "neuling" } });
  const discordIdLog = await prisma.citizenLog.create({
    data: {
      citizenId: target.id,
      type: "discord-id",
      content: providerAccountId,
    },
  });

  await signIn(admin.user);
  await page.goto(`/app/spynet/citizen/${target.id}`);
  await expect(overviewAttribute(page, "Discord ID")).toBeVisible();
  await expect(overviewAttribute(page, "Discord ID")).not.toContainText(
    providerAccountId,
  );

  const historyDialog = modal(page, "Discord ID History");
  await clickUntilVisible(
    page.getByRole("button", { name: "Discord ID History" }),
    historyDialog,
  );
  const entry = historyDialog
    .getByRole("listitem")
    .filter({ hasText: providerAccountId });
  await expect(entry.getByText("Unbestätigt")).toBeVisible();

  /** A different user confirms the log after the page loaded */
  await prisma.$transaction([
    prisma.citizenLog.update({
      where: { id: discordIdLog.id },
      data: {
        confirmed: ConfirmationStatus.CONFIRMED,
        confirmedAt: new Date(),
        confirmedById: otherReviewer.user.id,
      },
    }),
    prisma.citizen.update({
      where: { id: target.id },
      data: { discordId: providerAccountId, userId: newcomer.id },
    }),
  ]);

  await entry.getByRole("button", { name: "Falschmeldung" }).click();
  await expect(
    page.getByText("Über diesen Eintrag wurde bereits entschieden."),
  ).toBeVisible();
  await expect(
    entry.getByRole("button", { name: "Falschmeldung" }),
  ).toHaveCount(0);
  await expect(entry.getByText("Bestätigt von anderer-pruefer")).toBeVisible();

  /** The refresh shows the decision of the other user behind the modal */
  await page.keyboard.press("Escape");
  await expect(historyDialog).not.toBeVisible();
  await expect(overviewAttribute(page, "Discord ID")).toContainText(
    providerAccountId,
  );

  expect(
    await prisma.citizenLog.findUniqueOrThrow({
      where: { id: discordIdLog.id },
      select: { confirmed: true, confirmedById: true },
    }),
  ).toEqual({
    confirmed: ConfirmationStatus.CONFIRMED,
    confirmedById: otherReviewer.user.id,
  });
  expect(
    await prisma.citizen.findUniqueOrThrow({
      where: { id: target.id },
      select: { discordId: true, userId: true },
    }),
  ).toEqual({ discordId: providerAccountId, userId: newcomer.id });
  expect(
    await prisma.auditEvent.count({
      where: { type: "ENTITY_LOG_CONFIRMED" },
    }),
  ).toBe(0);
});

test("a new citizen gets the confirmed Discord ID of a deleted citizen and its login", async ({
  page,
  prisma,
  signIn,
}) => {
  const admin = await createCitizen(prisma, {
    handle: "spynet-verknuepfer",
    permissionStrings: [
      "citizen;read",
      "discord-id;create",
      "discord-id;read",
      "discord-id;confirm",
    ],
  });
  const former = await createCitizen(prisma, { handle: "ehemaliger" });
  await prisma.citizen.update({
    where: { id: former.entity.id },
    data: { deletedAt: new Date(), userId: null },
  });
  const successor = await prisma.citizen.create({
    data: { handle: "nachfolger" },
  });
  const discordId = former.entity.discordId!;

  await signIn(admin.user);
  await page.goto(`/app/spynet/citizen/${successor.id}`);

  const historyDialog = modal(page, "Discord ID History");
  await clickUntilVisible(
    page.getByRole("button", { name: "Discord ID History" }),
    historyDialog,
  );
  await historyDialog.getByPlaceholder("Neuer Eintrag ...").fill(discordId);
  await historyDialog.getByRole("button", { name: "Speichern" }).click();

  const entry = historyDialog
    .getByRole("listitem")
    .filter({ hasText: discordId });
  await entry.getByRole("button", { name: "Bestätigen" }).click();

  await expect
    .poll(() =>
      prisma.citizen.findUniqueOrThrow({
        where: { id: successor.id },
        select: { discordId: true, userId: true },
      }),
    )
    .toEqual({ discordId, userId: former.user.id });
  /** The deleted citizen keeps its Discord ID, but not the login */
  expect(
    await prisma.citizen.findUniqueOrThrow({
      where: { id: former.entity.id },
      select: { discordId: true, userId: true },
    }),
  ).toEqual({ discordId, userId: null });
  /** The login takes the handle of its new citizen */
  expect(
    await prisma.user.findUniqueOrThrow({
      where: { id: former.user.id },
      select: { name: true },
    }),
  ).toEqual({ name: "nachfolger" });
});

test("the overview shows the confirmed value of every identity attribute", async ({
  page,
  prisma,
  signIn,
}) => {
  const admin = await createCitizen(prisma, {
    handle: "spynet-leser",
    permissionStrings: ["citizen;read", "discord-id;read", "teamspeak-id;read"],
  });
  /**
   * The columns hold what the confirmation of a log entry wrote into them
   * (see the test above), which is what the overview reads.
   */
  const target = await createCitizen(prisma, { handle: "beobachteter" });
  await prisma.citizen.update({
    where: { id: target.entity.id },
    data: {
      spectrumId: "BEOBACHTETER",
      citizenRecord: "9876543",
      communityMoniker: "Der Beobachtete",
      teamspeakId: "ts-4711",
    },
  });

  await signIn(admin.user);
  await page.goto(`/app/spynet/citizen/${target.entity.id}`);

  const expectedAttributes: Record<string, string> = {
    "Internal ID": target.entity.id,
    "Spectrum ID": "BEOBACHTETER",
    "Citizen ID": "9876543",
    Handle: "beobachteter",
    "Community Moniker": "Der Beobachtete",
    "Discord ID": target.entity.discordId!,
    "TeamSpeak ID": "ts-4711",
  };

  for (const [name, value] of Object.entries(expectedAttributes)) {
    await expect(overviewAttribute(page, name)).toContainText(value);
  }
});

test("a note is saved, confirmed, moved to a different note type and deleted", async ({
  page,
  prisma,
  signIn,
}) => {
  const observation = await prisma.noteType.create({
    data: { name: "Beobachtung" },
  });
  const rumour = await prisma.noteType.create({ data: { name: "Gerücht" } });
  const secret = await prisma.classificationLevel.create({
    data: { name: "Geheim" },
  });
  const topSecret = await prisma.classificationLevel.create({
    data: { name: "Streng geheim" },
  });
  /**
   * The buttons of a note without a decision need permissions for notes
   * without a decision
   */
  const allNotes = "noteTypeId=*;classificationLevelId=*";
  const analyst = await createCitizen(prisma, {
    handle: "notiz-analyst",
    permissionStrings: [
      "citizen;read",
      `note;create;${allNotes}`,
      ...["read", "confirm", "update", "delete"].map(
        (operation) => `note;${operation};${allNotes};alsoUnconfirmed=true`,
      ),
    ],
  });
  const target = await createCitizen(prisma, { handle: "zielperson" });
  const noteContent = "Fliegt eine Cutlass Black.";
  const findNote = () =>
    prisma.citizenLog.findFirstOrThrow({
      where: { citizenId: target.entity.id, type: "note" },
      select: {
        content: true,
        noteTypeId: true,
        classificationLevelId: true,
        confirmed: true,
      },
    });

  /** The panels are keep-mounted, thus each lookup names its panel */
  const notePanel = (name: string) => page.getByRole("tabpanel", { name });
  const noteIn = (panelName: string) =>
    notePanel(panelName).getByRole("article").filter({ hasText: noteContent });

  await signIn(analyst.user);
  await page.goto(`/app/spynet/citizen/${target.entity.id}/notes`);
  await waitForAppShellHydration(page);

  // Save
  const contentInput = notePanel("Beobachtung").getByRole("textbox", {
    name: "Neue Notiz",
  });
  await contentInput.fill(noteContent);
  await notePanel("Beobachtung")
    .getByRole("combobox", { name: "Geheimhaltungsstufe" })
    .selectOption({ label: "Streng geheim" });
  await notePanel("Beobachtung")
    .getByRole("button", { name: "Speichern" })
    .click();
  await expect(page.getByText(SAVED_TEXT)).toBeVisible();
  await expect(noteIn("Beobachtung").getByText("Unbestätigt")).toBeVisible();
  await expect(contentInput).toHaveValue("");
  expect(await findNote()).toEqual({
    content: noteContent,
    noteTypeId: observation.id,
    classificationLevelId: topSecret.id,
    confirmed: null,
  });

  // Confirm
  await noteIn("Beobachtung")
    .getByRole("button", { name: "Bestätigen" })
    .click();
  await expect(noteIn("Beobachtung").getByText("Unbestätigt")).toHaveCount(0);
  expect((await findNote()).confirmed).toBe(ConfirmationStatus.CONFIRMED);

  // Move to a different note type and classification level
  const updateDialog = modal(page, "Bearbeiten");
  await clickUntilVisible(
    noteIn("Beobachtung").getByRole("button", { name: "Bearbeiten" }),
    updateDialog,
  );
  await updateDialog.getByLabel("Notizart").selectOption({ label: "Gerücht" });
  await updateDialog
    .getByLabel("Geheimhaltungsstufe")
    .selectOption({ label: "Geheim" });
  await updateDialog.getByRole("button", { name: "Speichern" }).click();
  await expect(updateDialog).toHaveCount(0);

  await page.getByRole("tab", { name: "Gerücht" }).click();
  await expect(noteIn("Gerücht")).toBeVisible();
  await expect(
    noteIn("Gerücht").getByText("Geheim", { exact: true }),
  ).toBeVisible();
  expect(await findNote()).toMatchObject({
    noteTypeId: rumour.id,
    classificationLevelId: secret.id,
  });

  // Delete
  const deleteDialog = page.getByRole("alertdialog", {
    name: "Eintrag löschen?",
  });
  await clickUntilVisible(
    noteIn("Gerücht").getByRole("button", { name: "Löschen" }),
    deleteDialog,
  );
  await deleteDialog.getByRole("button", { name: "Löschen" }).click();
  await expect(page.getByText(DELETED_TEXT)).toBeVisible();
  await expect(noteIn("Gerücht")).toHaveCount(0);
  expect(
    await prisma.citizenLog.count({
      where: { citizenId: target.entity.id, type: "note" },
    }),
  ).toBe(0);

  await expectAuditEvents(prisma, [
    "ENTITY_LOG_CREATED",
    "ENTITY_LOG_CONFIRMED",
    "ENTITY_LOG_UPDATED",
    "ENTITY_LOG_DELETED",
  ]);
});

test("a note in a classification level that a different user deleted shows a message and keeps the text", async ({
  page,
  prisma,
  signIn,
}) => {
  await prisma.noteType.create({ data: { name: "Beobachtung" } });
  await prisma.classificationLevel.create({ data: { name: "Geheim" } });
  const topSecret = await prisma.classificationLevel.create({
    data: { name: "Streng geheim" },
  });
  const allNotes = "noteTypeId=*;classificationLevelId=*";
  const writer = await createCitizen(prisma, {
    handle: "notiz-verfasser",
    permissionStrings: [
      "citizen;read",
      `note;create;${allNotes}`,
      `note;read;${allNotes};alsoUnconfirmed=true`,
    ],
  });
  const target = await createCitizen(prisma, { handle: "zielperson" });
  const noteContent = "Handelt mit Quantanium.";
  const notePanel = page.getByRole("tabpanel", { name: "Beobachtung" });
  const classificationLevelSelect = notePanel.getByRole("combobox", {
    name: "Geheimhaltungsstufe",
  });

  await signIn(writer.user);
  await page.goto(`/app/spynet/citizen/${target.entity.id}/notes`);
  await waitForAppShellHydration(page);

  const contentInput = notePanel.getByRole("textbox", { name: "Neue Notiz" });
  await contentInput.fill(noteContent);
  await classificationLevelSelect.selectOption({ label: "Streng geheim" });

  await prisma.classificationLevel.delete({ where: { id: topSecret.id } });

  await notePanel.getByRole("button", { name: "Speichern" }).click();
  await expect(
    page.getByText("Die gesuchte Ressource wurde nicht gefunden."),
  ).toBeVisible();
  /** The refresh shows the one level that is left, thus no select */
  await expect(classificationLevelSelect).toHaveCount(0);
  await expect(contentInput).toHaveValue(noteContent);

  expect(await prisma.citizenLog.count({ where: { type: "note" } })).toBe(0);
  expect(
    await prisma.auditEvent.count({ where: { type: "ENTITY_LOG_CREATED" } }),
  ).toBe(0);
});

test("a move of a note to a note type that a different user deleted shows a message and the current note types", async ({
  page,
  prisma,
  signIn,
}) => {
  const observation = await prisma.noteType.create({
    data: { name: "Beobachtung" },
  });
  const rumour = await prisma.noteType.create({ data: { name: "Gerücht" } });
  const classificationLevel = await prisma.classificationLevel.create({
    data: { name: "Geheim" },
  });
  const allNotes = "noteTypeId=*;classificationLevelId=*";
  const analyst = await createCitizen(prisma, {
    handle: "notiz-analyst",
    permissionStrings: [
      "citizen;read",
      `note;create;${allNotes}`,
      `note;read;${allNotes};alsoUnconfirmed=true`,
      `note;update;${allNotes};alsoUnconfirmed=true`,
    ],
  });
  const target = await createCitizen(prisma, { handle: "zielperson" });
  const note = await prisma.citizenLog.create({
    data: {
      citizenId: target.entity.id,
      type: "note",
      content: "Fliegt eine Cutlass Black.",
      noteTypeId: observation.id,
      classificationLevelId: classificationLevel.id,
    },
  });

  await signIn(analyst.user);
  await page.goto(`/app/spynet/citizen/${target.entity.id}/notes`);
  await expect(page.getByRole("tab", { name: "Gerücht" })).toBeVisible();

  const updateDialog = modal(page, "Bearbeiten");
  await clickUntilVisible(
    page
      .getByRole("tabpanel", { name: "Beobachtung" })
      .getByRole("button", { name: "Bearbeiten" }),
    updateDialog,
  );
  const noteTypeSelect = updateDialog.getByLabel("Notizart");
  await noteTypeSelect.selectOption({ label: "Gerücht" });

  await prisma.noteType.delete({ where: { id: rumour.id } });

  await updateDialog.getByRole("button", { name: "Speichern" }).click();
  await expect(
    page.getByText("Die gesuchte Ressource wurde nicht gefunden."),
  ).toBeVisible();
  /** The refresh removes the deleted note type from the select and the tabs */
  await expect(
    noteTypeSelect.getByRole("option", { name: "Gerücht" }),
  ).toHaveCount(0);
  /** The open modal hides the tabs from the accessibility tree */
  await page.keyboard.press("Escape");
  await expect(updateDialog).not.toBeVisible();
  await expect(page.getByRole("tab", { name: "Gerücht" })).toHaveCount(0);

  expect(
    await prisma.citizenLog.findUniqueOrThrow({
      where: { id: note.id },
      select: { noteTypeId: true },
    }),
  ).toEqual({ noteTypeId: observation.id });
  expect(
    await prisma.auditEvent.count({ where: { type: "ENTITY_LOG_UPDATED" } }),
  ).toBe(0);
});
