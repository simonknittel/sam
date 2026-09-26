import type { Locator, Page } from "@playwright/test";
import type { PrismaClient } from "@sam-monorepo/database/client";
import { createCitizen, type Citizen } from "../fixtures/factories";
import {
  ACTION_FEEDBACK_TIMEOUT,
  clickUntilVisible,
  fillUntilVisible,
  modal,
  waitForAppShellHydration,
} from "../fixtures/interactions";
import { expect, test } from "../fixtures/test";

/**
 * The trigram similarity between the query of a test and each row that must
 * not match is below the typo threshold of the search. Thus the typo
 * tolerance cannot add a row that a test does not expect.
 */

const NO_RESULTS_TEXT = "Keine Ergebnisse";

const tileInput = (page: Page) =>
  page.getByRole("combobox", { name: "Spynet durchsuchen" });

/** The popup of the tile is in a portal, thus the hits are not in the tile */
const tileHits = (page: Page) => page.getByRole("listbox").getByRole("option");

/** Each hit shows the internal ID of its citizen or organization */
const hitOf = (scope: Page | Locator, id: string) =>
  scope.getByRole("option").filter({ hasText: `Internal ID: ${id}` });

/**
 * Each search starts with a new page load. While a request runs, the tile
 * keeps the hits of the previous query. Thus on the same page, an assertion
 * could pass on the hits of the previous query.
 */
const searchInTile = async (page: Page, query: string, reaction: Locator) => {
  await page.goto("/app/dashboard");
  await fillUntilVisible(tileInput(page), query, reaction);
};

/** The request of the tRPC client without a batch, with a superjson input */
const requestSearch = (page: Page, query: string) =>
  page.request.get("/api/trpc/spynet.search", {
    params: new URLSearchParams({ input: JSON.stringify({ json: { query } }) }),
  });

const createOrganization = (
  prisma: PrismaClient,
  creator: Citizen,
  name: string,
  spectrumId: string,
) =>
  prisma.organization.create({
    data: { name, spectrumId, createdById: creator.entity.id },
  });

test("the tile finds a citizen by a part of the handle and opens the citizen", async ({
  page,
  prisma,
  signIn,
}) => {
  const viewer = await createCitizen(prisma, {
    handle: "spynet-leser",
    permissionStrings: ["citizen;read"],
  });
  const target = await createCitizen(prisma, { handle: "wanderfalke" });
  await createCitizen(prisma, { handle: "eisvogel" });

  await signIn(viewer.user);
  await searchInTile(page, "derfal", hitOf(page, target.entity.id));
  await expect(tileHits(page)).toHaveCount(1);

  await hitOf(page, target.entity.id).click();

  await expect(page.getByRole("heading", { name: "wanderfalke" })).toBeVisible({
    timeout: ACTION_FEEDBACK_TIMEOUT,
  });
  await expect(page).toHaveURL(`/app/spynet/citizen/${target.entity.id}`);
});

test("the search finds a handle and an organization name with one wrong letter", async ({
  page,
  prisma,
  signIn,
}) => {
  const viewer = await createCitizen(prisma, {
    handle: "spynet-leser",
    permissionStrings: ["citizen;read", "organization;read"],
  });
  const target = await createCitizen(prisma, { handle: "kopernikus" });
  await createCitizen(prisma, { handle: "blaumeise" });
  /** A Spectrum ID does not tolerate typos, thus only the name can match */
  const organization = await createOrganization(
    prisma,
    viewer,
    "Sternwacht Kollektiv",
    "STWK",
  );

  await signIn(viewer.user);

  await searchInTile(page, "koperlikus", hitOf(page, target.entity.id));
  await expect(tileHits(page)).toHaveCount(1);

  await searchInTile(page, "Sterlwacht", hitOf(page, organization.id));
  await expect(tileHits(page)).toHaveCount(1);
});

