import type { Page } from "@playwright/test";
import {
  WikiPageSnapshotKind,
  WikiPageUploadKind,
} from "@sam-monorepo/database/client";
import {
  createCitizen,
  createEventTemplate,
  createRole,
  createUpload,
  createWikiPage,
  wikiDocument,
  WikiPageAccessType,
  WikiPageVisibility,
  wikiParagraph,
} from "../fixtures/factories";
import {
  clickUntilVisible,
  fillUntilValue,
  modal,
  toggleLabel,
} from "../fixtures/interactions";
import { expect, test } from "../fixtures/test";
import {
  enterEditMode,
  expectPersisted,
  focusEditor,
  seedEditablePage,
} from "../fixtures/wiki-editor";
import { readStackState, s3BucketName } from "../setup/stack";

const copyPageToClipboard = async (page: Page) => {
  await clickUntilVisible(
    page.getByRole("button", { name: "Seite kopieren" }),
    page.getByRole("heading", { name: "Seite kopieren" }),
  );
  await page.getByRole("button", { name: "Kopieren", exact: true }).click();
  await expect(
    page.getByText("Seite in die Zwischenablage kopiert"),
  ).toBeVisible();
};

const openCreatePageModal = async (page: Page) => {
  await clickUntilVisible(
    page.getByRole("button", { name: "Neue Seite" }),
    page.getByRole("heading", { name: "Neue Seite" }),
  );
};

/**
 * The sidebar tree is in a layout that the old and the new page share. Thus
 * it shows the new page only when the action renders the layout again. A
 * `page.goto()` would load the layout again and hide a missing refresh. The
 * paste action also deletes the clipboard cookie, and a cookie change in an
 * action renders the layout again too. Thus only the test of a new page as
 * a copy proves `refresh()`.
 */
const sidebarTreeLink = (page: Page, title: string) =>
  page.getByRole("link", { name: title, exact: true });

/** An image in the content refers to its upload with the last path segment */
const uploadedImage = (uploadId: string) => {
  const { s3Port } = readStackState();
  return {
    type: "image",
    attrs: {
      src: new URL(`/${s3BucketName}/${uploadId}`, `http://localhost:${s3Port}`)
        .href,
    },
  };
};

test("copy'n'paste inserts a page with its readable children under another page", async ({
  page,
  prisma,
  signIn,
}) => {
  const member = await createCitizen(prisma, { handle: "kopierer" });
  const secretRole = await createRole(prisma, { name: "geheim" });
  const source = await createWikiPage(prisma, {
    title: "Handbuch",
    visibility: WikiPageVisibility.PUBLIC,
    content: wikiDocument(wikiParagraph("Grundlagen des Bergbaus.")),
  });
  const chapter = await createWikiPage(prisma, {
    title: "Kapitel",
    parentId: source.id,
    content: wikiDocument(wikiParagraph("Erstes Kapitel.")),
  });
  /** Unreadable for the copier, thus neither counted nor copied */
  await createWikiPage(prisma, {
    title: "Geheim",
    parentId: source.id,
    visibility: WikiPageVisibility.RESTRICTED,
    roleAccess: [{ roleId: secretRole.id, type: WikiPageAccessType.READ }],
  });
  const target = await createWikiPage(prisma, {
    title: "Zielbereich",
    visibility: WikiPageVisibility.PUBLIC,
    ownerId: member.entity.id,
  });
  await signIn(member.user);

  await page.goto(`/app/wiki/${source.id}/${source.slug}`);
  await copyPageToClipboard(page);

  await page.goto(`/app/wiki/${target.id}/${target.slug}`);
  await openCreatePageModal(page);

  await expect(
    page.getByRole("heading", { name: "Kopierte Seite einfügen" }),
  ).toBeVisible();
  await expect(page.getByText("„Handbuch“ + 1 Unterseiten")).toBeVisible();
  await page.getByRole("button", { name: "Einfügen", exact: true }).click();

  await expect(page).toHaveURL(/handbuch-kopie$/);
  await expect(page.getByText("Grundlagen des Bergbaus.")).toBeVisible();
  await expect(sidebarTreeLink(page, "Handbuch (Kopie)")).toBeVisible();

  const rootCopy = await prisma.wikiPage.findFirstOrThrow({
    where: { title: "Handbuch (Kopie)" },
  });
  expect(rootCopy.parentId).toBe(target.id);
  expect(rootCopy.visibility).toBe(WikiPageVisibility.INHERIT);
  expect(rootCopy.ownerId).toBeNull();

  const chapterCopy = await prisma.wikiPage.findFirstOrThrow({
    where: { title: "Kapitel", parentId: rootCopy.id },
  });
  expect(chapterCopy.content).toEqual(chapter.content);
  expect(chapterCopy.visibility).toBe(WikiPageVisibility.INHERIT);
  /** The unreadable child was left where it was — only the original exists */
  expect(await prisma.wikiPage.count({ where: { title: "Geheim" } })).toBe(1);

  // The insert consumed the clipboard
  const cookies = await page.context().cookies();
  expect(
    cookies.find((cookie) => cookie.name === "wiki_clipboard"),
  ).toBeUndefined();
});

