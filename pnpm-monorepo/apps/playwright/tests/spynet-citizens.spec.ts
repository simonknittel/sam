import type { Page } from "@playwright/test";
import {
  ConfirmationStatus,
  OrganizationMembershipType,
  OrganizationMembershipVisibility,
  type Prisma,
} from "@sam-monorepo/database/client";
import { expectAuditEvents } from "../fixtures/audit";
import { startParallelChange } from "../fixtures/database";
import {
  createCitizen,
  createUserWithoutCitizen,
  ONE_MINUTE_MS,
} from "../fixtures/factories";
import {
  BAD_REQUEST_TEXT,
  clickUntilVisible,
  DELETED_TEXT,
  FORBIDDEN_ACTION_TEXT,
  modal,
  NOT_FOUND_TEXT,
  RESOURCE_NOT_FOUND_TEXT,
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

/** A different user deletes the citizen: a soft delete, as the action does */
const markCitizenDeleted = (
  prisma: Prisma.TransactionClient,
  citizenId: string,
) =>
  prisma.citizen.update({
    where: { id: citizenId },
    data: { deletedAt: new Date() },
  });

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

  await expect(createDialog.getByText(BAD_REQUEST_TEXT)).toBeVisible();
  expect(
    await prisma.citizen.count({ where: { createdById: admin.entity.id } }),
  ).toBe(0);
});

