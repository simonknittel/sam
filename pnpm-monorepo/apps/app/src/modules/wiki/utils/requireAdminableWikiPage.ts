import type { getTranslations } from "next-intl/server";
import { refresh } from "next/cache";
import {
  getWikiPageScopedContext,
  isWikiScopeFrozen,
  rejectFrozenWikiScope,
} from "../queries/getWikiPageScopedContext";
import { isEventWikiRootPage } from "./isEventWikiRootPage";

export type ScopedContext = NonNullable<
  Awaited<ReturnType<typeof getWikiPageScopedContext>>
>;

export type ScopedWikiPage =
  ScopedContext["context"]["pagesById"] extends Map<string, infer Page>
    ? Page
    : never;

interface Options {
  /** Restore/destroy target pages in the trash instead of live pages */
  readonly expectDeleted?: boolean;
  /** Structural changes are barred on the event wiki's locked root page */
  readonly rejectEventWikiRootPage?: boolean;
}

type RequireAdminableWikiPageResult =
  | { scoped: ScopedContext; page: ScopedWikiPage; failure?: never }
  | {
      scoped?: never;
      page?: never;
      failure: { error: string; requestPayload: FormData };
    };

/**
 * The shared guard of the wiki page-admin mutations: the page must exist in
 * the expected trash state, the current user must have admin permission on
 * it, and its scope must not be frozen (past event). Returns the scoped
 * context and page, or the error response the action should return as-is.
 * Only for server actions: the checks of the page state call `refresh()`.
 */
export const requireAdminableWikiPage = async (
  pageId: string,
  formData: FormData,
  t: Awaited<ReturnType<typeof getTranslations>>,
  options?: Options,
): Promise<RequireAdminableWikiPageResult> => {
  const badRequest = {
    error: t("Common.badRequest"),
    requestPayload: formData,
  };

  const scoped = await getWikiPageScopedContext(pageId);
  const page = scoped?.context.pagesById.get(pageId);
  if (!scoped || !page) {
    /**
     * A different user or tab deleted the page permanently before, and the
     * page must show it. A context that the viewer cannot hold gets the same
     * answer (see getWikiPageScopedContext).
     */
    refresh();

    return { failure: badRequest };
  }
  if (options?.expectDeleted ? !page.deletedAt : page.deletedAt) {
    /**
     * A different user or tab moved the page into the trash or out of it
     * before, and the page must show it
     */
    refresh();

    return { failure: badRequest };
  }

  if (!scoped.context.permissions.get(page.id)?.canAdmin)
    return {
      failure: { error: t("Common.forbidden"), requestPayload: formData },
    };

  if (isWikiScopeFrozen(scoped))
    return { failure: rejectFrozenWikiScope(formData) };

  if (options?.rejectEventWikiRootPage && isEventWikiRootPage(page))
    return { failure: badRequest };

  return { scoped, page };
};