test("a new page can start as a copy of an existing page", async ({
  page,
  prisma,
  signIn,
}) => {
  const member = await createCitizen(prisma, { handle: "vorlagen-nutzer" });
  const template = await createWikiPage(prisma, {
    title: "Vorlage",
    visibility: WikiPageVisibility.PUBLIC,
    content: wikiDocument(wikiParagraph("Struktur der Vorlage.")),
  });
  await createWikiPage(prisma, {
    title: "Vorlagen-Detail",
    parentId: template.id,
    content: wikiDocument(wikiParagraph("Details der Vorlage.")),
  });
  const target = await createWikiPage(prisma, {
    title: "Arbeitsbereich",
    visibility: WikiPageVisibility.PUBLIC,
    ownerId: member.entity.id,
  });
  await signIn(member.user);

  await page.goto(`/app/wiki/${target.id}/${target.slug}`);
  await openCreatePageModal(page);

  await page.locator('input[name="title"]').fill("Neu aus Vorlage");
  // The select waits for the lazily fetched readable pages
  await page
    .getByLabel("Inhalt kopieren von (optional)")
    .selectOption({ label: "Vorlage" });
  await page.getByRole("button", { name: "Erstellen", exact: true }).click();

  await expect(page.getByText("Struktur der Vorlage.")).toBeVisible();
  await expect(sidebarTreeLink(page, "Neu aus Vorlage")).toBeVisible();

  const created = await prisma.wikiPage.findFirstOrThrow({
    where: { title: "Neu aus Vorlage" },
  });
  expect(created.parentId).toBe(target.id);

  const childCopy = await prisma.wikiPage.findFirstOrThrow({
    where: { title: "Vorlagen-Detail", parentId: created.id },
  });
  expect(childCopy.visibility).toBe(WikiPageVisibility.INHERIT);
});

test("replace mode transplants the copy onto an existing page", async ({
  page,
  prisma,
  signIn,
}) => {
  const member = await createCitizen(prisma, { handle: "ersetzer" });
  const source = await createWikiPage(prisma, {
    title: "Muster",
    visibility: WikiPageVisibility.PUBLIC,
    content: wikiDocument(wikiParagraph("Muster-Inhalt.")),
  });
  await createWikiPage(prisma, {
    title: "Muster-Kind",
    parentId: source.id,
    content: wikiDocument(wikiParagraph("Kind-Inhalt.")),
  });
  const target = await createWikiPage(prisma, {
    title: "Bestehend",
    visibility: WikiPageVisibility.PUBLIC,
    ownerId: member.entity.id,
    content: wikiDocument(wikiParagraph("Alter Inhalt.")),
  });
  await createWikiPage(prisma, { title: "Altes Kind", parentId: target.id });
  await signIn(member.user);

  await page.goto(`/app/wiki/${source.id}/${source.slug}`);
  await copyPageToClipboard(page);

  await page.goto(`/app/wiki/${target.id}/${target.slug}`);
  await openCreatePageModal(page);
  /** The label is the visible half of the radio, which is `sr-only` */
  await toggleLabel(page, /^Seite ersetzen$/).click();
  await expect(
    page.getByRole("radio", { name: "Seite ersetzen" }),
  ).toBeChecked();
  await page.getByRole("button", { name: "Einfügen", exact: true }).click();

  // The page keeps its identity; only its content is transplanted
  await expect(page).toHaveURL(new RegExp(`/app/wiki/${target.id}/`));
  await expect(page.getByText("Muster-Inhalt.")).toBeVisible();

  const targetRow = await prisma.wikiPage.findUniqueOrThrow({
    where: { id: target.id },
    select: { title: true },
  });
  expect(targetRow.title).toBe("Bestehend");

  await expectPersisted(prisma, target.id, "searchText").toContain(
    "Muster-Inhalt.",
  );

  // The old content survives as an automatic snapshot
  expect(
    await prisma.wikiPageSnapshot.count({
      where: { pageId: target.id, name: "Automatische Sicherung vor Ersetzen" },
    }),
  ).toBe(1);

  // Existing children are kept, copied children appended
  expect(
    await prisma.wikiPage.count({
      where: { title: "Altes Kind", parentId: target.id },
    }),
  ).toBe(1);
  /**
   * The action copies the children only after the collab replace, whose
   * store debounce already satisfies the searchText poll above — so the
   * action may still be running here. Poll until the child copy lands;
   * this also orders the "no (Kopie) page" check below after the action.
   */
  await expect
    .poll(() =>
      prisma.wikiPage.count({
        where: { title: "Muster-Kind", parentId: target.id },
      }),
    )
    .toBe(1);
  // No "(Kopie)" page was created — the target itself was replaced
  expect(
    await prisma.wikiPage.count({ where: { title: "Muster (Kopie)" } }),
  ).toBe(0);
});

/**
 * A copy gets the upload links of its source. The nightly cleanup and the
 * "unused" filter read these links, thus an image stays while a copy shows
 * it, also when the source does not show it anymore.
 */
