import {
  createCitizen,
  createWikiPage,
  wikiDocument,
  wikiHeading,
  WikiPageVisibility,
  wikiParagraph,
} from "../fixtures/factories";
import { clickUntilUrl } from "../fixtures/interactions";
import { expect, test } from "../fixtures/test";

test("a seeded page renders its title and content", async ({
  page,
  prisma,
  signIn,
}) => {
  const citizen = await createCitizen(prisma, { handle: "reader" });
  const wikiPage = await createWikiPage(prisma, {
    title: "Handbuch",
    visibility: WikiPageVisibility.PUBLIC,
    content: wikiDocument(
      wikiHeading(2, "Willkommen"),
      wikiParagraph("Dieses Handbuch beschreibt die ersten Schritte."),
    ),
  });
  await signIn(citizen.user);

  await page.goto(`/app/wiki/${wikiPage.id}/${wikiPage.slug}`);

  await expect(
    page.getByRole("heading", { level: 1, name: "Handbuch" }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "Willkommen" })).toBeVisible();
  await expect(
    page.getByText("Dieses Handbuch beschreibt die ersten Schritte."),
  ).toBeVisible();
});

test("a page URL without slug redirects to the canonical URL", async ({
  page,
  prisma,
  signIn,
}) => {
  const citizen = await createCitizen(prisma, { handle: "reader" });
  const wikiPage = await createWikiPage(prisma, {
    title: "Regeln",
    visibility: WikiPageVisibility.PUBLIC,
  });
  await signIn(citizen.user);

  await page.goto(`/app/wiki/${wikiPage.id}`);

  await expect(page).toHaveURL(`/app/wiki/${wikiPage.id}/${wikiPage.slug}`);
});

test("an unknown page id renders the 404 page", async ({
  page,
  prisma,
  signIn,
}) => {
  const citizen = await createCitizen(prisma, { handle: "reader" });
  await signIn(citizen.user);

  // The layout streams before the page 404s, so the HTTP status is already
  // 200 — the rendered 404 UI is the observable behavior
  await page.goto("/app/wiki/does-not-exist");

  await expect(page.getByText("Page not found")).toBeVisible();
});

test("the sidebar tree links between pages", async ({
  page,
  prisma,
  signIn,
}) => {
  const citizen = await createCitizen(prisma, { handle: "reader" });
  const parent = await createWikiPage(prisma, {
    title: "Flotte",
    visibility: WikiPageVisibility.PUBLIC,
    content: wikiDocument(wikiParagraph("Alles über die Flotte.")),
  });
  const child = await createWikiPage(prisma, {
    title: "Schiffe",
    parentId: parent.id,
    content: wikiDocument(wikiParagraph("Liste aller Schiffe.")),
  });
  await signIn(citizen.user);

  await page.goto(`/app/wiki/${parent.id}/${parent.slug}`);

  await expect(page.getByRole("link", { name: "Flotte" })).toBeVisible();

  await clickUntilUrl(
    page,
    page.getByRole("link", { name: "Schiffe" }),
    `/app/wiki/${child.id}/${child.slug}`,
  );
  await expect(page.getByText("Liste aller Schiffe.")).toBeVisible();
});

test("the landing page lists recently updated pages", async ({
  page,
  prisma,
  signIn,
}) => {
  const citizen = await createCitizen(prisma, { handle: "reader" });
  await createWikiPage(prisma, {
    title: "Einsatzplanung",
    visibility: WikiPageVisibility.PUBLIC,
  });
  await signIn(citizen.user);

  await page.goto("/app/wiki");

  const recentlyUpdated = page
    .getByRole("heading", { name: "Zuletzt aktualisiert" })
    .locator("..");
  await expect(
    recentlyUpdated.getByRole("link", { name: "Einsatzplanung" }),
  ).toBeVisible();
});
