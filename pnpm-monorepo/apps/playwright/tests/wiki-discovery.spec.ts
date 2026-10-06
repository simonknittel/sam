import type { Page } from "@playwright/test";
import {
  assignRole,
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
  BAD_REQUEST_TEXT,
  clickUntilUrl,
  clickUntilVisible,
  fillUntilVisible,
  modal,
  NOT_FOUND_TEXT,
  sectionByHeading,
} from "../fixtures/interactions";
import { expect, test } from "../fixtures/test";

/** The sidebar carries a second, compact search box of the same name */
const landingSearch = (page: Page) =>
  sectionByHeading(page, "Seiten durchsuchen").getByRole("combobox");

const searchUntilReaction = (
  page: Page,
  query: string,
  reaction: ReturnType<Page["locator"]>,
) => fillUntilVisible(landingSearch(page), query, reaction);

test("search finds readable pages and never the others", async ({
  page,
  prisma,
  signIn,
  switchUser,
}) => {
  const readerRole = await createRole(prisma, { name: "vorstand" });
  const member = await createCitizen(prisma, { handle: "searcher" });
  await assignRole(prisma, member.entity, readerRole);
  const outsider = await createCitizen(prisma, { handle: "outsider" });

  const openPage = await createWikiPage(prisma, {
    title: "Bergbau",
    visibility: WikiPageVisibility.PUBLIC,
    content: wikiDocument(wikiParagraph("Quantanium sicher abbauen.")),
  });
  await createWikiPage(prisma, {
    title: "Vorstandsprotokoll",
    visibility: WikiPageVisibility.RESTRICTED,
    roleAccess: [{ roleId: readerRole.id, type: WikiPageAccessType.READ }],
    content: wikiDocument(wikiParagraph("Vertrauliche Beschlüsse.")),
  });
  await signIn(member.user);

  await page.goto("/app/wiki");
  const results = page.getByRole("listbox", { name: "Suchergebnisse" });
  await searchUntilReaction(
    page,
    "Quantanium",
    results.getByRole("option", { name: /Bergbau/ }),
  );
  await results.getByRole("option", { name: /Bergbau/ }).click();
  await expect(page).toHaveURL(`/app/wiki/${openPage.id}/${openPage.slug}`);

  // The role member finds the restricted page too …
  await page.goto("/app/wiki");
  await searchUntilReaction(
    page,
    "Vorstandsprotokoll",
    results.getByRole("option", { name: /Vorstandsprotokoll/ }),
  );

  // … while everyone else gets nothing, not even a hint that it exists
  await switchUser(outsider.user);
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

test("search shows the tags of a page that match the query", async ({
  page,
  prisma,
  signIn,
}) => {
  const citizen = await createCitizen(prisma, { handle: "reader" });
  const wikiPage = await createWikiPage(prisma, {
    title: "Handelsrouten",
    visibility: WikiPageVisibility.PUBLIC,
  });
  await createWikiTag(prisma, wikiPage, "Wirtschaft");
  await signIn(citizen.user);

  await page.goto("/app/wiki");
  const pageResult = page
    .getByRole("listbox", { name: "Suchergebnisse" })
    .getByRole("option", { name: /Handelsrouten/ });
  await searchUntilReaction(page, "Wirtschaft", pageResult);
  await expect(
    pageResult.getByText("Wirtschaft", { exact: true }),
  ).toBeVisible();
});

test("the keyboard opens search results, and Escape closes them", async ({
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

  /**
   * A wiki page shows only the search of the sidebar. The sidebar stays
   * during a navigation, thus the results must close by themselves.
   */
  const search = page.getByRole("combobox", { name: "Seiten durchsuchen" });
  const results = page.getByRole("listbox", { name: "Suchergebnisse" });
  const tagResult = results
    .getByRole("group", { name: "Tags" })
    .getByRole("option", { name: /Wirtschaft/ });
  const pageResult = results
    .getByRole("group", { name: "Seiten" })
    .getByRole("option", { name: /Handelsrouten/ });

  // The first result is highlighted without an arrow key
  await page.goto(`/app/wiki/${wikiPage.id}/${wikiPage.slug}`);
  await fillUntilVisible(search, "Wirtschaft", pageResult);
  // The input keeps its name while the results are open
  await expect(search).toHaveAttribute("aria-expanded", "true");
  await expect(tagResult).toHaveAttribute("data-highlighted");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(`/app/wiki/tags/${tag.id}`);
  await expect(results).toBeHidden();

  await fillUntilVisible(search, "Wirtschaft", pageResult);
  await page.keyboard.press("ArrowDown");
  await expect(pageResult).toHaveAttribute("data-highlighted");
  await expect(tagResult).not.toHaveAttribute("data-highlighted");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(`/app/wiki/${wikiPage.id}/${wikiPage.slug}`);
  await expect(results).toBeHidden();

  await fillUntilVisible(search, "Wirtschaft", pageResult);
  await page.keyboard.press("Escape");
  await expect(results).toBeHidden();
  await expect(search).toBeFocused();
});

test("the search shows no results of an older query while the new results load", async ({
  page,
  prisma,
  signIn,
}) => {
  const citizen = await createCitizen(prisma, { handle: "reader" });
  await createWikiPage(prisma, {
    title: "Bergbau",
    visibility: WikiPageVisibility.PUBLIC,
  });
  const tradePage = await createWikiPage(prisma, {
    title: "Handelsrouten",
    visibility: WikiPageVisibility.PUBLIC,
  });
  await signIn(citizen.user);

  await page.goto("/app/wiki");
  const results = page.getByRole("listbox", { name: "Suchergebnisse" });
  const miningResult = results.getByRole("option", { name: /Bergbau/ });
  const tradeResult = results.getByRole("option", { name: /Handelsrouten/ });
  await searchUntilReaction(page, "Bergbau", miningResult);

  /** While the results are open, Base UI hides the heading that finds the input */
  await page.keyboard.press("Escape");
  await expect(results).toBeHidden();

  /** The test holds the response of the next search until it releases it */
  let isRequested = false;
  const response = Promise.withResolvers<void>();
  await page.route(
    (url) =>
      url.pathname.startsWith("/api/trpc/") &&
      url.pathname.includes("wiki.search"),
    async (route) => {
      isRequested = true;
      await response.promise;
      await route.continue();
    },
  );

  /**
   * Enter while the debounce runs and Enter while the new results load open
   * nothing. Without a highlighted result, Enter closes the results.
   */
  const search = landingSearch(page);
  await search.fill("Handelsrouten");
  await page.keyboard.press("Enter");
  await expect(miningResult).toBeHidden();
  await expect.poll(() => isRequested).toBe(true);
  await search.click();
  await expect(page.getByText("Suche läuft …")).toBeAttached();
  await expect(results.getByRole("option")).toHaveCount(0);
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL("/app/wiki");

  // The new results open with the keyboard
  response.resolve();
  await search.click();
  await expect(tradeResult).toHaveAttribute("data-highlighted");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(`/app/wiki/${tradePage.id}/${tradePage.slug}`);
});

test("a tag name in other letter case uses the existing tag", async ({
  page,
  prisma,
  signIn,
}) => {
  const editor = await createCitizen(prisma, {
    handle: "wiki-autor",
    permissionStrings: ["wiki;manage"],
  });
  const taggedPage = await createWikiPage(prisma, {
    title: "Handelsrouten",
    visibility: WikiPageVisibility.PUBLIC,
  });
  await createWikiTag(prisma, taggedPage, "Bergbau");
  const wikiPage = await createWikiPage(prisma, {
    title: "Frachtpreise",
    visibility: WikiPageVisibility.PUBLIC,
  });

  await signIn(editor.user);
  await page.goto(`/app/wiki/${wikiPage.id}/${wikiPage.slug}`);

  const tagsDialog = modal(page, "Tags bearbeiten");
  await clickUntilVisible(
    page.getByRole("button", { name: /Tags bearbeiten/ }),
    tagsDialog,
  );
  /** The dialog suggests the tags that existed when it opened */
  await expect(
    tagsDialog.getByRole("button", { name: "Bergbau" }),
  ).toBeVisible();

  /**
   * A different editor creates the tag after the dialog loaded the tags.
   * Thus the dialog offers a new tag, and only the server can find the
   * existing one.
   */
  const existingTag = await createWikiTag(prisma, taggedPage, "Wirtschaft");
  const newTagButton = tagsDialog.getByRole("button", {
    name: '"wirtschaft" neu anlegen',
  });
  await fillUntilVisible(
    tagsDialog.getByLabel("Tag hinzufügen"),
    "wirtschaft",
    newTagButton,
  );
  await newTagButton.click();
  await tagsDialog.getByRole("button", { name: "Speichern" }).click();

  /** The letter case of the existing tag wins */
  await expect(
    page.getByRole("link", { name: "Wirtschaft", exact: true }),
  ).toBeVisible();
  expect(
    await prisma.wikiPageTag.findMany({
      where: { pageId: wikiPage.id },
      select: { tag: { select: { id: true, name: true } } },
    }),
  ).toEqual([{ tag: { id: existingTag.id, name: "Wirtschaft" } }]);
  expect(await prisma.wikiTag.count()).toBe(2);
});

test("the tags of a page that a different user deleted are not saved", async ({
  page,
  prisma,
  signIn,
}) => {
  const editor = await createCitizen(prisma, {
    handle: "wiki-autor",
    permissionStrings: ["wiki;manage"],
  });
  const wikiPage = await createWikiPage(prisma, {
    title: "Frachtpreise",
    visibility: WikiPageVisibility.PUBLIC,
  });

  await signIn(editor.user);
  await page.goto(`/app/wiki/${wikiPage.id}/${wikiPage.slug}`);
  /**
   * When the page mounts, it records the visit and connects the editor. Both
   * read the page and show a deletion themselves, thus the deletion below
   * must come after them.
   */
  await expect
    .poll(() => prisma.wikiPageVisit.count({ where: { pageId: wikiPage.id } }))
    .toBe(1);
  await expect(page.locator(".tiptap")).toBeVisible();

  const tagsDialog = modal(page, "Tags bearbeiten");
  await clickUntilVisible(
    page.getByRole("button", { name: /Tags bearbeiten/ }),
    tagsDialog,
  );
  const newTagButton = tagsDialog.getByRole("button", {
    name: '"bergbau" neu anlegen',
  });
  await fillUntilVisible(
    tagsDialog.getByLabel("Tag hinzufügen"),
    "bergbau",
    newTagButton,
  );
  await newTagButton.click();

  /** A different user moves the page into the trash in the meantime */
  await prisma.wikiPage.update({
    where: { id: wikiPage.id },
    data: { deletedAt: new Date() },
  });

  /**
   * The error refreshes the page: it shows that the page is gone, without a
   * navigation. The dialog goes away with the page, thus a toast shows the
   * error.
   */
  await tagsDialog.getByRole("button", { name: "Speichern" }).click();
  await expect(page.getByText(BAD_REQUEST_TEXT)).toBeVisible();
  await expect(page.getByText(NOT_FOUND_TEXT)).toBeVisible();
  await expect(tagsDialog).toHaveCount(0);
  expect(await prisma.wikiTag.count()).toBe(0);
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

  const featuredSection = sectionByHeading(page, "Featured");
  await expect(
    featuredSection.getByRole("link", { name: /Einsteigerguide/ }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: /Interna/ })).toHaveCount(0);

  // The landing page's other lists are filtered the same way
  const recentlyUpdated = sectionByHeading(page, "Zuletzt aktualisiert");
  await expect(
    recentlyUpdated.getByRole("link", { name: /Einsteigerguide/ }),
  ).toBeVisible();
  await expect(
    recentlyUpdated.getByRole("link", { name: /Interna/ }),
  ).toHaveCount(0);

  const recentlyCreated = sectionByHeading(page, "Zuletzt erstellt");
  await expect(
    recentlyCreated.getByRole("link", { name: /Einsteigerguide/ }),
  ).toBeVisible();
  await expect(
    recentlyCreated.getByRole("link", { name: /Interna/ }),
  ).toHaveCount(0);
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
    .poll(() =>
      prisma.wikiPageVisit.count({ where: { pageId: openedPage.id } }),
    )
    .toBe(1);

  await page.goto("/app/wiki");
  // The landing page lists use the common <Link>, whose hover-triggered
  // prefetch renders the target route server-side up to the root loading
  // boundary — without a visit (the sidebar tree can't serve here, it
  // disables prefetching entirely)
  const recentlyUpdatedSection = sectionByHeading(page, "Zuletzt aktualisiert");
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
  const recentlyVisitedSection = sectionByHeading(page, "Zuletzt besucht");
  await expect(
    recentlyVisitedSection.getByRole("link", { name: "Sprungpunkte" }),
  ).toBeVisible();
  await expect(
    recentlyVisitedSection.getByRole("link", { name: "Scannerbetrieb" }),
  ).toHaveCount(0);
  expect(
    await prisma.wikiPageVisit.count({ where: { pageId: prefetchedPage.id } }),
  ).toBe(0);

  // Actually opening the page counts, even when the navigation starts from
  // a prefetched entry — hovering first and awaiting the prefetch makes the
  // click go through the prefetch cache (the reload above emptied it)
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
    .poll(() =>
      prisma.wikiPageVisit.count({ where: { pageId: prefetchedPage.id } }),
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
