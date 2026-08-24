import {
  createCitizen,
  createWikiPage,
  wikiDocument,
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
  await expect(page.getByText(SAVED_TEXT).first()).toBeVisible({
    timeout: ACTION_FEEDBACK_TIMEOUT,
  });

  /**
   * The dashboard tile renders the picked page's content
   */
  const dashboardTile = sectionByHeading(page, "Dashboard");
  await dashboardTile.getByLabel("Seite").selectOption({ value: dashboard.id });
  await dashboardTile.getByRole("button", { name: "Speichern" }).click();
  await expect(page.getByText(SAVED_TEXT).first()).toBeVisible({
    timeout: ACTION_FEEDBACK_TIMEOUT,
  });

  /**
   * The support link resolves through its stable URL
   */
  const linkTile = sectionByHeading(page, "Verknüpfte Seiten");
  await linkTile
    .getByLabel("Support-Seite")
    .selectOption({ value: support.id });
  await linkTile.getByRole("button", { name: "Speichern" }).click();
  await expect(page.getByText(SAVED_TEXT).first()).toBeVisible({
    timeout: ACTION_FEEDBACK_TIMEOUT,
  });

  /** Every tile stores through its own form, so the last one gets polled */
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

  await allowlistTile.getByLabel("Domain hinzufügen").fill("example.com");
  await allowlistTile.getByRole("button", { name: "Hinzufügen" }).click();
  await expect(allowlistTile.getByText("example.com")).toBeVisible();

  await allowlistTile.getByRole("button", { name: "Speichern" }).click();
  await expect(page.getByText(SAVED_TEXT).first()).toBeVisible({
    timeout: ACTION_FEEDBACK_TIMEOUT,
  });

  await expect
    .poll(async () => {
      const setting = await prisma.wikiSetting.findUnique({
        where: { key: "iframeAllowlist" },
      });
      return setting?.value;
    })
    .toEqual(["example.com"]);

  /**
   * Removing it again empties the list — the editor keeps the whole list in
   * local state until it is stored, so this proves the round trip.
   */
  await page.reload();
  await waitForAppShellHydration(page);
  await allowlistTile
    .getByRole("button", { name: '"example.com" entfernen' })
    .click();
  await allowlistTile.getByRole("button", { name: "Speichern" }).click();
  await expect(page.getByText(SAVED_TEXT).first()).toBeVisible({
    timeout: ACTION_FEEDBACK_TIMEOUT,
  });

  await expect
    .poll(async () => {
      const setting = await prisma.wikiSetting.findUnique({
        where: { key: "iframeAllowlist" },
      });
      return setting?.value;
    })
    .toEqual([]);
});
