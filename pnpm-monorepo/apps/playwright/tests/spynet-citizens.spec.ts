import type { Page } from "@playwright/test";
import {
  ConfirmationStatus,
  OrganizationMembershipType,
  OrganizationMembershipVisibility,
} from "@sam-monorepo/database/client";
import { expectAuditEvents } from "../fixtures/audit";
import { createCitizen, createUserWithoutCitizen } from "../fixtures/factories";
import {
  clickUntilVisible,
  DELETED_TEXT,
  modal,
  sectionByHeading,
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

test("a false report of the confirmed Discord ID removes the link to the login", async ({
  page,
  prisma,
  signIn,
  switchUser,
}) => {
  const admin = await createCitizen(prisma, {
    handle: "spynet-verknuepfer",
    permissionStrings: ["citizen;read", "discord-id;create", "discord-id;read"],
  });
  const target = await createCitizen(prisma, { handle: "verknuepfter" });
  const discordIdLog = await prisma.citizenLog.create({
    data: {
      citizenId: target.entity.id,
      type: "discord-id",
      content: target.entity.discordId,
      confirmed: ConfirmationStatus.CONFIRMED,
      confirmedAt: new Date(),
    },
  });

  await signIn(admin.user);

  /**
   * The UI shows the decision buttons only for a log without a decision,
   * thus the change of the decision goes through the API of these buttons
   */
  const response = await page.request.patch(
    `/api/spynet/citizen/${target.entity.id}/log/${discordIdLog.id}/confirm`,
    { data: { confirmed: "false-report" } },
  );
  expect(response.status()).toBe(200);

  expect(
    await prisma.citizen.findUniqueOrThrow({
      where: { id: target.entity.id },
      select: { discordId: true, userId: true },
    }),
  ).toEqual({ discordId: null, userId: null });
  await expectAuditEvents(prisma, ["ENTITY_LOG_CONFIRMED"]);

  await switchUser(target.user);
  await page.goto("/app/dashboard");
  await expect(page).toHaveURL("/clearance");
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
