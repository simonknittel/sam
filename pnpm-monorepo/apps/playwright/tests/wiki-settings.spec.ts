import type { Page } from "@playwright/test";
import {
  createCitizen,
  createWikiPage,
  setWikiFeaturedPages,
  WIKI_SETTING_FEATURED_PAGES,
  wikiDocument,
  wikiEmbed,
  WikiPageVisibility,
  wikiParagraph,
} from "../fixtures/factories";
import {
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
    .poll(async () => {
      const settings = await prisma.wikiSetting.findMany();
      return Object.fromEntries(
        settings.map((setting) => [setting.key, setting.value]),
      );
    })
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
  ).toBeVisible();

  await page.goto("/app/dashboard");
  await expect(page.getByText("Wichtige Neuigkeiten.")).toBeVisible();

  await page.goto("/app/wiki/link/support");
  await expect(page).toHaveURL(`/app/wiki/${support.id}/${support.slug}`);

  /** An unconfigured link key falls back to the wiki's home */
  await prisma.wikiSetting.delete({ where: { key: "pageLink:support" } });
  await page.goto("/app/wiki/link/support");
  await expect(page).toHaveURL("/app/wiki");
});

const featuredPageHandle = (page: Page, title: string) =>
  sectionByHeading(page, "Featured Seiten").getByRole("button", {
    name: `"${title}" verschieben`,
  });

/**
 * dnd-kit tells each step of a drag in an aria-live region. The next key
 * must wait until the text changes, because a key before the library
 * processed the previous key does not move the row.
 */
const dragNarration = async (page: Page) =>
  (await page.getByRole("status").allTextContents()).join(" ");

/** Moves the first page below the second page with the keyboard */
const reorderByKeyboard = async (page: Page) => {
  await featuredPageHandle(page, "Einsteigerguide").focus();

  await page.keyboard.press("Space");
  await expect.poll(() => dragNarration(page)).toContain("Draggable item");
  const afterPickup = await dragNarration(page);

  await page.keyboard.press("ArrowDown");
  await expect.poll(() => dragNarration(page)).not.toBe(afterPickup);

  await page.keyboard.press("Space");
};

/** The same move with the mouse */
const reorderByMouse = async (page: Page) => {
  const sourceBox = (await featuredPageHandle(
    page,
    "Einsteigerguide",
  ).boundingBox())!;
  const targetBox = (await featuredPageHandle(
    page,
    "Regelwerk",
  ).boundingBox())!;

  await page.mouse.move(
    sourceBox.x + sourceBox.width / 2,
    sourceBox.y + sourceBox.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(
    targetBox.x + targetBox.width / 2,
    targetBox.y + targetBox.height,
    { steps: 10 },
  );
  await page.mouse.up();
};

/**
 * The same move with a finger. Playwright has no touch drag, thus the
 * gesture goes through the Chrome DevTools Protocol. If the browser scrolls
 * the page instead, it cancels the drag and the order does not change.
 */
const reorderByTouch = async (page: Page) => {
  const sourceBox = (await featuredPageHandle(
    page,
    "Einsteigerguide",
  ).boundingBox())!;
  const targetBox = (await featuredPageHandle(
    page,
    "Regelwerk",
  ).boundingBox())!;
  const pointerX = sourceBox.x + sourceBox.width / 2;
  const startY = sourceBox.y + sourceBox.height / 2;
  const endY = targetBox.y + targetBox.height;

  const session = await page.context().newCDPSession(page);
  await session.send("Emulation.setTouchEmulationEnabled", { enabled: true });
  await session.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x: pointerX, y: startY }],
  });
  const stepCount = 10;
  for (let step = 1; step <= stepCount; step++) {
    await session.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [
        { x: pointerX, y: startY + ((endY - startY) * step) / stepCount },
      ],
    });
  }
  await session.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
};

const REORDER_GESTURES = [
  { name: "keyboard", drag: reorderByKeyboard },
  { name: "mouse", drag: reorderByMouse },
  { name: "touch", drag: reorderByTouch },
] as const;

for (const { name, drag } of REORDER_GESTURES) {
  test(`reordering the featured pages by ${name} changes the stored order`, async ({
    page,
    prisma,
    signIn,
  }) => {
    const manager = await createCitizen(prisma, {
      handle: "wiki-verwalter",
      permissionStrings: ["wiki;manage"],
    });
    const first = await createWikiPage(prisma, {
      title: "Einsteigerguide",
      visibility: WikiPageVisibility.PUBLIC,
    });
    const second = await createWikiPage(prisma, {
      title: "Regelwerk",
      visibility: WikiPageVisibility.PUBLIC,
    });
    await setWikiFeaturedPages(prisma, [first.id, second.id]);

    const hydrationErrors: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error" && /hydrat/i.test(message.text())) {
        hydrationErrors.push(message.text());
      }
    });

    await signIn(manager.user);
    await page.goto("/app/wiki/settings");
    await waitForAppShellHydration(page);

    await drag(page);

    const featuredTile = sectionByHeading(page, "Featured Seiten");
    await expect(featuredTile.getByRole("listitem")).toHaveText([
      "Regelwerk",
      "Einsteigerguide",
    ]);

    await featuredTile.getByRole("button", { name: "Speichern" }).click();
    await expect(page.getByText(SAVED_TEXT)).toBeVisible();
    await expect
      .poll(() =>
        prisma.wikiSetting.findUnique({
          where: { key: WIKI_SETTING_FEATURED_PAGES },
        }),
      )
      .toMatchObject({ value: [second.id, first.id] });

    /**
     * Without a fixed id, the drag and drop context of the second server
     * render does not agree with the browser (see FlowsTableClient).
     */
    await page.reload();
    await waitForAppShellHydration(page);
    await expect(featuredTile.getByRole("listitem")).toHaveText([
      "Regelwerk",
      "Einsteigerguide",
    ]);
    expect(hydrationErrors).toEqual([]);
  });
}

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
  await expect(page.getByText(SAVED_TEXT)).toBeVisible();

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
  await expect(page.getByText(SAVED_TEXT)).toBeVisible();

  await expect
    .poll(() =>
      prisma.wikiSetting.findUnique({ where: { key: "iframeAllowlist" } }),
    )
    .toMatchObject({ value: [] });
});
