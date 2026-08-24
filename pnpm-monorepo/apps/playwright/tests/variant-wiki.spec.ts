import type { Page } from "@playwright/test";
import type { PrismaClient } from "@sam-monorepo/database/client";
import {
  createCitizen,
  createRole,
  createVariant,
  createWikiPage,
  createWikiTag,
  wikiDocument,
  WikiPageAccessType,
  WikiPageVisibility,
  wikiParagraph,
  type Citizen,
} from "../fixtures/factories";
import {
  clickUntilUrl,
  clickUntilVisible,
  fillUntilVisible,
  modal,
  NOT_FOUND_TEXT,
  waitForAppShellHydration,
} from "../fixtures/interactions";
import { expect, test } from "../fixtures/test";

/**
 * A variant with a linked wiki subtree (root → child) plus one readable
 * page outside the subtree, the shared setup of most embed tests.
 */
const seedLinkedVariant = async (
  prisma: PrismaClient,
  { owner }: { readonly owner?: Citizen } = {},
) => {
  const rootPage = await createWikiPage(prisma, {
    title: "Polaris Handbuch",
    visibility: WikiPageVisibility.PUBLIC,
    ownerId: owner?.entity.id,
    content: wikiDocument(wikiParagraph("Alles über die Polaris.")),
  });
  const childPage = await createWikiPage(prisma, {
    title: "Torpedos",
    parentId: rootPage.id,
    content: wikiDocument(wikiParagraph("Torpedos richtig nachladen.")),
  });
  const outsidePage = await createWikiPage(prisma, {
    title: "Torpedolager",
    visibility: WikiPageVisibility.PUBLIC,
    content: wikiDocument(wikiParagraph("Torpedos im Lager zählen.")),
  });

  const { manufacturer, series, variant } = await createVariant(prisma, {
    manufacturerName: "RSI",
    seriesName: "Polaris",
    variantName: "Polaris",
  });
  await prisma.variant.update({
    where: { id: variant.id },
    data: { wikiPageId: rootPage.id },
  });

  return { rootPage, childPage, outsidePage, manufacturer, series, variant };
};

const sidebarSearch = (page: Page) => page.getByRole("combobox");

test("the linked subtree renders on the variant page, limited to the subtree", async ({
  page,
  prisma,
  signIn,
}) => {
  const citizen = await createCitizen(prisma, {
    handle: "leser",
    permissionStrings: ["orgFleet;read"],
  });
  const { rootPage, childPage, outsidePage, variant } =
    await seedLinkedVariant(prisma);
  await signIn(citizen.user);

  await page.goto(`/app/fleet/variant/${variant.id}`);

  await expect(
    page.getByRole("heading", { name: rootPage.title }),
  ).toBeVisible();
  await expect(page.getByText("Alles über die Polaris.")).toBeVisible();
  await expect(page.getByRole("link", { name: childPage.title })).toBeVisible();
  await expect(page.getByRole("link", { name: outsidePage.title })).toHaveCount(
    0,
  );
});

test("tree navigation opens subpages under the variant URL, keeping the metadata", async ({
  page,
  prisma,
  signIn,
}) => {
  const citizen = await createCitizen(prisma, {
    handle: "leser",
    permissionStrings: ["orgFleet;read"],
  });
  const { childPage, variant } = await seedLinkedVariant(prisma);
  await signIn(citizen.user);

  await page.goto(`/app/fleet/variant/${variant.id}`);
  await clickUntilUrl(
    page,
    page.getByRole("link", { name: childPage.title }),
    `/app/fleet/variant/${variant.id}/wiki/${childPage.id}/${childPage.slug}`,
  );

  await expect(page.getByText("Torpedos richtig nachladen.")).toBeVisible();
  // The variant metadata stays above the embedded page
  await expect(page.getByTitle(variant.name, { exact: true })).toBeVisible();
});

test("the embed search only finds subtree pages", async ({
  page,
  prisma,
  signIn,
}) => {
  const citizen = await createCitizen(prisma, {
    handle: "sucher",
    permissionStrings: ["orgFleet;read"],
  });
  const { childPage, variant } = await seedLinkedVariant(prisma);
  await signIn(citizen.user);

  await page.goto(`/app/fleet/variant/${variant.id}`);
  const results = page.getByRole("listbox", { name: "Suchergebnisse" });
  await fillUntilVisible(
    sidebarSearch(page),
    "nachladen",
    results.getByRole("link", { name: new RegExp(childPage.title) }),
  );

  // The outside page matches this term exclusively — no subtree hit exists
  await fillUntilVisible(
    sidebarSearch(page),
    "Lager zählen",
    page.getByText("Keine Treffer."),
  );
});

