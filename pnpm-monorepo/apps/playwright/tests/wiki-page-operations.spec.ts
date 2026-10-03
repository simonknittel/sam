import type { PrismaClient } from "@sam-monorepo/database/client";
import {
  createCitizen,
  createWikiPage,
  wikiDocument,
  WikiPageVisibility,
  wikiParagraph,
} from "../fixtures/factories";
import {
  ACTION_FEEDBACK_TIMEOUT,
  clickUntilVisible,
  inlineEditorTrigger,
  modal,
  saveInlineEditor,
} from "../fixtures/interactions";
import { expect, test } from "../fixtures/test";

/** The transactions that wait for an advisory lock, for example the tree lock */
const countWaitingAdvisoryLocks = async (prisma: PrismaClient) => {
  const waitingLocks = await prisma.$queryRaw<{ count: number }[]>`
    SELECT count(*)::int AS "count"
    FROM pg_locks
    WHERE "locktype" = 'advisory'
      AND NOT "granted"
      AND "database" = (SELECT "oid" FROM pg_database WHERE "datname" = current_database())
  `;
  return waitingLocks[0]?.count;
};

test("a page is renamed, which moves it to a new URL, and moved to a new parent", async ({
  page,
  prisma,
  signIn,
}) => {
  const manager = await createCitizen(prisma, {
    handle: "wiki-verwalter",
    permissionStrings: ["wiki;manage"],
  });
  const target = await createWikiPage(prisma, {
    title: "Zielbereich",
    visibility: WikiPageVisibility.PUBLIC,
  });
  const wikiPage = await createWikiPage(prisma, {
    title: "Alter Titel",
    visibility: WikiPageVisibility.PUBLIC,
    content: wikiDocument(wikiParagraph("Bleibt beim Umzug erhalten.")),
  });

  await signIn(manager.user);
  await page.goto(`/app/wiki/${wikiPage.id}/${wikiPage.slug}`);

  /**
   * Rename — the slug follows the title, and the old URL redirects to the
   * new one because a page is resolved by its id.
   */
  const titleInput = page.locator('input[name="title"]');
  await clickUntilVisible(
    inlineEditorTrigger(page.getByRole("heading", { level: 1 })),
    titleInput,
  );
  await titleInput.fill("Neuer Titel");
  await saveInlineEditor(page);

  await expect
    .poll(() =>
      prisma.wikiPage.findUniqueOrThrow({
        where: { id: wikiPage.id },
        select: { title: true, slug: true },
      }),
    )
    .toEqual({ title: "Neuer Titel", slug: "neuer-titel" });

  await page.goto(`/app/wiki/${wikiPage.id}/${wikiPage.slug}`);
  await expect(page).toHaveURL(`/app/wiki/${wikiPage.id}/neuer-titel`);
  await expect(page.getByText("Bleibt beim Umzug erhalten.")).toBeVisible();

  /**
   * Move it under another page
   */
  const moveDialog = modal(page, "Seite verschieben");
  /** exact — the sidebar tree's drag handles carry a longer variant */
  await clickUntilVisible(
    page.getByRole("button", { name: "Seite verschieben", exact: true }),
    moveDialog,
  );
  await moveDialog.locator('select[name="newParentId"]').selectOption({
    value: target.id,
  });
  await moveDialog.getByRole("button", { name: "Verschieben" }).click();

  /** A public page gives up PUBLIC below a parent, see WikiPage.visibility */
  await expect
    .poll(() =>
      prisma.wikiPage.findUniqueOrThrow({
        where: { id: wikiPage.id },
        select: { parentId: true, visibility: true },
      }),
    )
    .toEqual({ parentId: target.id, visibility: WikiPageVisibility.INHERIT });

  // The sidebar tree now reaches it through its new parent
  await page.goto(`/app/wiki/${target.id}/${target.slug}`);
  await expect(page.getByRole("link", { name: "Neuer Titel" })).toBeVisible();
});

test("two moves at the same time cannot put a page below itself", async ({
  page,
  prisma,
  signIn,
}) => {
  const manager = await createCitizen(prisma, {
    handle: "wiki-verwalter",
    permissionStrings: ["wiki;manage"],
  });
  const first = await createWikiPage(prisma, {
    title: "Erste Seite",
    visibility: WikiPageVisibility.PUBLIC,
  });
  const second = await createWikiPage(prisma, {
    title: "Zweite Seite",
    visibility: WikiPageVisibility.PUBLIC,
  });

  await signIn(manager.user);
  await page.goto(`/app/wiki/${first.id}/${first.slug}`);

  const moveDialog = modal(page, "Seite verschieben");
  /** exact — the sidebar tree's drag handles carry a longer variant */
  await clickUntilVisible(
    page.getByRole("button", { name: "Seite verschieben", exact: true }),
    moveDialog,
  );
  await moveDialog.locator('select[name="newParentId"]').selectOption({
    value: second.id,
  });

  /**
   * A different manager moves the second page below the first page at the
   * same time. The update takes the lock of the page tree (see the trigger
   * WikiPage_check_parent), and the transaction keeps it until the test
   * commits. The order is then certain: the move of the dialog passes the
   * checks of the app, waits for the lock and sees the parallel move only
   * after it.
   */
  const { promise: parallelMoveCanCommit, resolve: commitParallelMove } =
    Promise.withResolvers<void>();
  const parallelMove = prisma.$transaction(
    async (transaction) => {
      await transaction.wikiPage.update({
        where: { id: second.id },
        data: { parentId: first.id, visibility: WikiPageVisibility.INHERIT },
      });
      await parallelMoveCanCommit;
    },
    /** Longer than the click and the poll below, which wait for the lock */
    { timeout: ACTION_FEEDBACK_TIMEOUT * 2 },
  );

  try {
    await moveDialog.getByRole("button", { name: "Verschieben" }).click();
    await expect.poll(() => countWaitingAdvisoryLocks(prisma)).toBe(1);
  } finally {
    commitParallelMove();
    await parallelMove;
  }

  await expect(
    moveDialog.getByText(
      "Die Seite kann nicht dorthin verschoben werden, weil sich die Seitenstruktur in der Zwischenzeit geändert hat.",
      { exact: false },
    ),
  ).toBeVisible();

  /** Only the parallel move is done: the tree has no cycle */
  expect(
    await prisma.wikiPage.findMany({
      where: { id: { in: [first.id, second.id] } },
      select: { id: true, parentId: true },
      orderBy: { title: "asc" },
    }),
  ).toEqual([
    { id: first.id, parentId: null },
    { id: second.id, parentId: first.id },
  ]);
});

