import type { Page } from "@playwright/test";
import {
  assignRole,
  createAppEvent,
  createCitizen,
  createEventBriefingPage,
  createRole,
  createWikiPage,
  futureEvent,
  ONE_DAY_MS,
  ONE_HOUR_MS,
  wikiDocument,
  WikiPageAccessType,
  WikiPageEditability,
  WikiPageEventScope,
  WikiPageVisibility,
  wikiParagraph,
} from "../fixtures/factories";
import {
  clickUntilVisible,
  modal,
  NOT_FOUND_TEXT,
} from "../fixtures/interactions";
import { expect, test } from "../fixtures/test";

/**
 * The read-audience badge in the metadata line of the page header. The
 * trailing space keeps the caption span inside the badge out of the match.
 */
const audienceBadge = (page: Page) => page.getByText(/^Sichtbar für: /);

/**
 * The badge as its clickable form. A plain reader gets the text above but
 * never this.
 */
const audienceBadgeButton = (page: Page) =>
  page.getByRole("button", { name: /^Sichtbar für: / });

const permissionsButton = (page: Page) =>
  page.getByRole("button", { name: "Berechtigungen bearbeiten" });

/**
 * Ends the label at a non-word character, so that a broken singular
 * ("1 Rollen") cannot satisfy an assertion on "1 Rolle". The labels carry
 * no regular expression syntax, so they go in as they are.
 */
const audienceLabel = (label: string) =>
  new RegExp(`Sichtbar für: ${label}(?!\\w)`);