test("a pasted copy keeps an image in use after the source removes it", async ({
  page,
  prisma,
  signIn,
}) => {
  const editor = await createCitizen(prisma, { handle: "bild-kopierer" });
  const image = await createUpload(prisma, editor.entity, {
    fileName: "Kopiertes Bild.png",
    mimeType: "image/png",
  });
  const source = await seedEditablePage(prisma, {
    title: "Bildvorlage",
    content: wikiDocument(
      wikiParagraph("Einleitung."),
      uploadedImage(image.id),
    ),
  });
  /** The link that the assign route writes right after the upload */
  await prisma.wikiPageUpload.create({
    data: {
      pageId: source.id,
      uploadId: image.id,
      kind: WikiPageUploadKind.IMAGE,
    },
  });
  /**
   * With a recent snapshot, the edit below writes no automatic snapshot that
   * keeps the image. Thus only the link of the copy keeps it.
   */
  await prisma.wikiPageSnapshot.create({
    data: {
      pageId: source.id,
      kind: WikiPageSnapshotKind.MANUAL,
      name: "Ohne Bild",
      content: { type: "doc", content: [] },
    },
  });
  const target = await createWikiPage(prisma, {
    title: "Bildablage",
    visibility: WikiPageVisibility.PUBLIC,
    ownerId: editor.entity.id,
  });
  await signIn(editor.user);

  await page.goto(`/app/wiki/${source.id}/${source.slug}`);
  await copyPageToClipboard(page);

  await page.goto(`/app/wiki/${target.id}/${target.slug}`);
  await openCreatePageModal(page);
  await page.getByRole("button", { name: "Einfügen", exact: true }).click();
  await expect(page).toHaveURL(/bildvorlage-kopie$/);

  const copy = await prisma.wikiPage.findFirstOrThrow({
    where: { title: "Bildvorlage (Kopie)" },
    select: {
      id: true,
      slug: true,
      uploads: { select: { uploadId: true, kind: true } },
    },
  });
  expect(copy.uploads).toEqual([
    { uploadId: image.id, kind: WikiPageUploadKind.IMAGE },
  ]);

  await page.goto(`/app/wiki/${source.id}/${source.slug}`);
  await enterEditMode(page);
  await focusEditor(page);
  await page.keyboard.press("ControlOrMeta+a");
  await page.keyboard.type("Ohne Bild.");
  await expectPersisted(prisma, source.id, "content").not.toContain(image.id);
  expect(
    await prisma.wikiPageUpload.count({ where: { pageId: source.id } }),
  ).toBe(0);
  /**
   * Only the snapshots of the source: the copy opened in the collab editor
   * after the paste, and its first store can write an automatic snapshot
   * that keeps the image.
   */
  expect(
    await prisma.wikiPageSnapshotUpload.count({
      where: { uploadId: image.id, snapshot: { pageId: source.id } },
    }),
  ).toBe(0);

  await page.goto("/app/uploads");
  const row = page.getByRole("row").filter({ hasText: "Kopiertes Bild.png" });
  await expect(
    row.getByRole("link", { name: "Bildvorlage (Kopie)" }),
  ).toHaveAttribute("href", `/app/wiki/${copy.id}/${copy.slug}`);
  await expect(row.getByText("Wiki-Bild/-Anhang")).toBeVisible();

  await page.goto("/app/uploads?usage=unused");
  await expect(page.getByText("Keine Uploads für diese Filter.")).toBeVisible();
});

test("an event created from a template links the uploads of its briefing copy", async ({
  page,
  prisma,
  signIn,
}) => {
  const owner = await createCitizen(prisma, {
    handle: "briefing-planer",
    permissionStrings: ["event;read", "event;create"],
  });
  const { template, briefingPages } = await createEventTemplate(prisma, {
    name: "Bildbriefing",
    ownedById: owner.entity.id,
    briefingPageTitles: ["Anflugkarte"],
  });
  const briefingPage = briefingPages[0]!;
  const map = await createUpload(prisma, owner.entity, {
    fileName: "Anflugkarte.png",
    mimeType: "image/png",
    wikiPageId: briefingPage.id,
  });
  await prisma.wikiPage.update({
    where: { id: briefingPage.id },
    data: { content: { type: "doc", content: [uploadedImage(map.id)] } },
  });

  await signIn(owner.user);
  await page.goto(`/app/events/templates/${template.id}`);
  await clickUntilVisible(
    page.getByRole("button", { name: "Verwenden" }),
    modal(page, "Neues Event"),
  );
  const createDialog = modal(page, "Neues Event");
  await fillUntilValue(createDialog.getByLabel("Start"), "2999-01-01T18:00");
  await fillUntilValue(createDialog.getByLabel("Ende"), "2999-01-01T20:00");
  await createDialog.getByRole("button", { name: "Speichern" }).click();
  await expect(page).toHaveURL(/\/app\/events\/[^/]+$/);

  const briefingCopy = await prisma.wikiPage.findFirstOrThrow({
    where: { title: "Anflugkarte", eventId: { not: null } },
    select: { uploads: { select: { uploadId: true, kind: true } } },
  });
  expect(briefingCopy.uploads).toEqual([
    { uploadId: map.id, kind: WikiPageUploadKind.IMAGE },
  ]);
});
