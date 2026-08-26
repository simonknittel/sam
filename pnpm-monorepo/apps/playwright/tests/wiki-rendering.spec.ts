import {
  createCitizen,
  createWikiPage,
  wikiDocument,
  wikiHeading,
  WikiPageVisibility,
  wikiParagraph,
} from "../fixtures/factories";
import { clickUntilUrl, NOT_FOUND_TEXT } from "../fixtures/interactions";
import { expect, test } from "../fixtures/test";

test("a page is reached through its canonical URL and through the sidebar tree", async ({
  page,
  prisma,
  signIn,
}) => {
  const citizen = await createCitizen(prisma, { handle: "reader" });
  const parent = await createWikiPage(prisma, {
    title: "Flotte",
    visibility: WikiPageVisibility.PUBLIC,
    content: wikiDocument(
      wikiHeading(2, "Willkommen"),
      wikiParagraph("Alles über die Flotte."),
    ),
  });
  const child = await createWikiPage(prisma, {
    title: "Schiffe",
    parentId: parent.id,
    content: wikiDocument(wikiParagraph("Liste aller Schiffe.")),
  });
  await signIn(citizen.user);

  // A URL without the slug redirects to the canonical one
  await page.goto(`/app/wiki/${parent.id}`);
  await expect(page).toHaveURL(`/app/wiki/${parent.id}/${parent.slug}`);

  await expect(
    page.getByRole("heading", { level: 1, name: "Flotte" }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "Willkommen" })).toBeVisible();
  await expect(page.getByText("Alles über die Flotte.")).toBeVisible();

  await clickUntilUrl(
    page,
    page.getByRole("link", { name: "Schiffe" }),
    `/app/wiki/${child.id}/${child.slug}`,
  );
  await expect(page.getByText("Liste aller Schiffe.")).toBeVisible();
});

test("an unknown page id renders the 404 next to the sidebar", async ({
  page,
  prisma,
  signIn,
}) => {
  const citizen = await createCitizen(prisma, { handle: "reader" });
  const existingPage = await createWikiPage(prisma, {
    title: "Flotte",
    visibility: WikiPageVisibility.PUBLIC,
  });
  await signIn(citizen.user);

  // The layout streams before the page 404s, so the HTTP status is already
  // 200 — the rendered 404 UI is the observable behavior
  await page.goto("/app/wiki/does-not-exist");

  await expect(page.getByText(NOT_FOUND_TEXT)).toBeVisible();

  // Only the page content 404s — the wiki keeps its table of contents
  await expect(
    page.getByRole("combobox", { name: "Seiten durchsuchen" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: existingPage.title }).first(),
  ).toBeVisible();
});