test("a RESTRICTED page is readable for its role members and invisible to the rest", async ({
  page,
  prisma,
  signIn,
  switchUser,
}) => {
  const readerRole = await createRole(prisma, { name: "geheim-leser" });
  const member = await createCitizen(prisma, { handle: "member" });
  await assignRole(prisma, member.entity, readerRole);
  const outsider = await createCitizen(prisma, { handle: "outsider" });
  const restrictedPage = await createWikiPage(prisma, {
    title: "Geheimplan",
    visibility: WikiPageVisibility.RESTRICTED,
    roleAccess: [{ roleId: readerRole.id, type: WikiPageAccessType.READ }],
    content: wikiDocument(wikiParagraph("Streng vertraulicher Inhalt.")),
  });
  const publicPage = await createWikiPage(prisma, {
    title: "Öffentlich",
    visibility: WikiPageVisibility.PUBLIC,
  });

  await signIn(member.user);
  await page.goto(`/app/wiki/${restrictedPage.id}/${restrictedPage.slug}`);
  await expect(page.getByText("Streng vertraulicher Inhalt.")).toBeVisible();

  // For everyone else the page 404s and stays out of the sidebar tree
  await switchUser(outsider.user);

  await page.goto(`/app/wiki/${restrictedPage.id}/${restrictedPage.slug}`);
  await expect(page.getByText(NOT_FOUND_TEXT)).toBeVisible();

  await page.goto(`/app/wiki/${publicPage.id}/${publicPage.slug}`);
  await expect(
    page.getByRole("link", { name: "Öffentlich" }).first(),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Geheimplan" })).toHaveCount(0);
});

test("INHERIT is bounded by the parent's read access", async ({
  page,
  prisma,
  signIn,
  switchUser,
}) => {
  const readerRole = await createRole(prisma, { name: "abteilung" });
  const member = await createCitizen(prisma, { handle: "member" });
  await assignRole(prisma, member.entity, readerRole);
  const outsider = await createCitizen(prisma, { handle: "outsider" });

  const parent = await createWikiPage(prisma, {
    title: "Abteilungsseite",
    visibility: WikiPageVisibility.RESTRICTED,
    roleAccess: [{ roleId: readerRole.id, type: WikiPageAccessType.READ }],
  });
  const child = await createWikiPage(prisma, {
    title: "Unterseite",
    parentId: parent.id,
    content: wikiDocument(wikiParagraph("Interne Details.")),
  });

  await signIn(member.user);
  await page.goto(`/app/wiki/${child.id}/${child.slug}`);
  await expect(page.getByText("Interne Details.")).toBeVisible();

  await switchUser(outsider.user);
  await page.goto(`/app/wiki/${child.id}/${child.slug}`);
  await expect(page.getByText(NOT_FOUND_TEXT)).toBeVisible();
});

test("a top-level INHERIT page is only visible with wiki;manage", async ({
  page,
  prisma,
  signIn,
  switchUser,
}) => {
  const manager = await createCitizen(prisma, {
    handle: "manager",
    permissionStrings: ["wiki;manage"],
  });
  const regular = await createCitizen(prisma, { handle: "regular" });
  const unmanagedPage = await createWikiPage(prisma, {
    title: "Entwurf",
    content: wikiDocument(wikiParagraph("Noch nicht freigegeben.")),
  });

  await signIn(manager.user);
  await page.goto(`/app/wiki/${unmanagedPage.id}/${unmanagedPage.slug}`);
  await expect(page.getByText("Noch nicht freigegeben.")).toBeVisible();

  await switchUser(regular.user);
  await page.goto(`/app/wiki/${unmanagedPage.id}/${unmanagedPage.slug}`);
  await expect(page.getByText(NOT_FOUND_TEXT)).toBeVisible();
});

test("the edit-mode toggle only shows for users with edit permission", async ({
  page,
  prisma,
  signIn,
  switchUser,
}) => {
  const editor = await createCitizen(prisma, { handle: "editor" });
  const reader = await createCitizen(prisma, { handle: "reader" });

  const editorRole = await createRole(prisma, { name: "redaktion" });
  await assignRole(prisma, editor.entity, editorRole);

  const wikiPage = await createWikiPage(prisma, {
    title: "Ankündigungen",
    visibility: WikiPageVisibility.PUBLIC,
    editability: WikiPageEditability.RESTRICTED,
    roleAccess: [{ roleId: editorRole.id, type: WikiPageAccessType.EDIT }],
  });

  const editModeToggle = page.locator("article button[aria-pressed]");

  await signIn(editor.user);
  await page.goto(`/app/wiki/${wikiPage.id}/${wikiPage.slug}`);
  await expect(editModeToggle).toBeVisible();

  await switchUser(reader.user);
  await page.goto(`/app/wiki/${wikiPage.id}/${wikiPage.slug}`);
  await expect(
    page.getByRole("heading", { level: 1, name: "Ankündigungen" }),
  ).toBeVisible();
  await expect(editModeToggle).toHaveCount(0);
});

test("the header badge names who may read the page", async ({
  page,
  prisma,
  signIn,
}) => {
  const manager = await createCitizen(prisma, {
    handle: "wiki-manager",
    permissionStrings: ["wiki;manage"],
  });
  const readerRole = await createRole(prisma, { name: "logistik" });
  const editorRole = await createRole(prisma, { name: "redaktion" });

  const publicPage = await createWikiPage(prisma, {
    title: "Handbuch",
    visibility: WikiPageVisibility.PUBLIC,
  });
  const roleRestrictedPage = await createWikiPage(prisma, {
    title: "Logistikplan",
    visibility: WikiPageVisibility.RESTRICTED,
    roleAccess: [{ roleId: readerRole.id, type: WikiPageAccessType.READ }],
  });
  /** Editing implies reading, so the editor role counts as an audience too */
  const editablePage = await createWikiPage(prisma, {
    title: "Einsatzjournal",
    visibility: WikiPageVisibility.RESTRICTED,
    editability: WikiPageEditability.RESTRICTED,
    roleAccess: [
      { roleId: readerRole.id, type: WikiPageAccessType.READ },
      { roleId: editorRole.id, type: WikiPageAccessType.EDIT },
    ],
  });
  const privatePage = await createWikiPage(prisma, {
    title: "Notizen",
    visibility: WikiPageVisibility.RESTRICTED,
  });

  await signIn(manager.user);

  await page.goto(`/app/wiki/${publicPage.id}/${publicPage.slug}`);
  await expect(audienceBadge(page)).toContainText(audienceLabel("alle"));

  await page.goto(
    `/app/wiki/${roleRestrictedPage.id}/${roleRestrictedPage.slug}`,
  );
  await expect(audienceBadge(page)).toContainText(audienceLabel("1 Rolle"));

  await page.goto(`/app/wiki/${editablePage.id}/${editablePage.slug}`);
  await expect(audienceBadge(page)).toContainText(audienceLabel("2 Rollen"));

  await page.goto(`/app/wiki/${privatePage.id}/${privatePage.slug}`);
  await expect(audienceBadge(page)).toContainText(
    audienceLabel("nur Besitzer & Manager"),
  );
});

test("only page managers open the permissions from the badge", async ({
  page,
  prisma,
  signIn,
  switchUser,
}) => {
  const readerRole = await createRole(prisma, { name: "abteilung" });
  const reader = await createCitizen(prisma, { handle: "leser" });
  await assignRole(prisma, reader.entity, readerRole);
  const manager = await createCitizen(prisma, {
    handle: "verwalter",
    permissionStrings: ["wiki;manage"],
  });

  const wikiPage = await createWikiPage(prisma, {
    title: "Abteilungsseite",
    visibility: WikiPageVisibility.RESTRICTED,
    roleAccess: [{ roleId: readerRole.id, type: WikiPageAccessType.READ }],
  });
  const href = `/app/wiki/${wikiPage.id}/${wikiPage.slug}`;

  // A reader sees how wide the audience is, but cannot change it
  await signIn(reader.user);
  await page.goto(href);
  await expect(audienceBadge(page)).toHaveText("Sichtbar für: 1 Rolle");
  await expect(audienceBadgeButton(page)).toHaveCount(0);
  await expect(permissionsButton(page)).toHaveCount(0);

  await switchUser(manager.user);
  await page.goto(href);
  await clickUntilVisible(
    audienceBadgeButton(page),
    modal(page, "Berechtigungen"),
  );
});

test("a role reading only through wiki;manage is left out of the count", async ({
  page,
  prisma,
  signIn,
}) => {
  const manager = await createCitizen(prisma, {
    handle: "global-manager",
    permissionStrings: ["wiki;manage"],
  });
  const readerRole = await createRole(prisma, { name: "einsatz" });

  const wikiPage = await createWikiPage(prisma, {
    title: "Einsatzbefehl",
    visibility: WikiPageVisibility.RESTRICTED,
    roleAccess: [{ roleId: readerRole.id, type: WikiPageAccessType.READ }],
  });
  const href = `/app/wiki/${wikiPage.id}/${wikiPage.slug}`;

  await signIn(manager.user);
  await page.goto(href);
  await expect(audienceBadge(page)).toContainText(audienceLabel("1 Rolle"));

  // The very same role counts as soon as it reads this page in its own right
  await prisma.wikiPageRoleAccess.create({
    data: {
      pageId: wikiPage.id,
      roleId: manager.role.id,
      type: WikiPageAccessType.READ,
    },
  });
  await page.reload();
  await expect(audienceBadge(page)).toContainText(audienceLabel("2 Rollen"));
});

test("the briefing badge names the event scope of the page", async ({
  page,
  prisma,
  signIn,
}) => {
  const manager = await createCitizen(prisma, {
    handle: "einsatzleiter",
    permissionStrings: ["event;read"],
  });
  const event = await createAppEvent(prisma, {
    name: "Operation Sichtbarkeit",
    createdById: manager.entity.id,
    ...futureEvent(),
  });
  const rootPage = event.wikiPages[0]!;
  const position = await prisma.eventPosition.create({
    data: { eventId: event.id, name: "Marine" },
  });
  const participantsPage = await createEventBriefingPage(prisma, {
    eventId: event.id,
    parentId: rootPage.id,
    title: "Ablauf",
    readScope: WikiPageEventScope.PARTICIPANTS,
  });
  const inheritingPage = await createEventBriefingPage(prisma, {
    eventId: event.id,
    parentId: participantsPage.id,
    title: "Zeitplan",
  });
  const positionPage = await createEventBriefingPage(prisma, {
    eventId: event.id,
    parentId: rootPage.id,
    title: "Enterkommando",
    readScope: WikiPageEventScope.POSITION,
    readScopePositionId: position.id,
  });

  await signIn(manager.user);

  await page.goto(`/app/events/${event.id}/briefing`);
  await expect(audienceBadge(page)).toContainText(
    audienceLabel("Event-Manager"),
  );
  await expect(permissionsButton(page)).toBeVisible();

  await page.goto(
    `/app/events/${event.id}/briefing/${participantsPage.id}/${participantsPage.slug}`,
  );
  await expect(audienceBadge(page)).toContainText(
    audienceLabel("Eventteilnehmer"),
  );

  /** An inheriting page reports what it inherits, not "Manager" */
  await page.goto(
    `/app/events/${event.id}/briefing/${inheritingPage.id}/${inheritingPage.slug}`,
  );
  await expect(audienceBadge(page)).toContainText(
    audienceLabel("Eventteilnehmer"),
  );

  await page.goto(
    `/app/events/${event.id}/briefing/${positionPage.id}/${positionPage.slug}`,
  );
  await expect(audienceBadge(page)).toContainText(
    audienceLabel("Aufstellung „Marine“"),
  );
});

test("a finished event leaves its managers the badge without the dialog", async ({
  page,
  prisma,
  signIn,
}) => {
  const manager = await createCitizen(prisma, {
    handle: "rueckblick-leiter",
    permissionStrings: ["event;read"],
  });
  const event = await createAppEvent(prisma, {
    name: "Operation Rückblick",
    createdById: manager.entity.id,
    startTime: new Date(Date.now() - ONE_DAY_MS),
    endTime: new Date(Date.now() - ONE_DAY_MS + 2 * ONE_HOUR_MS),
  });

  await signIn(manager.user);
  await page.goto(`/app/events/${event.id}/briefing`);

  // The freeze takes the dialog away, so both of its triggers go with it
  await expect(audienceBadge(page)).toHaveText("Sichtbar für: Event-Manager");
  await expect(audienceBadgeButton(page)).toHaveCount(0);
  await expect(permissionsButton(page)).toHaveCount(0);
});