test("pages outside the subtree 404 under the variant routes", async ({
  page,
  prisma,
  signIn,
}) => {
  const citizen = await createCitizen(prisma, {
    handle: "leser",
    permissionStrings: ["orgFleet;read"],
  });
  const { outsidePage, variant } = await seedLinkedVariant(prisma);
  await signIn(citizen.user);

  await page.goto(
    `/app/fleet/variant/${variant.id}/wiki/${outsidePage.id}/${outsidePage.slug}`,
  );

  await expect(page.getByText(NOT_FOUND_TEXT)).toBeVisible();
});

test("a variant without a linked page shows no wiki section", async ({
  page,
  prisma,
  signIn,
}) => {
  const citizen = await createCitizen(prisma, {
    handle: "leser",
    permissionStrings: ["orgFleet;read"],
  });
  const { variant } = await createVariant(prisma, {
    manufacturerName: "RSI",
    seriesName: "Polaris",
    variantName: "Polaris",
  });
  await signIn(citizen.user);

  await page.goto(`/app/fleet/variant/${variant.id}`);

  await expect(page.getByTitle(variant.name, { exact: true })).toBeVisible();
  await expect(sidebarSearch(page)).toHaveCount(0);
});

test("an unreadable linked page hides the embed and 404s its routes", async ({
  page,
  prisma,
  signIn,
}) => {
  const insiderRole = await createRole(prisma, { name: "vorstand" });
  const outsider = await createCitizen(prisma, {
    handle: "outsider",
    permissionStrings: ["orgFleet;read"],
  });
  const rootPage = await createWikiPage(prisma, {
    title: "Geheimes Handbuch",
    visibility: WikiPageVisibility.RESTRICTED,
    roleAccess: [{ roleId: insiderRole.id, type: WikiPageAccessType.READ }],
  });
  const childPage = await createWikiPage(prisma, {
    title: "Geheime Unterseite",
    parentId: rootPage.id,
  });
  const { variant } = await createVariant(prisma, {
    manufacturerName: "RSI",
    seriesName: "Polaris",
    variantName: "Polaris",
  });
  await prisma.variant.update({
    where: { id: variant.id },
    data: { wikiPageId: rootPage.id },
  });
  await signIn(outsider.user);

  await page.goto(`/app/fleet/variant/${variant.id}`);
  await expect(page.getByTitle(variant.name, { exact: true })).toBeVisible();
  await expect(sidebarSearch(page)).toHaveCount(0);

  await page.goto(
    `/app/fleet/variant/${variant.id}/wiki/${childPage.id}/${childPage.slug}`,
  );
  await expect(page.getByText(NOT_FOUND_TEXT)).toBeVisible();
});

test("the linked root is locked inside the embed, its children are not", async ({
  page,
  prisma,
  signIn,
}) => {
  const owner = await createCitizen(prisma, {
    handle: "besitzer",
    permissionStrings: ["orgFleet;read"],
  });
  const { childPage, variant } = await seedLinkedVariant(prisma, { owner });
  await signIn(owner.user);

  // Scoped to the page content — the sidebar tree has its own drag handles
  const pageActions = page.locator("article");

  await page.goto(`/app/fleet/variant/${variant.id}`);
  await expect(
    pageActions.getByRole("button", { name: "Berechtigungen bearbeiten" }),
  ).toBeVisible();
  await expect(
    pageActions.getByRole("button", { name: "Seite löschen" }),
  ).toHaveCount(0);
  await expect(
    pageActions.getByRole("button", { name: "Seite verschieben" }),
  ).toHaveCount(0);

  await clickUntilUrl(
    page,
    page.getByRole("link", { name: childPage.title }),
    `/app/fleet/variant/${variant.id}/wiki/${childPage.id}/${childPage.slug}`,
  );
  await expect(
    pageActions.getByRole("button", { name: "Seite löschen" }),
  ).toBeVisible();
  await expect(
    pageActions.getByRole("button", { name: "Seite verschieben" }),
  ).toBeVisible();
});

test("tag chips and the jump-out link lead to the global wiki", async ({
  page,
  prisma,
  signIn,
}) => {
  const citizen = await createCitizen(prisma, {
    handle: "leser",
    permissionStrings: ["orgFleet;read"],
  });
  const { childPage, variant } = await seedLinkedVariant(prisma);
  const tag = await createWikiTag(prisma, childPage, "Bewaffnung");
  await signIn(citizen.user);

  await page.goto(
    `/app/fleet/variant/${variant.id}/wiki/${childPage.id}/${childPage.slug}`,
  );

  await expect(page.getByRole("link", { name: "Bewaffnung" })).toHaveAttribute(
    "href",
    `/app/wiki/tags/${tag.id}`,
  );
  await expect(
    page.getByRole("link", { name: "Im Wiki öffnen" }),
  ).toHaveAttribute("href", `/app/wiki/${childPage.id}/${childPage.slug}`);
});