test("the arrow keys and Enter open an organization from the tile", async ({
  page,
  prisma,
  signIn,
}) => {
  const viewer = await createCitizen(prisma, {
    handle: "spynet-leser",
    permissionStrings: [
      "citizen;read",
      "organization;read",
      /**
       * Without this permission, the memberships tile makes the full
       * organization page forbidden
       */
      "organizationMembership;read",
    ],
  });
  const citizen = await createCitizen(prisma, { handle: "sirius" });
  const organization = await createOrganization(
    prisma,
    viewer,
    "Sirius Kartell",
    "SIRIUSKARTELL",
  );

  await signIn(viewer.user);
  await searchInTile(page, "sirius", hitOf(page, organization.id));

  /** The exact handle ranks above the prefix of the name */
  await expect(tileHits(page)).toHaveCount(2);
  await expect(tileHits(page).first()).toContainText(citizen.entity.id);

  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("ArrowDown");
  await expect(hitOf(page, organization.id)).toHaveAttribute(
    "data-highlighted",
  );
  await page.keyboard.press("Enter");

  /** The Algolia tile opened the citizen page with the organization ID */
  await expect(
    page.getByRole("heading", { name: "Sirius Kartell" }),
  ).toBeVisible({ timeout: ACTION_FEEDBACK_TIMEOUT });
  await expect(page).toHaveURL(`/app/spynet/organization/${organization.id}`);
});

test("the search finds the latest confirmed handle without an index sync", async ({
  page,
  prisma,
  signIn,
}) => {
  const viewer = await createCitizen(prisma, {
    handle: "spynet-pruefer",
    permissionStrings: [
      "citizen;read",
      "handle;create",
      "handle;read",
      "handle;confirm",
    ],
  });
  const target = await createCitizen(prisma, { handle: "kopernikus" });

  await signIn(viewer.user);
  await page.goto(`/app/spynet/citizen/${target.entity.id}`);

  const historyDialog = modal(page, "Handle History");
  await clickUntilVisible(
    page.getByRole("button", { name: "Handle History" }),
    historyDialog,
  );

  for (const content of ["galileo", "tychobrahe"]) {
    await historyDialog.getByPlaceholder("Neuer Eintrag ...").fill(content);
    await historyDialog.getByRole("button", { name: "Speichern" }).click();
    await expect(historyDialog.getByText(content, { exact: true })).toBeVisible(
      { timeout: ACTION_FEEDBACK_TIMEOUT },
    );
  }

  const confirmedEntry = historyDialog
    .getByRole("listitem")
    .filter({ hasText: "galileo" });
  await confirmedEntry.getByRole("button", { name: "Bestätigen" }).click();
  await expect(confirmedEntry.getByText("Unbestätigt")).toHaveCount(0, {
    timeout: ACTION_FEEDBACK_TIMEOUT,
  });

  await searchInTile(page, "galileo", hitOf(page, target.entity.id));
  await expect(tileHits(page)).toHaveCount(1);

  for (const query of ["kopernikus", "tychobrahe"]) {
    await searchInTile(page, query, page.getByText(NO_RESULTS_TEXT));
  }
});

