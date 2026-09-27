import { AuditEventType } from "@/modules/audit/utils/AuditEventTypes";
import type { authenticate } from "@/modules/auth/server";
import { Prisma } from "@sam-monorepo/database/client";
import type { getTranslations } from "next-intl/server";
import * as z from "zod";
import { buildEventWikiPageMoveReset } from "./buildEventWikiPageMoveReset";
import { buildWikiPageMoveReset } from "./buildWikiPageMoveReset";
import { collectWikiPageDescendants } from "./collectWikiPageDescendants";
import type { ScopedContext, ScopedWikiPage } from "./requireAdminableWikiPage";
import {
  resolveWikiPagePlacement,
  WikiPagePlacement,
} from "./resolveWikiPagePlacement";
import { WikiScope } from "./wikiPageHref";

type Authentication = NonNullable<
  Exclude<Awaited<ReturnType<typeof authenticate>>, false>
>;

/**
 * The reparent rules shared by moveWikiPage and updateWikiPagePosition: a
 * page adopting a new parent must land on an adminable target without
 * creating a cycle; moving to the top level is barred in event wikis and
 * requires the global wiki create permission. Returns the error response
 * the action should return as-is, or null when the reparent is allowed.
 */
export const validateWikiPageReparent = async (
  scoped: ScopedContext,
  page: ScopedWikiPage,
  newParentId: string | null,
  authentication: Authentication,
  formData: FormData,
  t: Awaited<ReturnType<typeof getTranslations>>,
) => {
  const context = scoped.context;

  if (newParentId) {
    const placement = resolveWikiPagePlacement(context, newParentId);
    if (placement !== WikiPagePlacement.Allowed)
      return {
        error:
          placement === WikiPagePlacement.Missing
            ? t("Common.badRequest")
            : t("Common.forbidden"),
        requestPayload: formData,
      };

    /**
     * Prevent cycles: the new parent must not be the page itself or one of
     * its descendants.
     */
    if (
      newParentId === page.id ||
      collectWikiPageDescendants(context.pages, page.id).includes(newParentId)
    )
      return { error: t("Common.badRequest"), requestPayload: formData };
  } else {
    /** Event wikis have exactly one top-level page: the locked root */
    if (scoped.scope === WikiScope.Event)
      return { error: t("Common.badRequest"), requestPayload: formData };
    if (!(await authentication.authorize("wiki", "create")))
      return { error: t("Common.forbidden"), requestPayload: formData };
  }

  return null;
};

/** SQLSTATE `check_violation` */
const CHECK_VIOLATION_CODE = "23514";

/**
 * Prisma reports a database error without its own Prisma code as a known
 * request error and keeps the SQLSTATE in the error of the driver adapter.
 */
const checkViolationMetaSchema = z.object({
  modelName: z.literal("WikiPage"),
  driverAdapterError: z.object({
    cause: z.object({ originalCode: z.literal(CHECK_VIOLATION_CODE) }),
  }),
});

export const WIKI_PAGE_TREE_CHANGED_ERROR =
  "Die Seite kann nicht dorthin verschoben werden, weil sich die Seitenstruktur in der Zwischenzeit geändert hat. Bitte lade die Seite neu und versuche es erneut.";

/**
 * True when the database refused a reparent (see WikiPage.parentId and
 * WikiPage.visibility). The checks of validateWikiPageReparent use a context
 * that can be out of date: when a different move changes the tree at the
 * same time, only the database sees the cycle. A move does not change the
 * namespace or the container, thus a check violation on a page during a move
 * always comes from the rules of the page tree.
 */
export const isWikiPageReparentRefused = (error: unknown) =>
  error instanceof Prisma.PrismaClientKnownRequestError &&
  checkViolationMetaSchema.safeParse(error.meta).success;

/**
 * A moved page and its subtree take the permissions of their new place —
 * the same reset on both reparent paths. Run the statements before the
 * update that sets the new parent: the database allows PUBLIC only on a
 * top-level page, and the reset removes PUBLIC from a page that gets a
 * parent.
 */
export const buildWikiPageReparentReset = (
  scoped: ScopedContext,
  page: ScopedWikiPage,
  newParentId: string | null,
  updatedById: string | null,
) =>
  scoped.scope === WikiScope.Event
    ? buildEventWikiPageMoveReset(scoped.context.allPages, page.id)
    : buildWikiPageMoveReset(
        scoped.context.allPages,
        scoped.context.pagesById.get(page.id)!,
        newParentId,
        updatedById,
      );

/**
 * The move audit event plus one permission-reset event per page in the
 * moved subtree.
 */
export const buildWikiPageReparentAuditEvents = (
  page: ScopedWikiPage,
  newParentId: string | null,
  subtreeIds: string[],
  createdById: string,
) => [
  {
    type: AuditEventType.WIKI_PAGE_MOVED as const,
    data: {
      pageId: page.id,
      eventId: page.eventId ?? undefined,
      previousParentId: page.parentId,
      newParentId,
    },
    createdById,
  },
  ...subtreeIds.map((id) => ({
    type: AuditEventType.WIKI_PAGE_PERMISSIONS_RESET_BY_MOVE as const,
    data: {
      pageId: id,
      eventId: page.eventId ?? undefined,
      movedPageId: page.id,
      newParentId,
    },
    createdById,
  })),
];