test("a move waits for the tree lock before it changes a row", async ({
  page,
  prisma,
  signIn,
}) => {
  const manager = await createCitizen(prisma, {
    handle: "wiki-verwalter",
    permissionStrings: ["wiki;manage"],
  });
  const target = await createWikiPage(prisma, {
    title: "Zielbereich",
    visibility: WikiPageVisibility.PUBLIC,
  });
  const first = await createWikiPage(prisma, {
    title: "Erste Seite",
    visibility: WikiPageVisibility.PUBLIC,
  });
  const second = await createWikiPage(prisma, {
    title: "Zweite Seite",
    visibility: WikiPageVisibility.PUBLIC,
  });

  await signIn(manager.user);
  await page.goto(`/app/wiki/${first.id}/${first.slug}`);

  const moveDialog = modal(page, "Seite verschieben");
  /** exact — the sidebar tree's drag handles carry a longer variant */
  await clickUntilVisible(
    page.getByRole("button", { name: "Seite verschieben", exact: true }),
    moveDialog,
  );
  await moveDialog.locator('select[name="newParentId"]').selectOption({
    value: target.id,
  });

  /**
   * A different move holds the tree lock and then changes the row of the
   * page in the dialog, as a new sort order of the siblings does. The move
   * of the dialog takes the tree lock first, thus it has no row yet that the
   * parallel move waits for. When the lock comes only from the trigger, the
   * dialog holds the row of its page already, and the two moves deadlock.
   */
  const { promise: parallelMoveCanContinue, resolve: continueParallelMove } =
    Promise.withResolvers<void>();
  const parallelMove = prisma.$transaction(
    async (transaction) => {
      await transaction.wikiPage.update({
        where: { id: second.id },
        data: { parentId: target.id, visibility: WikiPageVisibility.INHERIT },
      });
      await parallelMoveCanContinue;
      await transaction.wikiPage.update({
        where: { id: first.id },
        data: { sortOrder: 1 },
      });
    },
    /** Longer than the click and the poll below, which wait for the lock */
    { timeout: ACTION_FEEDBACK_TIMEOUT * 2 },
  );

  try {
    await moveDialog.getByRole("button", { name: "Verschieben" }).click();
    await expect.poll(() => countWaitingAdvisoryLocks(prisma)).toBe(1);
  } finally {
    continueParallelMove();
    await parallelMove;
  }

  /** Both moves are done */
  await expect
    .poll(() =>
      prisma.wikiPage.findMany({
        where: { id: { in: [first.id, second.id] } },
        select: { id: true, parentId: true },
        orderBy: { title: "asc" },
      }),
    )
    .toEqual([
      { id: first.id, parentId: target.id },
      { id: second.id, parentId: target.id },
    ]);
});

test("a favorited page shows up in the sidebar's favorites", async ({
  page,
  prisma,
  signIn,
}) => {
  const citizen = await createCitizen(prisma, { handle: "wiki-leser" });
  const wikiPage = await createWikiPage(prisma, {
    title: "Merkzettel",
    visibility: WikiPageVisibility.PUBLIC,
  });

  await signIn(citizen.user);
  await page.goto(`/app/wiki/${wikiPage.id}/${wikiPage.slug}`);
  await expect(page.getByText("Du hast bisher keine Favoriten.")).toBeVisible();

  await clickUntilVisible(
    page.getByRole("button", { name: "Als Favorit speichern" }),
    page.getByRole("button", { name: "Favorit entfernen" }),
  );

  await expect
    .poll(() =>
      prisma.wikiPageFavorite.count({
        where: { pageId: wikiPage.id, citizenId: citizen.entity.id },
      }),
    )
    .toBe(1);

  /**
   * The sidebar now links the page twice: once in the tree, once under the
   * favourites panel that replaced its empty state.
   */
  await expect(page.getByText("Du hast bisher keine Favoriten.")).toHaveCount(
    0,
  );
  await expect(page.getByRole("link", { name: "Merkzettel" })).toHaveCount(2);

  /** Un-favoriting empties the panel again */
  await page.getByRole("button", { name: "Favorit entfernen" }).click();
  await expect(page.getByText("Du hast bisher keine Favoriten.")).toBeVisible();
  await expect
    .poll(() =>
      prisma.wikiPageFavorite.count({ where: { pageId: wikiPage.id } }),
    )
    .toBe(0);
});
