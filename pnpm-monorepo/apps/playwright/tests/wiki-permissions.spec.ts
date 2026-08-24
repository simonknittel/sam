import {
  assignRole,
  createCitizen,
  createRole,
  createWikiPage,
  wikiDocument,
  WikiPageAccessType,
  WikiPageEditability,
  WikiPageVisibility,
  wikiParagraph,
} from "../fixtures/factories";
import { NOT_FOUND_TEXT } from "../fixtures/interactions";
import { expect, test } from "../fixtures/test";

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