test("creating a page from the embed lands inside the embed", async ({
  page,
  prisma,
  signIn,
}) => {
  const owner = await createCitizen(prisma, {
    handle: "besitzer",
    permissionStrings: ["orgFleet;read"],
  });
  const { variant } = await seedLinkedVariant(prisma, { owner });
  await signIn(owner.user);

  await page.goto(`/app/fleet/variant/${variant.id}`);

  /**
   * Keyboard instead of pointer: scrolling the deep-down tree row into
   * view parks it under the fixed top bar, where pointer clicks land on
   * the bar instead of the button.
   */
  await waitForAppShellHydration(page);
  const createModal = modal(page, "Neue Seite");
  await page.getByTitle("Neue Unterseite erstellen").first().press("Enter");
  await expect(createModal).toBeVisible();

  await createModal.getByLabel("Titel").fill("Triebwerke");
  await createModal.getByRole("button", { name: "Erstellen" }).click();

  await expect(page).toHaveURL(
    new RegExp(`/app/fleet/variant/${variant.id}/wiki/[a-z0-9]+/triebwerke`),
  );
  await expect(page.getByRole("heading", { name: "Triebwerke" })).toBeVisible();
});

test("the update variant modal links a wiki page", async ({
  page,
  prisma,
  signIn,
}) => {
  const manager = await createCitizen(prisma, {
    handle: "flottenchef",
    permissionStrings: [
      "manufacturersSeriesAndVariants;manage",
      "orgFleet;read",
    ],
  });
  const rootPage = await createWikiPage(prisma, {
    title: "Polaris Handbuch",
    visibility: WikiPageVisibility.PUBLIC,
    content: wikiDocument(wikiParagraph("Alles über die Polaris.")),
  });
  const { manufacturer, series, variant } = await createVariant(prisma, {
    manufacturerName: "RSI",
    seriesName: "Polaris",
    variantName: "Polaris",
  });
  await signIn(manager.user);

  await page.goto(
    `/app/fleet/settings/manufacturer/${manufacturer.id}/series/${series.id}`,
  );
  const editButton = page.getByRole("button", {
    name: "Bearbeiten",
    exact: true,
  });
  await clickUntilVisible(
    page
      .getByRole("row")
      .filter({ hasText: variant.name })
      .getByRole("button", { name: "Aktionen" }),
    editButton,
  );

  const updateModal = modal(page, "Variante bearbeiten");
  await clickUntilVisible(editButton, updateModal);

  await updateModal
    .getByLabel("Wiki-Seite")
    .selectOption({ value: rootPage.id });
  await updateModal.getByRole("button", { name: "Speichern" }).click();
  await expect(updateModal).toHaveCount(0);

  await page.goto(`/app/fleet/variant/${variant.id}`);
  await expect(page.getByText("Alles über die Polaris.")).toBeVisible();
});

test("linked root pages show fleet-gated backlink chips in the global wiki", async ({
  page,
  prisma,
  signIn,
}) => {
  const fleetViewer = await createCitizen(prisma, {
    handle: "flottenleser",
    permissionStrings: ["orgFleet;read"],
  });
  const { rootPage, childPage, variant } = await seedLinkedVariant(prisma);
  await signIn(fleetViewer.user);

  await page.goto(`/app/wiki/${rootPage.id}/${rootPage.slug}`);
  await expect(page.getByText("Eingebunden bei:")).toBeVisible();
  await expect(
    page.getByRole("link", { name: variant.name, exact: true }),
  ).toHaveAttribute("href", `/app/fleet/variant/${variant.id}`);

  // Root only — descendants stay chip-free
  await page.goto(`/app/wiki/${childPage.id}/${childPage.slug}`);
  await expect(page.getByText("Eingebunden bei:")).toHaveCount(0);
});

test("backlink chips stay hidden without the fleet permissions", async ({
  page,
  prisma,
  signIn,
}) => {
  const plainReader = await createCitizen(prisma, { handle: "leser" });
  const { rootPage } = await seedLinkedVariant(prisma);
  await signIn(plainReader.user);

  await page.goto(`/app/wiki/${rootPage.id}/${rootPage.slug}`);
  await expect(
    page.getByRole("heading", { name: rootPage.title }),
  ).toBeVisible();
  await expect(page.getByText("Eingebunden bei:")).toHaveCount(0);
});