test("a citizen that a different user creates at the same time opens, and no second one is created", async ({
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
  await createDialog.getByLabel("Spectrum ID").fill("GLEICHZEITIG");

  /**
   * The citizen of the different user is not visible to the check of the
   * action before the commit. Thus the create of the action passes the check
   * and waits for the unique index.
   */
  const parallelCreate = await startParallelChange(prisma, (transaction) =>
    transaction.citizen.create({
      data: { handle: "gleichzeitiger", spectrumId: "GLEICHZEITIG" },
    }),
  );
  try {
    await createDialog.getByRole("button", { name: "Anlegen" }).click();
    await parallelCreate.waitForBlockedStatement();
  } finally {
    await parallelCreate.commit();
  }

  await expect(page).toHaveURL(
    `/app/spynet/citizen/${parallelCreate.result.id}`,
  );
  await expect(
    page.getByRole("heading", { name: "gleichzeitiger" }),
  ).toBeVisible();
  await expect(createDialog).toHaveCount(0);

  expect(
    await prisma.citizen.count({ where: { spectrumId: "GLEICHZEITIG" } }),
  ).toBe(1);
  expect(await prisma.citizenLog.count()).toBe(0);
  expect(
    await prisma.auditEvent.count({ where: { type: "CITIZEN_CREATED" } }),
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

test("deleting the confirmed Discord ID log removes the link to the login", async ({
  page,
  prisma,
  signIn,
  switchUser,
}) => {
  const admin = await createCitizen(prisma, {
    handle: "spynet-aufraeumer",
    permissionStrings: ["citizen;read", "discord-id;read", "discord-id;delete"],
  });
  /** The roles of the citizen give the login its clearance */
  const target = await createCitizen(prisma, { handle: "verknuepfter" });
  const discordId = target.entity.discordId!;
  await prisma.citizenLog.create({
    data: {
      citizenId: target.entity.id,
      type: "discord-id",
      content: discordId,
      confirmed: ConfirmationStatus.CONFIRMED,
      confirmedAt: new Date(),
    },
  });

  await signIn(admin.user);
  await page.goto(`/app/spynet/citizen/${target.entity.id}`);
  await expect(overviewAttribute(page, "Discord ID")).toContainText(discordId);

  const historyDialog = modal(page, "Discord ID History");
  await clickUntilVisible(
    page.getByRole("button", { name: "Discord ID History" }),
    historyDialog,
  );
  const entry = historyDialog
    .getByRole("listitem")
    .filter({ hasText: discordId });
  const deleteDialog = page.getByRole("alertdialog", {
    name: "Eintrag löschen?",
  });
  await clickUntilVisible(
    entry.getByRole("button", { name: "Löschen" }),
    deleteDialog,
  );
  await deleteDialog.getByRole("button", { name: "Löschen" }).click();

  await expect(page.getByText(DELETED_TEXT)).toBeVisible();
  await expect(entry).toHaveCount(0);
  expect(
    await prisma.citizen.findUniqueOrThrow({
      where: { id: target.entity.id },
      select: { discordId: true, userId: true },
    }),
  ).toEqual({ discordId: null, userId: null });
  await expectAuditEvents(prisma, ["ENTITY_LOG_DELETED"]);

  /** The login continues as a login without a citizen, thus without roles */
  await switchUser(target.user);
  await page.goto("/app/dashboard");
  await expect(page).toHaveURL("/clearance");
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

test("a confirmation of the own Discord ID shows a message and changes no login, and the Discord ID of a different person is confirmed", async ({
  page,
  prisma,
  signIn,
}) => {
  const reviewer = await createCitizen(prisma, {
    handle: "spynet-verknuepfer",
    permissionStrings: [
      "citizen;read",
      "discord-id;create",
      "discord-id;read",
      "discord-id;confirm",
    ],
  });
  /** The roles of the target would go to the login that the confirmation links */
  const target = await createCitizen(prisma, { handle: "zielperson" });
  const ownDiscordId = reviewer.entity.discordId!;
  const newcomer = await createUserWithoutCitizen(prisma, { name: "neuling" });
  const { providerAccountId: newcomerDiscordId } =
    await prisma.account.findFirstOrThrow({
      where: { userId: newcomer.id },
    });
  const loginOf = async (citizenId: string) =>
    (
      await prisma.citizen.findUniqueOrThrow({
        where: { id: citizenId },
        select: { userId: true },
      })
    ).userId;
  const countConfirmations = () =>
    prisma.auditEvent.count({ where: { type: "ENTITY_LOG_CONFIRMED" } });

  await signIn(reviewer.user);
  await page.goto(`/app/spynet/citizen/${target.entity.id}`);

  const historyDialog = modal(page, "Discord ID History");
  await clickUntilVisible(
    page.getByRole("button", { name: "Discord ID History" }),
    historyDialog,
  );
  const entryOf = (discordId: string) =>
    historyDialog.getByRole("listitem").filter({ hasText: discordId });
  const addEntry = async (discordId: string) => {
    await historyDialog.getByPlaceholder("Neuer Eintrag ...").fill(discordId);
    await historyDialog.getByRole("button", { name: "Speichern" }).click();
    await expect(entryOf(discordId)).toBeVisible();
  };

  await addEntry(ownDiscordId);
  await entryOf(ownDiscordId)
    .getByRole("button", { name: "Bestätigen" })
    .click();
  await expect(
    page.getByText(
      "Du kannst deine eigene Discord ID nicht bestätigen. Das muss eine andere Person tun.",
    ),
  ).toBeVisible();
  await expect(entryOf(ownDiscordId).getByText("Unbestätigt")).toBeVisible();

  expect(
    await prisma.citizenLog.findFirstOrThrow({
      where: { citizenId: target.entity.id, content: ownDiscordId },
      select: { confirmed: true },
    }),
  ).toEqual({ confirmed: null });
  expect(await loginOf(target.entity.id)).toBe(target.user.id);
  expect(await loginOf(reviewer.entity.id)).toBe(reviewer.user.id);
  expect(await countConfirmations()).toBe(0);

  await addEntry(newcomerDiscordId);
  await entryOf(newcomerDiscordId)
    .getByRole("button", { name: "Bestätigen" })
    .click();

  await expect.poll(() => loginOf(target.entity.id)).toBe(newcomer.id);
  expect(await loginOf(reviewer.entity.id)).toBe(reviewer.user.id);
  await expect.poll(countConfirmations).toBe(1);
});

test("a confirmation of the own Discord ID is refused also when the own citizen has no Discord ID", async ({
  page,
  prisma,
  signIn,
}) => {
  const reviewer = await createCitizen(prisma, {
    handle: "spynet-verknuepfer",
    permissionStrings: [
      "citizen;read",
      "discord-id;create",
      "discord-id;read",
      "discord-id;confirm",
    ],
  });
  /**
   * The Discord account of the reviewer stays, but no citizen has its
   * Discord ID. Thus the unique Discord ID cannot refuse the confirmation,
   * only the check of the own Discord account can.
   */
  const ownDiscordId = reviewer.entity.discordId!;
  await prisma.citizen.update({
    where: { id: reviewer.entity.id },
    data: { discordId: null },
  });
  const target = await createCitizen(prisma, { handle: "zielperson" });
  const ownLog = await prisma.citizenLog.create({
    data: {
      citizenId: target.entity.id,
      type: "discord-id",
      content: ownDiscordId,
    },
  });

  await signIn(reviewer.user);
  await page.goto(`/app/spynet/citizen/${target.entity.id}`);

  const historyDialog = modal(page, "Discord ID History");
  await clickUntilVisible(
    page.getByRole("button", { name: "Discord ID History" }),
    historyDialog,
  );
  const entry = historyDialog
    .getByRole("listitem")
    .filter({ hasText: ownDiscordId });
  await entry.getByRole("button", { name: "Bestätigen" }).click();

  await expect(
    page.getByText(
      "Du kannst deine eigene Discord ID nicht bestätigen. Das muss eine andere Person tun.",
    ),
  ).toBeVisible();
  await expect(entry.getByText("Unbestätigt")).toBeVisible();
  expect(
    await prisma.citizenLog.findUniqueOrThrow({
      where: { id: ownLog.id },
      select: { confirmed: true },
    }),
  ).toEqual({ confirmed: null });
  expect(
    await prisma.citizen.findMany({
      where: { id: { in: [reviewer.entity.id, target.entity.id] } },
      select: { id: true, discordId: true, userId: true },
      orderBy: { handle: "asc" },
    }),
  ).toEqual([
    { id: reviewer.entity.id, discordId: null, userId: reviewer.user.id },
    {
      id: target.entity.id,
      discordId: target.entity.discordId,
      userId: target.user.id,
    },
  ]);
  expect(
    await prisma.auditEvent.count({ where: { type: "ENTITY_LOG_CONFIRMED" } }),
  ).toBe(0);
});

test("a confirmation of a Discord ID that a different citizen has shows a message and changes nothing", async ({
  page,
  prisma,
  signIn,
}) => {
  const reviewer = await createCitizen(prisma, {
    handle: "spynet-verknuepfer",
    permissionStrings: [
      "citizen;read",
      "discord-id;create",
      "discord-id;read",
      "discord-id;confirm",
    ],
  });
  const holder = await createCitizen(prisma, { handle: "inhaber" });
  const target = await createCitizen(prisma, { handle: "zweite-person" });
  const takenDiscordId = holder.entity.discordId!;

  await signIn(reviewer.user);
  await page.goto(`/app/spynet/citizen/${target.entity.id}`);

  const historyDialog = modal(page, "Discord ID History");
  await clickUntilVisible(
    page.getByRole("button", { name: "Discord ID History" }),
    historyDialog,
  );
  await historyDialog
    .getByPlaceholder("Neuer Eintrag ...")
    .fill(takenDiscordId);
  await historyDialog.getByRole("button", { name: "Speichern" }).click();
  const entry = historyDialog
    .getByRole("listitem")
    .filter({ hasText: takenDiscordId });
  await entry.getByRole("button", { name: "Bestätigen" }).click();

  await expect(
    page.getByText("Diese Discord ID gehört bereits zu einem anderen Citizen."),
  ).toBeVisible();
  expect(
    await prisma.citizenLog.findFirstOrThrow({
      where: { citizenId: target.entity.id, content: takenDiscordId },
      select: { confirmed: true },
    }),
  ).toEqual({ confirmed: null });
  expect(
    await prisma.citizen.findMany({
      where: { id: { in: [holder.entity.id, target.entity.id] } },
      select: { id: true, discordId: true, userId: true },
      orderBy: { handle: "asc" },
    }),
  ).toEqual([
    {
      id: holder.entity.id,
      discordId: takenDiscordId,
      userId: holder.user.id,
    },
    {
      id: target.entity.id,
      discordId: target.entity.discordId,
      userId: target.user.id,
    },
  ]);
  expect(
    await prisma.auditEvent.count({ where: { type: "ENTITY_LOG_CONFIRMED" } }),
  ).toBe(0);
});

test("a decision about a Discord ID, Citizen ID or Community Moniker needs the confirm permission of its type, not the create permission", async ({
  page,
  prisma,
  signIn,
}) => {
  const logTypes = [
    { type: "discord-id", name: "Discord ID" },
    { type: "citizen-id", name: "Citizen ID" },
    { type: "community-moniker", name: "Community Moniker" },
  ];
  const reviewer = await createCitizen(prisma, {
    handle: "spynet-pruefer",
    permissionStrings: [
      "citizen;read",
      "discord-id;read",
      ...logTypes.flatMap(({ type }) => [`${type};create`, `${type};confirm`]),
    ],
  });
  const newcomer = await createUserWithoutCitizen(prisma, { name: "neuling" });
  const { providerAccountId } = await prisma.account.findFirstOrThrow({
    where: { userId: newcomer.id },
  });
  const target = await prisma.citizen.create({ data: { handle: "neuling" } });
  /** The Discord ID log names the login, which a confirmation would link */
  const contentOf = (type: string) =>
    type === "discord-id" ? providerAccountId : `${type}-eintrag`;
  await prisma.citizenLog.createMany({
    data: logTypes.map(({ type }) => ({
      citizenId: target.id,
      type,
      content: contentOf(type),
    })),
  });

  await signIn(reviewer.user);

  for (const { type, name } of logTypes) {
    /** A new page load also removes the toast of the type before */
    await page.goto(`/app/spynet/citizen/${target.id}`);
    const historyDialog = modal(page, `${name} History`);
    await clickUntilVisible(
      page.getByRole("button", { name: `${name} History` }),
      historyDialog,
    );
    const entry = historyDialog
      .getByRole("listitem")
      .filter({ hasText: contentOf(type) });
    await expect(
      entry.getByRole("button", { name: "Bestätigen" }),
    ).toBeVisible();

    /**
     * A different user removes the confirm permission after the page loaded.
     * The create permission stays.
     */
    await prisma.permissionString.deleteMany({
      where: { permissionString: `${type};confirm` },
    });

    await entry.getByRole("button", { name: "Bestätigen" }).click();
    await expect(page.getByText(FORBIDDEN_ACTION_TEXT)).toBeVisible();
    /**
     * Without the confirm permission, the history hides a log without a
     * decision
     */
    await expect(entry).toHaveCount(0);
  }

  expect(
    await prisma.citizenLog.count({
      where: { citizenId: target.id, confirmed: { not: null } },
    }),
  ).toBe(0);
  expect(
    await prisma.citizen.findUniqueOrThrow({
      where: { id: target.id },
      select: {
        discordId: true,
        citizenRecord: true,
        communityMoniker: true,
        userId: true,
      },
    }),
  ).toEqual({
    discordId: null,
    citizenRecord: null,
    communityMoniker: null,
    userId: null,
  });
  expect(
    await prisma.auditEvent.count({ where: { type: "ENTITY_LOG_CONFIRMED" } }),
  ).toBe(0);
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

test("a decision about a log of a citizen that a different user deleted after the page loaded changes nothing", async ({
  page,
  prisma,
  signIn,
}) => {
  const reviewer = await createCitizen(prisma, {
    handle: "spynet-pruefer",
    permissionStrings: ["citizen;read", "handle;read", "handle;confirm"],
  });
  const target = await prisma.citizen.create({
    data: { handle: "entscheidungsziel" },
  });
  const undecidedLog = await prisma.citizenLog.create({
    data: {
      citizenId: target.id,
      type: "handle",
      content: "unentschiedener-handle",
    },
  });

  await signIn(reviewer.user);
  await page.goto(`/app/spynet/citizen/${target.id}`);
  const historyDialog = modal(page, "Handle History");
  await clickUntilVisible(
    page.getByRole("button", { name: "Handle History" }),
    historyDialog,
  );
  await expect(
    historyDialog.getByRole("button", { name: "Bestätigen" }),
  ).toBeVisible();

  await markCitizenDeleted(prisma, target.id);

  await historyDialog.getByRole("button", { name: "Bestätigen" }).click();
  await expect(page.getByText(RESOURCE_NOT_FOUND_TEXT)).toBeVisible();
  /** The refresh shows that the citizen is gone */
  await expect(page.getByText(NOT_FOUND_TEXT)).toBeVisible();
  await expect(historyDialog).toHaveCount(0);

  expect(
    await prisma.citizenLog.findUniqueOrThrow({
      where: { id: undecidedLog.id },
      select: { confirmed: true },
    }),
  ).toEqual({ confirmed: null });
  expect(
    await prisma.citizen.findUniqueOrThrow({
      where: { id: target.id },
      select: { handle: true },
    }),
  ).toEqual({ handle: "entscheidungsziel" });
  expect(
    await prisma.auditEvent.count({ where: { type: "ENTITY_LOG_CONFIRMED" } }),
  ).toBe(0);
});

test("a delete of a log of a citizen that a different user deleted after the page loaded changes nothing", async ({
  page,
  prisma,
  signIn,
}) => {
  const reviewer = await createCitizen(prisma, {
    handle: "spynet-aufraeumer",
    permissionStrings: ["citizen;read", "handle;read", "handle;delete"],
  });
  const target = await prisma.citizen.create({
    data: { handle: "loeschziel" },
  });
  const confirmedLog = await prisma.citizenLog.create({
    data: {
      citizenId: target.id,
      type: "handle",
      content: "loeschziel",
      confirmed: ConfirmationStatus.CONFIRMED,
      confirmedAt: new Date(),
    },
  });

  await signIn(reviewer.user);
  await page.goto(`/app/spynet/citizen/${target.id}`);
  const historyDialog = modal(page, "Handle History");
  await clickUntilVisible(
    page.getByRole("button", { name: "Handle History" }),
    historyDialog,
  );
  const deleteDialog = page.getByRole("alertdialog", {
    name: "Eintrag löschen?",
  });
  await clickUntilVisible(
    historyDialog.getByRole("button", { name: "Löschen" }),
    deleteDialog,
  );

  await markCitizenDeleted(prisma, target.id);

  await deleteDialog.getByRole("button", { name: "Löschen" }).click();
  await expect(page.getByText(RESOURCE_NOT_FOUND_TEXT)).toBeVisible();
  /** The refresh shows that the citizen is gone */
  await expect(page.getByText(NOT_FOUND_TEXT)).toBeVisible();

  expect(
    await prisma.citizenLog.count({ where: { id: confirmedLog.id } }),
  ).toBe(1);
  /** The copy of the confirmed handle stays */
  expect(
    await prisma.citizen.findUniqueOrThrow({
      where: { id: target.id },
      select: { handle: true },
    }),
  ).toEqual({ handle: "loeschziel" });
  expect(
    await prisma.auditEvent.count({ where: { type: "ENTITY_LOG_DELETED" } }),
  ).toBe(0);
});

test("a new log that waits for a parallel delete of its citizen is not saved", async ({
  page,
  prisma,
  signIn,
}) => {
  const reporter = await createCitizen(prisma, {
    handle: "spynet-melder",
    permissionStrings: ["citizen;read", "handle;read", "handle;create"],
  });
  const target = await prisma.citizen.create({
    data: { handle: "loeschziel" },
  });

  await signIn(reporter.user);
  await page.goto(`/app/spynet/citizen/${target.id}`);
  const historyDialog = modal(page, "Handle History");
  await clickUntilVisible(
    page.getByRole("button", { name: "Handle History" }),
    historyDialog,
  );
  await historyDialog
    .getByPlaceholder("Neuer Eintrag ...")
    .fill("neuer-handle");

  /**
   * A different user deletes the citizen. The check of the action waits for
   * the delete and then sees it. Without the lock of the citizen, the action
   * would not wait and would save the log for the deleted citizen.
   */
  const parallelDelete = await startParallelChange(prisma, (transaction) =>
    markCitizenDeleted(transaction, target.id),
  );
  try {
    await historyDialog.getByRole("button", { name: "Speichern" }).click();
    await parallelDelete.waitForBlockedStatement();
  } finally {
    await parallelDelete.commit();
  }

  await expect(page.getByText(RESOURCE_NOT_FOUND_TEXT)).toBeVisible();
  /** The refresh shows that the citizen is gone */
  await expect(page.getByText(NOT_FOUND_TEXT)).toBeVisible();

  expect(
    await prisma.citizenLog.count({ where: { citizenId: target.id } }),
  ).toBe(0);
  expect(
    await prisma.auditEvent.count({ where: { type: "ENTITY_LOG_CREATED" } }),
  ).toBe(0);
});

test("the log table shows no decision buttons for a log of a deleted citizen", async ({
  page,
  prisma,
  signIn,
}) => {
  const reviewer = await createCitizen(prisma, {
    handle: "spynet-pruefer",
    permissionStrings: [
      "citizen;read",
      "spynetOther;read",
      "handle;read",
      "handle;confirm",
    ],
  });
  const activeCitizen = await prisma.citizen.create({
    data: { handle: "aktiver" },
  });
  const deletedCitizen = await prisma.citizen.create({
    data: { handle: "geloeschter", deletedAt: new Date() },
  });
  await prisma.citizenLog.createMany({
    data: [
      {
        citizenId: activeCitizen.id,
        type: "handle",
        content: "offener-handle",
      },
      {
        citizenId: deletedCitizen.id,
        type: "handle",
        content: "verwaister-handle",
      },
    ],
  });
  /**
   * Only the visible rows: while the page streams, React keeps a hidden copy
   * of the table next to the visible one
   */
  const rowOf = (content: string) =>
    page
      .locator("tbody tr")
      .filter({ visible: true })
      .filter({ has: page.getByText(content, { exact: true }) });

  await signIn(reviewer.user);
  await page.goto("/app/spynet/other");

  await expect(
    rowOf("offener-handle").getByRole("button", { name: "Bestätigen" }),
  ).toBeVisible();
  await expect(
    rowOf("verwaister-handle").getByText("Unbestätigt"),
  ).toBeVisible();
  for (const decision of ["Bestätigen", "Falschmeldung"])
    await expect(
      rowOf("verwaister-handle").getByRole("button", { name: decision }),
    ).toHaveCount(0);
});

test("a confirmation that waits for a parallel confirmation of the same citizen keeps the handle of the newer log", async ({
  page,
  prisma,
  signIn,
}) => {
  const reviewer = await createCitizen(prisma, {
    handle: "spynet-pruefer",
    permissionStrings: ["citizen;read", "handle;read", "handle;confirm"],
  });
  const target = await prisma.citizen.create({ data: {} });
  const now = Date.now();
  const [olderLog, newerLog] = await Promise.all(
    ["aelterer-handle", "neuerer-handle"].map((content, index) =>
      prisma.citizenLog.create({
        data: {
          citizenId: target.id,
          type: "handle",
          content,
          createdAt: new Date(now - (2 - index) * ONE_MINUTE_MS),
        },
      }),
    ),
  );

  await signIn(reviewer.user);
  await page.goto(`/app/spynet/citizen/${target.id}`);
  const historyDialog = modal(page, "Handle History");
  await clickUntilVisible(
    page.getByRole("button", { name: "Handle History" }),
    historyDialog,
  );
  const olderEntry = historyDialog
    .getByRole("listitem")
    .filter({ hasText: "aelterer-handle" });
  await expect(
    olderEntry.getByRole("button", { name: "Bestätigen" }),
  ).toBeVisible();

  /**
   * A different user confirms the newer log, as the action does it: the
   * confirmation and the copy of the handle in the citizen. Without the lock
   * of the citizen, the waiting confirmation of the older log would copy its
   * own handle, because it does not see the newer confirmation.
   */
  const parallelConfirmation = await startParallelChange(
    prisma,
    async (transaction) => {
      await transaction.citizenLog.update({
        where: { id: newerLog!.id },
        data: {
          confirmed: ConfirmationStatus.CONFIRMED,
          confirmedAt: new Date(),
        },
      });
      await transaction.citizen.update({
        where: { id: target.id },
        data: { handle: "neuerer-handle" },
      });
    },
  );
  try {
    await olderEntry.getByRole("button", { name: "Bestätigen" }).click();
    await parallelConfirmation.waitForBlockedStatement();
  } finally {
    await parallelConfirmation.commit();
  }

  await expect(page.getByText(SAVED_TEXT)).toBeVisible();
  expect(
    await prisma.citizenLog.findUniqueOrThrow({
      where: { id: olderLog!.id },
      select: { confirmed: true },
    }),
  ).toEqual({ confirmed: ConfirmationStatus.CONFIRMED });
  expect(
    await prisma.citizen.findUniqueOrThrow({
      where: { id: target.id },
      select: { handle: true },
    }),
  ).toEqual({ handle: "neuerer-handle" });
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
  const classificationLevelSelect = notePanel("Beobachtung").getByRole(
    "combobox",
    { name: "Geheimhaltungsstufe" },
  );
  await contentInput.fill(noteContent);
  await classificationLevelSelect.selectOption({ label: "Streng geheim" });
  await notePanel("Beobachtung")
    .getByRole("button", { name: "Speichern" })
    .click();
  await expect(page.getByText(SAVED_TEXT)).toBeVisible();
  await expect(noteIn("Beobachtung").getByText("Unbestätigt")).toBeVisible();
  /** The next note starts with the same classification level */
  await expect(contentInput).toHaveValue("");
  await expect(classificationLevelSelect).toHaveValue(topSecret.id);
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

test("a decision, a move or a delete of a note without a decision needs the permission for notes without a decision", async ({
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
  const allNotes = "noteTypeId=*;classificationLevelId=*";
  const withUnconfirmed = (operation: string) =>
    `note;${operation};${allNotes};alsoUnconfirmed=true`;
  const operations = ["confirm", "update", "delete"];
  /**
   * Each operation for the note type and the classification level of the
   * note, without and with the notes without a decision
   */
  const analyst = await createCitizen(prisma, {
    handle: "notiz-analyst",
    permissionStrings: [
      "citizen;read",
      `note;create;${allNotes}`,
      withUnconfirmed("read"),
      ...operations.map((operation) => `note;${operation};${allNotes}`),
      ...operations.map(withUnconfirmed),
    ],
  });
  const target = await createCitizen(prisma, { handle: "zielperson" });
  const noteContent = "Fliegt eine Cutlass Black.";
  const note = await prisma.citizenLog.create({
    data: {
      citizenId: target.entity.id,
      type: "note",
      content: noteContent,
      noteTypeId: observation.id,
      classificationLevelId: secret.id,
    },
  });
  const noteIn = (panelName: string) =>
    page
      .getByRole("tabpanel", { name: panelName })
      .getByRole("article")
      .filter({ hasText: noteContent });
  const updateDialog = modal(page, "Bearbeiten");
  const deleteDialog = page.getByRole("alertdialog", {
    name: "Eintrag löschen?",
  });
  const moveToRumour = async () => {
    await clickUntilVisible(
      noteIn("Beobachtung").getByRole("button", { name: "Bearbeiten" }),
      updateDialog,
    );
    await updateDialog
      .getByLabel("Notizart")
      .selectOption({ label: "Gerücht" });
    await updateDialog.getByRole("button", { name: "Speichern" }).click();
  };
  const deleteNote = async (panelName: string) => {
    await clickUntilVisible(
      noteIn(panelName).getByRole("button", { name: "Löschen" }),
      deleteDialog,
    );
    await deleteDialog.getByRole("button", { name: "Löschen" }).click();
  };

  await signIn(analyst.user);

  for (const { operation, button, act } of [
    {
      operation: "confirm",
      button: "Bestätigen",
      act: () =>
        noteIn("Beobachtung")
          .getByRole("button", { name: "Bestätigen" })
          .click(),
    },
    { operation: "update", button: "Bearbeiten", act: moveToRumour },
    {
      operation: "delete",
      button: "Löschen",
      act: () => deleteNote("Beobachtung"),
    },
  ]) {
    /** A new page load also removes the toast of the operation before */
    await page.goto(`/app/spynet/citizen/${target.entity.id}/notes`);
    await waitForAppShellHydration(page);
    await expect(
      noteIn("Beobachtung").getByRole("button", { name: button }),
    ).toBeVisible();

    /**
     * A different user removes the permission for notes without a decision
     * after the page loaded. The permission without them stays.
     */
    await prisma.permissionString.deleteMany({
      where: { permissionString: withUnconfirmed(operation) },
    });

    await act();
    await expect(page.getByText(FORBIDDEN_ACTION_TEXT)).toBeVisible();
  }

  expect(
    await prisma.citizenLog.findUniqueOrThrow({
      where: { id: note.id },
      select: { noteTypeId: true, confirmed: true },
    }),
  ).toEqual({ noteTypeId: observation.id, confirmed: null });
  expect(
    await prisma.auditEvent.count({
      where: {
        type: {
          in: [
            "ENTITY_LOG_CONFIRMED",
            "ENTITY_LOG_UPDATED",
            "ENTITY_LOG_DELETED",
          ],
        },
      },
    }),
  ).toBe(0);

  /** With the permissions for notes without a decision again */
  await prisma.permissionString.createMany({
    data: operations.map((operation) => ({
      roleId: analyst.role.id,
      permissionString: withUnconfirmed(operation),
    })),
  });
  await page.goto(`/app/spynet/citizen/${target.entity.id}/notes`);
  await waitForAppShellHydration(page);

  await moveToRumour();
  await expect(updateDialog).toHaveCount(0);
  expect(
    await prisma.citizenLog.findUniqueOrThrow({
      where: { id: note.id },
      select: { noteTypeId: true, confirmed: true },
    }),
  ).toEqual({ noteTypeId: rumour.id, confirmed: null });

  await page.getByRole("tab", { name: "Gerücht" }).click();
  await deleteNote("Gerücht");
  await expect(page.getByText(DELETED_TEXT)).toBeVisible();
  expect(await prisma.citizenLog.count({ where: { id: note.id } })).toBe(0);
  await expectAuditEvents(prisma, ["ENTITY_LOG_UPDATED", "ENTITY_LOG_DELETED"]);
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
  await expect(page.getByText(RESOURCE_NOT_FOUND_TEXT)).toBeVisible();
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
  await expect(page.getByText(RESOURCE_NOT_FOUND_TEXT)).toBeVisible();
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

test("a note with only spaces shows a message and keeps the chosen classification level", async ({
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
  const notePanel = page.getByRole("tabpanel", { name: "Beobachtung" });
  const contentInput = notePanel.getByRole("textbox", { name: "Neue Notiz" });
  const classificationLevelSelect = notePanel.getByRole("combobox", {
    name: "Geheimhaltungsstufe",
  });

  await signIn(writer.user);
  await page.goto(`/app/spynet/citizen/${target.entity.id}/notes`);
  await waitForAppShellHydration(page);

  await contentInput.fill("   ");
  /** Not the first option, thus a reset of the form would change it */
  await classificationLevelSelect.selectOption({ label: "Streng geheim" });
  await notePanel.getByRole("button", { name: "Speichern" }).click();

  await expect(page.getByText(BAD_REQUEST_TEXT)).toBeVisible();
  await expect(classificationLevelSelect).toHaveValue(topSecret.id);
  await expect(contentInput).toHaveValue("   ");
  expect(await prisma.citizenLog.count({ where: { type: "note" } })).toBe(0);
});

test("the change modal of a note opens with the values of the note again after an error", async ({
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
  const allNotes = "noteTypeId=*;classificationLevelId=*";
  const createRumourPermission = `note;create;noteTypeId=${rumour.id};classificationLevelId=*`;
  const analyst = await createCitizen(prisma, {
    handle: "notiz-analyst",
    permissionStrings: [
      "citizen;read",
      `note;create;noteTypeId=${observation.id};classificationLevelId=*`,
      createRumourPermission,
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
      classificationLevelId: secret.id,
    },
  });

  await signIn(analyst.user);
  await page.goto(`/app/spynet/citizen/${target.entity.id}/notes`);

  const updateDialog = modal(page, "Bearbeiten");
  const openUpdateDialog = () =>
    clickUntilVisible(
      page
        .getByRole("tabpanel", { name: "Beobachtung" })
        .getByRole("button", { name: "Bearbeiten" }),
      updateDialog,
    );
  const noteTypeSelect = updateDialog.getByLabel("Notizart");
  const classificationLevelSelect = updateDialog.getByLabel(
    "Geheimhaltungsstufe",
  );

  await openUpdateDialog();
  await noteTypeSelect.selectOption({ label: "Gerücht" });
  await classificationLevelSelect.selectOption({ label: "Streng geheim" });

  /**
   * A different user removes the permission for notes of the note type
   * "Gerücht" after the page loaded. The error refreshes nothing, thus the
   * options stay.
   */
  await prisma.permissionString.deleteMany({
    where: { permissionString: createRumourPermission },
  });

  await updateDialog.getByRole("button", { name: "Speichern" }).click();
  await expect(page.getByText(FORBIDDEN_ACTION_TEXT)).toBeVisible();
  /** The error keeps the chosen values */
  await expect(noteTypeSelect).toHaveValue(rumour.id);
  await expect(classificationLevelSelect).toHaveValue(topSecret.id);

  await page.keyboard.press("Escape");
  await expect(updateDialog).not.toBeVisible();
  await openUpdateDialog();
  await expect(noteTypeSelect).toHaveValue(observation.id);
  await expect(classificationLevelSelect).toHaveValue(secret.id);

  expect(
    await prisma.citizenLog.findUniqueOrThrow({
      where: { id: note.id },
      select: { noteTypeId: true, classificationLevelId: true },
    }),
  ).toEqual({ noteTypeId: observation.id, classificationLevelId: secret.id });
  expect(
    await prisma.auditEvent.count({ where: { type: "ENTITY_LOG_UPDATED" } }),
  ).toBe(0);
});

test("the change dialog of a note saves only a different note type or classification level", async ({
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
  await prisma.classificationLevel.create({ data: { name: "Streng geheim" } });
  const allNotes = "noteTypeId=*;classificationLevelId=*";
  /**
   * The analyst may create notes only of the note type "Gerücht", thus the
   * dialog offers for "Beobachtung" only the current classification level
   * of the note
   */
  const analyst = await createCitizen(prisma, {
    handle: "notiz-analyst",
    permissionStrings: [
      "citizen;read",
      `note;create;noteTypeId=${rumour.id};classificationLevelId=*`,
      `note;read;${allNotes};alsoUnconfirmed=true`,
      `note;update;${allNotes};alsoUnconfirmed=true`,
    ],
  });
  const target = await createCitizen(prisma, { handle: "zielperson" });
  const classifiedContent = "Fliegt eine Cutlass Black.";
  /** A different user deleted the classification level of this note */
  const unclassifiedContent = "Handelt mit Quantanium.";
  await prisma.citizenLog.createMany({
    data: [
      {
        citizenId: target.entity.id,
        type: "note",
        content: classifiedContent,
        noteTypeId: observation.id,
        classificationLevelId: secret.id,
      },
      {
        citizenId: target.entity.id,
        type: "note",
        content: unclassifiedContent,
        noteTypeId: observation.id,
      },
    ],
  });

  await signIn(analyst.user);
  await page.goto(`/app/spynet/citizen/${target.entity.id}/notes`);
  await waitForAppShellHydration(page);

  const updateDialog = modal(page, "Bearbeiten");
  const openUpdateDialog = (content: string) =>
    clickUntilVisible(
      page
        .getByRole("tabpanel", { name: "Beobachtung" })
        .getByRole("article")
        .filter({ hasText: content })
        .getByRole("button", { name: "Bearbeiten" }),
      updateDialog,
    );
  const noteTypeSelect = updateDialog.getByLabel("Notizart");
  const classificationLevelSelect = updateDialog.getByLabel(
    "Geheimhaltungsstufe",
  );
  const saveButton = updateDialog.getByRole("button", { name: "Speichern" });

  await openUpdateDialog(classifiedContent);
  await expect(saveButton).toBeDisabled();
  await noteTypeSelect.selectOption({ label: "Gerücht" });
  await expect(saveButton).toBeEnabled();
  await noteTypeSelect.selectOption({ label: "Beobachtung" });
  await expect(classificationLevelSelect).toHaveValue(secret.id);
  await expect(saveButton).toBeDisabled();

  await page.keyboard.press("Escape");
  await expect(updateDialog).not.toBeVisible();
  await openUpdateDialog(unclassifiedContent);
  await expect(classificationLevelSelect.locator("option")).toHaveCount(0);
  await expect(saveButton).toBeDisabled();
  await noteTypeSelect.selectOption({ label: "Gerücht" });
  await expect(saveButton).toBeEnabled();

  expect(
    await prisma.citizenLog.findMany({
      where: { citizenId: target.entity.id, type: "note" },
      select: { noteTypeId: true, classificationLevelId: true },
      orderBy: { content: "asc" },
    }),
  ).toEqual([
    { noteTypeId: observation.id, classificationLevelId: secret.id },
    { noteTypeId: observation.id, classificationLevelId: null },
  ]);
});

test("a move of a note that a different user moved after the permission check shows a message and keeps the other move", async ({
  page,
  prisma,
  signIn,
}) => {
  const observation = await prisma.noteType.create({
    data: { name: "Beobachtung" },
  });
  await prisma.noteType.create({ data: { name: "Gerücht" } });
  const secret = await prisma.classificationLevel.create({
    data: { name: "Geheim" },
  });
  const topSecret = await prisma.classificationLevel.create({
    data: { name: "Streng geheim" },
  });
  const allNotes = "noteTypeId=*;classificationLevelId=*";
  /** The analyst may change only the notes of the level "Geheim" */
  const analyst = await createCitizen(prisma, {
    handle: "notiz-analyst",
    permissionStrings: [
      "citizen;read",
      `note;create;${allNotes}`,
      `note;read;${allNotes};alsoUnconfirmed=true`,
      `note;update;noteTypeId=*;classificationLevelId=${secret.id};alsoUnconfirmed=true`,
    ],
  });
  const target = await createCitizen(prisma, { handle: "zielperson" });
  const note = await prisma.citizenLog.create({
    data: {
      citizenId: target.entity.id,
      type: "note",
      content: "Fliegt eine Cutlass Black.",
      noteTypeId: observation.id,
      classificationLevelId: secret.id,
    },
  });

  await signIn(analyst.user);
  await page.goto(`/app/spynet/citizen/${target.entity.id}/notes`);

  const updateDialog = modal(page, "Bearbeiten");
  await clickUntilVisible(
    page
      .getByRole("tabpanel", { name: "Beobachtung" })
      .getByRole("button", { name: "Bearbeiten" }),
    updateDialog,
  );
  await updateDialog.getByLabel("Notizart").selectOption({ label: "Gerücht" });

  /**
   * A different user moves the note to the level "Streng geheim". The
   * permission check of the action still sees the level "Geheim", and its
   * write waits for the move.
   */
  const parallelMove = await startParallelChange(prisma, (transaction) =>
    transaction.citizenLog.update({
      where: { id: note.id },
      data: { classificationLevelId: topSecret.id },
    }),
  );
  try {
    await updateDialog.getByRole("button", { name: "Speichern" }).click();
    await parallelMove.waitForBlockedStatement();
  } finally {
    await parallelMove.commit();
  }

  await expect(page.getByText(RESOURCE_NOT_FOUND_TEXT)).toBeVisible();
  expect(
    await prisma.citizenLog.findUniqueOrThrow({
      where: { id: note.id },
      select: { noteTypeId: true, classificationLevelId: true },
    }),
  ).toEqual({
    noteTypeId: observation.id,
    classificationLevelId: topSecret.id,
  });
  expect(
    await prisma.auditEvent.count({ where: { type: "ENTITY_LOG_UPDATED" } }),
  ).toBe(0);
});

test("a move of a note that a different user decided after the permission check shows a message and keeps the decision", async ({
  page,
  prisma,
  signIn,
}) => {
  const observation = await prisma.noteType.create({
    data: { name: "Beobachtung" },
  });
  await prisma.noteType.create({ data: { name: "Gerücht" } });
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

  const updateDialog = modal(page, "Bearbeiten");
  await clickUntilVisible(
    page
      .getByRole("tabpanel", { name: "Beobachtung" })
      .getByRole("button", { name: "Bearbeiten" }),
    updateDialog,
  );
  await updateDialog.getByLabel("Notizart").selectOption({ label: "Gerücht" });

  /**
   * A different user confirms the note. The permission check of the action
   * still sees the note without a decision, and its write waits for the
   * decision.
   */
  const parallelDecision = await startParallelChange(prisma, (transaction) =>
    transaction.citizenLog.update({
      where: { id: note.id },
      data: {
        confirmed: ConfirmationStatus.CONFIRMED,
        confirmedAt: new Date(),
      },
    }),
  );
  try {
    await updateDialog.getByRole("button", { name: "Speichern" }).click();
    await parallelDecision.waitForBlockedStatement();
  } finally {
    await parallelDecision.commit();
  }

  await expect(page.getByText(RESOURCE_NOT_FOUND_TEXT)).toBeVisible();
  expect(
    await prisma.citizenLog.findUniqueOrThrow({
      where: { id: note.id },
      select: { noteTypeId: true, confirmed: true },
    }),
  ).toEqual({
    noteTypeId: observation.id,
    confirmed: ConfirmationStatus.CONFIRMED,
  });
  expect(
    await prisma.auditEvent.count({ where: { type: "ENTITY_LOG_UPDATED" } }),
  ).toBe(0);
});

test("a move of a note of a citizen that a different user deleted after the page loaded changes nothing", async ({
  page,
  prisma,
  signIn,
}) => {
  const observation = await prisma.noteType.create({
    data: { name: "Beobachtung" },
  });
  await prisma.noteType.create({ data: { name: "Gerücht" } });
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
  const target = await prisma.citizen.create({
    data: { handle: "zielperson" },
  });
  const note = await prisma.citizenLog.create({
    data: {
      citizenId: target.id,
      type: "note",
      content: "Fliegt eine Cutlass Black.",
      noteTypeId: observation.id,
      classificationLevelId: classificationLevel.id,
    },
  });

  await signIn(analyst.user);
  await page.goto(`/app/spynet/citizen/${target.id}/notes`);

  const updateDialog = modal(page, "Bearbeiten");
  await clickUntilVisible(
    page
      .getByRole("tabpanel", { name: "Beobachtung" })
      .getByRole("button", { name: "Bearbeiten" }),
    updateDialog,
  );
  await updateDialog.getByLabel("Notizart").selectOption({ label: "Gerücht" });

  await markCitizenDeleted(prisma, target.id);

  await updateDialog.getByRole("button", { name: "Speichern" }).click();
  await expect(page.getByText(RESOURCE_NOT_FOUND_TEXT)).toBeVisible();
  /** The refresh shows that the citizen is gone */
  await expect(page.getByText(NOT_FOUND_TEXT)).toBeVisible();

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

test("a move of a note that waits for a parallel delete of its citizen changes nothing", async ({
  page,
  prisma,
  signIn,
}) => {
  const observation = await prisma.noteType.create({
    data: { name: "Beobachtung" },
  });
  await prisma.noteType.create({ data: { name: "Gerücht" } });
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
  const target = await prisma.citizen.create({
    data: { handle: "zielperson" },
  });
  const note = await prisma.citizenLog.create({
    data: {
      citizenId: target.id,
      type: "note",
      content: "Fliegt eine Cutlass Black.",
      noteTypeId: observation.id,
      classificationLevelId: classificationLevel.id,
    },
  });

  await signIn(analyst.user);
  await page.goto(`/app/spynet/citizen/${target.id}/notes`);

  const updateDialog = modal(page, "Bearbeiten");
  await clickUntilVisible(
    page
      .getByRole("tabpanel", { name: "Beobachtung" })
      .getByRole("button", { name: "Bearbeiten" }),
    updateDialog,
  );
  await updateDialog.getByLabel("Notizart").selectOption({ label: "Gerücht" });

  /**
   * A different user deletes the citizen. The write of the action waits for
   * the delete and then sees it. Without the lock of the citizen, the write
   * would not wait and would move the note of the deleted citizen.
   */
  const parallelDelete = await startParallelChange(prisma, (transaction) =>
    markCitizenDeleted(transaction, target.id),
  );
  try {
    await updateDialog.getByRole("button", { name: "Speichern" }).click();
    await parallelDelete.waitForBlockedStatement();
  } finally {
    await parallelDelete.commit();
  }

  await expect(page.getByText(RESOURCE_NOT_FOUND_TEXT)).toBeVisible();
  /** The refresh shows that the citizen is gone */
  await expect(page.getByText(NOT_FOUND_TEXT)).toBeVisible();

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
