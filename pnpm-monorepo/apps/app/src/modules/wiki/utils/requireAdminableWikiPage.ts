import type { getTranslations } from "next-intl/server";
import {
  getWikiPageScopedContext,
  isWikiScopeFrozen,
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
  if (!scoped) return { failure: badRequest };

  const page = scoped.context.pagesById.get(pageId);
  if (!page) return { failure: badRequest };
  if (options?.expectDeleted ? !page.deletedAt : page.deletedAt)
    return { failure: badRequest };

  if (!scoped.context.permissions.get(page.id)?.canAdmin)
    return {
      failure: { error: t("Common.forbidden"), requestPayload: formData },
    };

  if (isWikiScopeFrozen(scoped))
    return {
      failure: {
        error: "Das Event ist bereits vorbei.",
        requestPayload: formData,
      },
    };

  if (options?.rejectEventWikiRootPage && isEventWikiRootPage(page))
    return { failure: badRequest };

  return { scoped, page };
};