test.describe("permissions", () => {
  const MATCHING_QUERY = "merkur";

  /** A citizen and an organization which both match the same query */
  const createMatchingCitizenAndOrganization = async (
    prisma: PrismaClient,
    creator: Citizen,
  ) => ({
    citizen: await createCitizen(prisma, { handle: "merkurlotse" }),
    organization: await createOrganization(
      prisma,
      creator,
      "Merkur Handelsgilde",
      "MERKURGILDE",
    ),
  });

  test("a viewer with only citizen;read gets no organizations", async ({
    page,
    prisma,
    signIn,
  }) => {
    const viewer = await createCitizen(prisma, {
      handle: "nur-citizens",
      permissionStrings: ["citizen;read"],
    });
    const { citizen } = await createMatchingCitizenAndOrganization(
      prisma,
      viewer,
    );

    await signIn(viewer.user);
    await searchInTile(page, MATCHING_QUERY, hitOf(page, citizen.entity.id));
    await expect(tileHits(page)).toHaveCount(1);

    /**
     * This makes sure that the request gets to the procedure. The test for a
     * viewer with neither permission sends the same request.
     */
    const response = await requestSearch(page, MATCHING_QUERY);
    expect(response.status()).toBe(200);
    expect(await response.json()).toEqual({
      result: {
        data: {
          json: [expect.objectContaining({ id: citizen.entity.id })],
        },
      },
    });
  });

  test("a viewer with only organization;read gets no citizens", async ({
    page,
    prisma,
    signIn,
  }) => {
    const viewer = await createCitizen(prisma, {
      handle: "nur-organisationen",
      permissionStrings: ["organization;read"],
    });
    const { organization } = await createMatchingCitizenAndOrganization(
      prisma,
      viewer,
    );

    await signIn(viewer.user);
    await searchInTile(page, MATCHING_QUERY, hitOf(page, organization.id));
    await expect(tileHits(page)).toHaveCount(1);
  });

  test("a viewer with neither permission has no tile and gets no hits", async ({
    page,
    prisma,
    signIn,
  }) => {
    const viewer = await createCitizen(prisma, { handle: "ohne-spynet" });
    await createMatchingCitizenAndOrganization(prisma, viewer);

    await signIn(viewer.user);
    await page.goto("/app/dashboard");

    /** The heading and the tile render in the same server response */
    await expect(
      page.getByRole("heading", { name: "Spynet", exact: true }),
    ).toBeVisible();
    await expect(tileInput(page)).toHaveCount(0);

    const response = await requestSearch(page, MATCHING_QUERY);
    expect(response.status()).toBe(200);
    expect(await response.json()).toEqual({ result: { data: { json: [] } } });
  });
});

test("the wildcards of a LIKE pattern match only literally", async ({
  page,
  prisma,
  signIn,
}) => {
  const viewer = await createCitizen(prisma, {
    handle: "spynet-leser",
    permissionStrings: ["citizen;read", "organization;read"],
  });
  await createCitizen(prisma, { handle: "wanderfalke" });
  await createCitizen(prisma, { handle: "eisvogel" });
  await createOrganization(prisma, viewer, "Sternwacht Kollektiv", "STWK");

  await signIn(viewer.user);

  /** Without the escape, each of these queries matches all rows */
  for (const query of ["%%", "__"]) {
    await searchInTile(page, query, page.getByText(NO_RESULTS_TEXT));
  }
});

test("the Cmd+K search opens a citizen", async ({ page, prisma, signIn }) => {
  const viewer = await createCitizen(prisma, {
    handle: "spynet-leser",
    permissionStrings: ["citizen;read"],
  });
  const target = await createCitizen(prisma, { handle: "wanderfalke" });
  await createCitizen(prisma, { handle: "eisvogel" });

  await signIn(viewer.user);
  await page.goto("/app/dashboard");
  /** The shortcut listener is only available after the hydration */
  await waitForAppShellHydration(page);

  const dialog = page.getByRole("dialog", { name: "Navigation" });
  await page.keyboard.press("ControlOrMeta+k");
  await expect(dialog).toBeVisible({ timeout: ACTION_FEEDBACK_TIMEOUT });

  await dialog.getByRole("option", { name: "Spynet", exact: true }).click();
  await dialog.getByRole("option", { name: /^Profil suchen/ }).click();
  await expect(dialog.getByText("Mindestens 2 Zeichen eingeben")).toBeVisible();

  await fillUntilVisible(
    dialog.getByPlaceholder("Suche ..."),
    "anderf",
    hitOf(dialog, target.entity.id),
  );
  await expect(dialog.getByRole("option")).toHaveCount(1);
  await expect(hitOf(dialog, target.entity.id)).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await page.keyboard.press("Enter");

  await expect(page.getByRole("heading", { name: "wanderfalke" })).toBeVisible({
    timeout: ACTION_FEEDBACK_TIMEOUT,
  });
  await expect(page).toHaveURL(`/app/spynet/citizen/${target.entity.id}`);
});
