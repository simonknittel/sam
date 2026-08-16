import type { Page } from "@playwright/test";
import {
  createCitizen,
  createRole,
  createWikiPage,
  createWikiTag,
  setWikiDashboardPage,
  setWikiFeaturedPages,
  wikiDocument,
  WikiPageAccessType,
  WikiPageVisibility,
  wikiParagraph,
} from "../fixtures/factories";
import {
  ACTION_FEEDBACK_TIMEOUT,
  clickUntilUrl,
  fillUntilVisible,
} from "../fixtures/interactions";
import { expect, test } from "../fixtures/test";

const landingSearch = (page: Page) =>
  page
    .locator("section")
    .filter({ has: page.getByRole("heading", { name: "Seiten durchsuchen" }) })
    .getByRole("combobox");

const searchUntilReaction = (
  page: Page,
  query: string,
  reaction: ReturnType<Page["locator"]>,
) => fillUntilVisible(landingSearch(page), query, reaction);

test("search finds a page by its content", async ({ page, prisma, signIn }) => {
  const citizen = await createCitizen(prisma, { handle: "searcher" });
  const wikiPage = await createWikiPage(prisma, {
    title: "Bergbau",
    visibility: WikiPageVisibility.PUBLIC,
    content: wikiDocument(wikiParagraph("Quantanium sicher abbauen.")),
  });
  await signIn(citizen.user);

  await page.goto("/app/wiki");
  const results = page.getByRole("listbox", { name: "Suchergebnisse" });
  await searchUntilReaction(
    page,
    "Quantanium",
    results.getByRole("link", { name: /Bergbau/ }),
  );
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
  await searchUntilReaction(
    page,
    "Vorstandsprotokoll",
    page.getByText("Keine Treffer."),
  );
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
  await clickUntilUrl(
    page,
    page.getByRole("link", { name: "Wirtschaft" }),
    `/app/wiki/tags/${tag.id}`,
  );
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

test("recently visited counts opened pages, not prefetched ones", async ({
  page,
  prisma,
  signIn,
}) => {
  const citizen = await createCitizen(prisma, { handle: "visitor" });
  const openedPage = await createWikiPage(prisma, {
    title: "Sprungpunkte",
    visibility: WikiPageVisibility.PUBLIC,
  });
  const prefetchedPage = await createWikiPage(prisma, {
    title: "Scannerbetrieb",
    visibility: WikiPageVisibility.PUBLIC,
  });
  await signIn(citizen.user);

  await page.goto(`/app/wiki/${openedPage.id}/${openedPage.slug}`);
  // The visit is reported from the client after the page mounted
  await expect
    .poll(
      () => prisma.wikiPageVisit.count({ where: { pageId: openedPage.id } }),
      { timeout: ACTION_FEEDBACK_TIMEOUT },
    )
    .toBe(1);

  await page.goto("/app/wiki");
  // The landing page lists use the common <Link>, whose hover-triggered
  // prefetch fully renders the target page server-side — without a visit
  // (the sidebar tree can't serve here, it disables prefetching entirely)
  const recentlyUpdatedSection = page.locator("section").filter({
    has: page.getByRole("heading", { name: "Zuletzt aktualisiert" }),
  });
  const prefetchedLink = recentlyUpdatedSection.getByRole("link", {
    name: "Scannerbetrieb",
  });
  const prefetchResponse = page.waitForResponse((response) =>
    response.url().includes(prefetchedPage.id),
  );
  await prefetchedLink.hover();
  await prefetchResponse;

  // The reload's full round trip leaves a wrongly recorded visit enough
  // time to land before the absence check. The mouse moves away so the
  // later re-hover emits fresh mouse events.
  await page.mouse.move(0, 0);
  await page.reload();
  const recentlyVisitedSection = page
    .locator("section")
    .filter({ has: page.getByRole("heading", { name: "Zuletzt besucht" }) });
  await expect(
    recentlyVisitedSection.getByRole("link", { name: "Sprungpunkte" }),
  ).toBeVisible();
  await expect(
    recentlyVisitedSection.getByRole("link", { name: "Scannerbetrieb" }),
  ).toHaveCount(0);
  expect(
    await prisma.wikiPageVisit.count({ where: { pageId: prefetchedPage.id } }),
  ).toBe(0);

  // Actually opening the page counts, even when the navigation is served
  // from the prefetch cache without another server render — hovering first
  // and awaiting the prefetch makes the click use the cache (the reload
  // above emptied it)
  const repeatedPrefetchResponse = page.waitForResponse((response) =>
    response.url().includes(prefetchedPage.id),
  );
  await prefetchedLink.hover();
  await repeatedPrefetchResponse;
  await clickUntilUrl(
    page,
    prefetchedLink,
    `/app/wiki/${prefetchedPage.id}/${prefetchedPage.slug}`,
  );
  await expect
    .poll(
      () =>
        prisma.wikiPageVisit.count({ where: { pageId: prefetchedPage.id } }),
      { timeout: ACTION_FEEDBACK_TIMEOUT },
    )
    .toBe(1);
});

test("the dashboard tile does not count as a visit", async ({
  page,
  prisma,
  signIn,
}) => {
  const citizen = await createCitizen(prisma, { handle: "dashboarder" });
  const tilePage = await createWikiPage(prisma, {
    title: "Ankündigungen",
    visibility: WikiPageVisibility.PUBLIC,
    content: wikiDocument(wikiParagraph("Wichtige Neuigkeiten.")),
  });
  await setWikiDashboardPage(prisma, tilePage.id);
  await signIn(citizen.user);

  await page.goto("/app/dashboard");
  await expect(page.getByText("Wichtige Neuigkeiten.")).toBeVisible();

  // The reload's full round trip leaves any wrongly fired visit report of
  // the first render enough time to land before the absence check
  await page.reload();
  await expect(page.getByText("Wichtige Neuigkeiten.")).toBeVisible();
  expect(
    await prisma.wikiPageVisit.count({ where: { pageId: tilePage.id } }),
  ).toBe(0);
});
