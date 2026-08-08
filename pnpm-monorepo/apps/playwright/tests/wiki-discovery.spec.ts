import {
  createCitizen,
  createRole,
  createWikiPage,
  createWikiTag,
  setWikiFeaturedPages,
  wikiDocument,
  WikiPageAccessType,
  WikiPageVisibility,
  wikiParagraph,
} from "../fixtures/factories";
import type { Page } from "@playwright/test";
import { expect, test } from "../fixtures/test";

const landingSearch = (page: Page) =>
  page
    .locator("section")
    .filter({ has: page.getByRole("heading", { name: "Seiten durchsuchen" }) })
    .getByRole("combobox");

test("search finds a page by its content", async ({ page, prisma, signIn }) => {
  const citizen = await createCitizen(prisma, { handle: "searcher" });
  const wikiPage = await createWikiPage(prisma, {
    title: "Bergbau",
    visibility: WikiPageVisibility.PUBLIC,
    content: wikiDocument(wikiParagraph("Quantanium sicher abbauen.")),
  });
  await signIn(citizen.user);

  await page.goto("/app/wiki");
  // The sidebar carries a second, compact search — scope to the landing
  // page's search section (the only one with a visible heading)
  await landingSearch(page).fill("Quantanium");

  const results = page.getByRole("listbox", { name: "Suchergebnisse" });
  await results.getByRole("link", { name: /Bergbau/ }).click();

  await expect(page).toHaveURL(`/app/wiki/${wikiPage.id}/${wikiPage.slug}`);
});

test("search never returns pages the user cannot read", async ({
  page,
  prisma,
  signIn,
}) => {
  const readerRole = await createRole(prisma, { name: "vorstand" });
  const outsider = await createCitizen(prisma, { handle: "outsider" });
  await createWikiPage(prisma, {
    title: "Vorstandsprotokoll",
    visibility: WikiPageVisibility.RESTRICTED,
    roleAccess: [{ roleId: readerRole.id, type: WikiPageAccessType.READ }],
    content: wikiDocument(wikiParagraph("Vertrauliche Beschlüsse.")),
  });
  await signIn(outsider.user);

  await page.goto("/app/wiki");
  await landingSearch(page).fill("Vorstandsprotokoll");

  await expect(page.getByText("Keine Treffer.")).toBeVisible();
});

test("tags are shown on the page and list their pages", async ({
  page,
  prisma,
  signIn,
}) => {
  const citizen = await createCitizen(prisma, { handle: "reader" });
  const wikiPage = await createWikiPage(prisma, {
    title: "Handelsrouten",
    visibility: WikiPageVisibility.PUBLIC,
  });
  const tag = await createWikiTag(prisma, wikiPage, "Wirtschaft");
  await signIn(citizen.user);

  await page.goto(`/app/wiki/${wikiPage.id}/${wikiPage.slug}`);
  await page.getByRole("link", { name: "Wirtschaft" }).click();

  await expect(page).toHaveURL(`/app/wiki/tags/${tag.id}`);
  // Scoped to the listing section — the sidebar tree links the page too
  await expect(
    page.locator("section").getByRole("link", { name: "Handelsrouten" }),
  ).toBeVisible();
});

test("featured pages show on the landing page, filtered by read access", async ({
  page,
  prisma,
  signIn,
}) => {
  const readerRole = await createRole(prisma, { name: "vorstand" });
  const citizen = await createCitizen(prisma, { handle: "reader" });
  const openPage = await createWikiPage(prisma, {
    title: "Einsteigerguide",
    visibility: WikiPageVisibility.PUBLIC,
  });
  const restrictedPage = await createWikiPage(prisma, {
    title: "Interna",
    visibility: WikiPageVisibility.RESTRICTED,
    roleAccess: [{ roleId: readerRole.id, type: WikiPageAccessType.READ }],
  });
  await setWikiFeaturedPages(prisma, [openPage.id, restrictedPage.id]);
  await signIn(citizen.user);

  await page.goto("/app/wiki");

  const featuredSection = page
    .locator("section")
    .filter({ has: page.getByRole("heading", { name: "Featured" }) });
  await expect(
    featuredSection.getByRole("link", { name: /Einsteigerguide/ }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: /Interna/ })).toHaveCount(0);
});
