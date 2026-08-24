import type { Page } from "@playwright/test";
import {
  createCitizen,
  createRole,
  createWikiPage,
  wikiDocument,
  WikiPageAccessType,
  WikiPageVisibility,
  wikiParagraph,
} from "../fixtures/factories";
import {
  ACTION_FEEDBACK_TIMEOUT,
  clickUntilVisible,
} from "../fixtures/interactions";
import { expect, test } from "../fixtures/test";
import { expectPersisted } from "../fixtures/wiki-editor";

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

  await expect(page).toHaveURL(/handbuch-kopie$/, {
    timeout: ACTION_FEEDBACK_TIMEOUT,
  });
  await expect(page.getByText("Grundlagen des Bergbaus.")).toBeVisible();

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
    .locator('select[name="copyFromPageId"]')
    .selectOption({ label: "Vorlage" });
  await page.getByRole("button", { name: "Erstellen", exact: true }).click();

  await expect(page.getByText("Struktur der Vorlage.")).toBeVisible({
    timeout: ACTION_FEEDBACK_TIMEOUT,
  });

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
  await page.getByText("Seite ersetzen", { exact: true }).click();
  await page.getByRole("button", { name: "Einfügen", exact: true }).click();

  // The page keeps its identity; only its content is transplanted
  await expect(page).toHaveURL(new RegExp(`/app/wiki/${target.id}/`), {
    timeout: ACTION_FEEDBACK_TIMEOUT,
  });
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
    .poll(
      () =>
        prisma.wikiPage.count({
          where: { title: "Muster-Kind", parentId: target.id },
        }),
      { timeout: ACTION_FEEDBACK_TIMEOUT },
    )
    .toBe(1);
  // No "(Kopie)" page was created — the target itself was replaced
  expect(
    await prisma.wikiPage.count({ where: { title: "Muster (Kopie)" } }),
  ).toBe(0);
});
