import { Prisma } from "@sam-monorepo/database/client";
import {
  AuditEventType,
  collectWikiPageDescendants,
  WikiScopeKind,
  type AuditEventInput,
} from "@sam-monorepo/domain";
import * as z from "zod";
import { requirePermission, type Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";
import {
  ConflictError,
  ForbiddenError,
  rethrowRecordNotFound,
  ValidationError,
} from "../errors.js";
import { WikiErrorMessage } from "./wikiErrors.js";
import {
  resolveWikiPagePlacement,
  WikiPagePlacement,
} from "./wikiPagePlacement.js";
import type { WikiPageScope } from "./wikiScope.js";

/**
 * The reparent rules of a move and of a drop in the sidebar tree: a page
 * that gets a new parent must land on a page that the actor manages, without
 * a cycle. A briefing has no top level to move to, and the top level of the
 * global wiki takes `wiki;create`.
 *
 * @throws ValidationError when the new parent is the page itself, or for the
 * top level of a briefing
 * @throws ConflictError when the new parent is gone or is a descendant of
 * the page: the dialogs do not offer them, thus a different user or tab
 * changed the tree before
 * @throws ForbiddenError when the actor does not manage the new parent, or
 * cannot create a page at the top level
 */
export const requireWikiPageReparent = (
  actor: Actor,
  scope: WikiPageScope,
  page: { readonly id: string },
  newParentId: string | null,
) => {
  if (newParentId === null) {
    if (scope.kind === WikiScopeKind.Briefing)
      throw new ValidationError("A briefing has no top level");

    requirePermission(actor, "wiki", "create");
    return;
  }

  if (newParentId === page.id)
    throw new ValidationError("A page cannot be its own parent");

  const placement = resolveWikiPagePlacement(scope, newParentId);
  switch (placement) {
    case WikiPagePlacement.Missing:
      throw new ConflictError(WikiErrorMessage.PageTreeChanged);

    case WikiPagePlacement.Forbidden:
      throw new ForbiddenError("The user does not manage the new parent page");

    case WikiPagePlacement.Allowed:
      break;

    default:
      throw new Error(
        `Unknown wiki page placement: ${placement satisfies never}`,
      );
  }

  if (collectWikiPageDescendants(scope.pages, page.id).includes(newParentId))
    throw new ConflictError(WikiErrorMessage.PageTreeChanged);
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

/**
 * True when the database refused a reparent (see WikiPage.parentId and
 * WikiPage.visibility). The checks of `requireWikiPageReparent()` use a
 * scope that can be out of date: when a different move changes the tree at
 * the same time, only the database sees the cycle. A move does not change
 * the namespace or the container, thus a check violation on a page during a
 * move always comes from the rules of the page tree.
 */
const isWikiPageReparentRefused = (error: unknown) =>
  error instanceof Prisma.PrismaClientKnownRequestError &&
  checkViolationMetaSchema.safeParse(error.meta).success;

/**
 * Runs the statements of a change of the page tree (a move or a new sort
 * order of siblings) in one batch. The first statement takes the transaction
 * lock of the page tree. The trigger `WikiPage_check_parent_update` takes the
 * same lock when a page gets a new parent: when the lock comes only from the
 * trigger after the first updates of the siblings, two moves can wait for
 * each other. An insert (a new, a copied or a pasted page) does not take the
 * lock: its trigger checks the parent of a new row without it.
 *
 * @throws NotFoundError when a page of the statements is gone
 * @throws ConflictError when the database refused a reparent
 */
export const runWikiPageTreeBatch = (
  context: Pick<ApplicationContext, "prisma">,
  statements: readonly Prisma.PrismaPromise<unknown>[],
) =>
  rethrowRecordNotFound(async () => {
    try {
      await context.prisma.$transaction([
        context.prisma
          .$executeRaw`SELECT pg_advisory_xact_lock(hashtext('WikiPage_hierarchy'))`,
        ...statements,
      ]);
    } catch (error) {
      if (isWikiPageReparentRefused(error))
        throw new ConflictError(WikiErrorMessage.PageTreeChanged, {
          cause: error,
        });

      throw error;
    }
  }, WikiErrorMessage.PageNotFound);

/**
 * The move audit event plus one permission-reset event per page in the
 * moved subtree
 */
export const buildWikiPageReparentAuditEvents = (
  page: {
    readonly id: string;
    readonly parentId: string | null;
    readonly eventId: string | null;
  },
  newParentId: string | null,
  subtreeIds: readonly string[],
  createdById: string,
): AuditEventInput[] => [
  {
    type: AuditEventType.WIKI_PAGE_MOVED,
    data: {
      pageId: page.id,
      eventId: page.eventId ?? undefined,
      previousParentId: page.parentId,
      newParentId,
    },
    createdById,
  },
  ...subtreeIds.map((id): AuditEventInput => ({
    type: AuditEventType.WIKI_PAGE_PERMISSIONS_RESET_BY_MOVE,
    data: {
      pageId: id,
      eventId: page.eventId ?? undefined,
      movedPageId: page.id,
      newParentId,
    },
    createdById,
  })),
];
