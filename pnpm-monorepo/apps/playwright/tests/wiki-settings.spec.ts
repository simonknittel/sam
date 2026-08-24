import {
  createCitizen,
  createWikiPage,
  wikiDocument,
  wikiEmbed,
  WikiPageVisibility,
  wikiParagraph,
} from "../fixtures/factories";
import {
  ACTION_FEEDBACK_TIMEOUT,
  SAVED_TEXT,
  sectionByHeading,
  waitForAppShellHydration,
} from "../fixtures/interactions";
import { expect, test } from "../fixtures/test";

test("the settings curate the featured pages, the dashboard page and the support link", async ({
  page,
  prisma,
  signIn,
}) => {
  const manager = await createCitizen(prisma, {
    handle: "wiki-verwalter",
    permissionStrings: ["wiki;manage"],
  });
  const featured = await createWikiPage(prisma, {
    title: "Einsteigerguide",
    visibility: WikiPageVisibility.PUBLIC,
  });
  const dashboard = await createWikiPage(prisma, {
    title: "Ankündigungen",
    visibility: WikiPageVisibility.PUBLIC,
    content: wikiDocument(wikiParagraph("Wichtige Neuigkeiten.")),
  });
  const support = await createWikiPage(prisma, {
    title: "Hilfe",
    visibility: WikiPageVisibility.PUBLIC,
  });

  await signIn(manager.user);
  await page.goto("/app/wiki/settings");
  await waitForAppShellHydration(page);

  /**
   * Featured pages are curated as a list and stored in one go
   */
  const featuredTile = sectionByHeading(page, "Featured Seiten");
  await featuredTile
    .getByLabel("Seite hinzufügen")
    .selectOption({ value: featured.id });
  await featuredTile.getByRole("button", { name: "Hinzufügen" }).click();
  await featuredTile.getByRole("button", { name: "Speichern" }).click();

  /**
   * The dashboard tile renders the picked page's content
   */
  const dashboardTile = sectionByHeading(page, "Dashboard");
  await dashboardTile.getByLabel("Seite").selectOption({ value: dashboard.id });
  await dashboardTile.getByRole("button", { name: "Speichern" }).click();

  /**
   * The support link resolves through its stable URL
   */
  const linkTile = sectionByHeading(page, "Verknüpfte Seiten");
  await linkTile
    .getByLabel("Support-Seite")
    .selectOption({ value: support.id });
  await linkTile.getByRole("button", { name: "Speichern" }).click();

  /**
   * Each tile stores through a form of its own, and their success toasts
   * stack — so what they stored is what gets asserted, not the toasts.
   */
  await expect
    .poll(
      async () => {
        const settings = await prisma.wikiSetting.findMany();
        return Object.fromEntries(
          settings.map((setting) => [setting.key, setting.value]),
        );
      },
      { timeout: ACTION_FEEDBACK_TIMEOUT },
    )
    .toEqual({
      featuredPages: [featured.id],
      dashboardPage: dashboard.id,
      "pageLink:support": support.id,
    });

  /** All three settings drive their surface */
  await page.goto("/app/wiki");
  await expect(
    sectionByHeading(page, "Featured").getByRole("link", {
      name: /Einsteigerguide/,
    }),
  ).toBeVisible({ timeout: ACTION_FEEDBACK_TIMEOUT });

  await page.goto("/app/dashboard");
  await expect(page.getByText("Wichtige Neuigkeiten.")).toBeVisible({
    timeout: ACTION_FEEDBACK_TIMEOUT,
  });

  await page.goto("/app/wiki/link/support");
  await expect(page).toHaveURL(`/app/wiki/${support.id}/${support.slug}`, {
    timeout: ACTION_FEEDBACK_TIMEOUT,
  });

  /** An unconfigured link key falls back to the wiki's home */
  await prisma.wikiSetting.delete({ where: { key: "pageLink:support" } });
  await page.goto("/app/wiki/link/support");
  await expect(page).toHaveURL("/app/wiki");
});

/**
 * Reserved by RFC 2606, so neither the browser nor a resolver ever reaches
 * anything: the test is about what the page renders, not about a live embed.
 */
const ALLOWED_DOMAIN = "eingebettet.invalid";
const BLOCKED_DOMAIN = "fremd.invalid";

test("the iframe allowlist decides which domains a page may embed", async ({
  page,
  prisma,
  signIn,
}) => {
  const manager = await createCitizen(prisma, {
    handle: "wiki-verwalter",
    permissionStrings: ["wiki;manage"],
  });

  await signIn(manager.user);
  await page.goto("/app/wiki/settings");
  await waitForAppShellHydration(page);

  const allowlistTile = sectionByHeading(
    page,
    "Freigegebene Domains für iframes",
  );
  await expect(
    allowlistTile.getByText("Keine Domains freigegeben."),
  ).toBeVisible();

  await allowlistTile.getByLabel("Domain hinzufügen").fill(ALLOWED_DOMAIN);
  await allowlistTile.getByRole("button", { name: "Hinzufügen" }).click();
  await expect(allowlistTile.getByText(ALLOWED_DOMAIN)).toBeVisible();

  await allowlistTile.getByRole("button", { name: "Speichern" }).click();
  await expect(page.getByText(SAVED_TEXT)).toBeVisible({
    timeout: ACTION_FEEDBACK_TIMEOUT,
  });

  await expect
    .poll(() =>
      prisma.wikiSetting.findUnique({ where: { key: "iframeAllowlist" } }),
    )
    .toMatchObject({ value: [ALLOWED_DOMAIN] });

  /**
   * What the list is for: a page embedding both domains renders only the
   * allowed one, and names the other in its place.
   */
  const embedPage = await createWikiPage(prisma, {
    title: "Eingebettetes",
    content: wikiDocument(
      wikiEmbed(`https://${ALLOWED_DOMAIN}/eingebettet`),
      wikiEmbed(`https://${BLOCKED_DOMAIN}/eingebettet`),
    ),
  });
  await page.goto(`/app/wiki/${embedPage.id}/${embedPage.slug}`);

  await expect(page.locator("iframe")).toHaveAttribute(
    "src",
    `https://${ALLOWED_DOMAIN}/eingebettet`,
  );
  await expect(
    page.getByText(
      `Eingebettete Inhalte von dieser Domain sind nicht erlaubt: https://${BLOCKED_DOMAIN}/eingebettet`,
    ),
  ).toBeVisible();

  /**
   * Removing it again empties the list — the editor keeps the whole list in
   * local state until it is stored, so this proves the round trip.
   */
  await page.goto("/app/wiki/settings");
  await waitForAppShellHydration(page);
  await allowlistTile
    .getByRole("button", { name: `"${ALLOWED_DOMAIN}" entfernen` })
    .click();
  await allowlistTile.getByRole("button", { name: "Speichern" }).click();
  await expect(page.getByText(SAVED_TEXT)).toBeVisible({
    timeout: ACTION_FEEDBACK_TIMEOUT,
  });

  await expect
    .poll(() =>
      prisma.wikiSetting.findUnique({ where: { key: "iframeAllowlist" } }),
    )
    .toMatchObject({ value: [] });
});
