import { WikiPageNamespace } from "@sam-monorepo/database/client";
import {
  AuditEventType,
  MAXIMUM_WIKI_FEATURED_PAGES,
  WikiPageLinkKey,
  getWikiPageLinkSettingKey,
} from "@sam-monorepo/domain";
import * as z from "zod";
import type { Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";
import { NotFoundError } from "../errors.js";
import { idSchema } from "../pagination.js";
import { WikiErrorMessage } from "./wikiErrors.js";
import {
  WIKI_SETTING_IFRAME_ALLOWLIST,
  parseWikiIframeAllowlist,
} from "./wikiIframeAllowlist.js";

/** `WikiSetting.key` of the pages on the landing page of the wiki */
export const WIKI_SETTING_FEATURED_PAGES = "featuredPages";

/** `WikiSetting.key` of the page that the dashboard of the app shows */
export const WIKI_SETTING_DASHBOARD_PAGE = "dashboardPage";

const featuredPagesSchema = z.array(idSchema).max(MAXIMUM_WIKI_FEATURED_PAGES);

const parsePageIdSetting = (value: unknown): string | null => {
  const parsed = idSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
};

export interface WikiSettings {
  readonly iframeAllowlist: string[];
  /**
   * The pages on the landing page of the wiki, in the sequence of the wiki
   * managers. A page that a user deleted after the save stays in the list
   * until the next save: `resolveWikiFeaturedPages()` of the app removes it.
   */
  readonly featuredPageIds: string[];
  /** The dashboard tile checks the read permission of the viewer itself */
  readonly dashboardPageId: string | null;
  /**
   * The page of each page link. The consumers of the links use
   * `findWikiPageLinkTarget()`.
   */
  readonly pageLinkPageIds: Record<WikiPageLinkKey, string | null>;
}

export const findWikiSettings = async (
  context: Pick<ApplicationContext, "prisma">,
): Promise<WikiSettings> => {
  const pageLinkKeys = Object.values(WikiPageLinkKey);
  const settings = await context.prisma.wikiSetting.findMany({
    where: {
      key: {
        in: [
          WIKI_SETTING_IFRAME_ALLOWLIST,
          WIKI_SETTING_FEATURED_PAGES,
          WIKI_SETTING_DASHBOARD_PAGE,
          ...pageLinkKeys.map(getWikiPageLinkSettingKey),
        ],
      },
    },
    select: { key: true, value: true },
  });
  const valuesByKey = new Map(
    settings.map((setting) => [setting.key, setting.value]),
  );

  const featuredPageIds = featuredPagesSchema.safeParse(
    valuesByKey.get(WIKI_SETTING_FEATURED_PAGES),
  );

  return {
    iframeAllowlist: parseWikiIframeAllowlist(
      valuesByKey.get(WIKI_SETTING_IFRAME_ALLOWLIST),
    ),
    featuredPageIds: featuredPageIds.success ? featuredPageIds.data : [],
    dashboardPageId: parsePageIdSetting(
      valuesByKey.get(WIKI_SETTING_DASHBOARD_PAGE),
    ),
    pageLinkPageIds: Object.fromEntries(
      pageLinkKeys.map((key) => [
        key,
        parsePageIdSetting(valuesByKey.get(getWikiPageLinkSettingKey(key))),
      ]),
    ) as Record<WikiPageLinkKey, string | null>,
  };
};

export interface WikiPageLinkTarget {
  readonly pageId: string;
  readonly title: string;
  readonly slug: string;
}

/**
 * The top bar of each page uses it, and the page checks the permissions when
 * the user opens it
 */
export const findWikiPageLinkTarget = async (
  context: Pick<ApplicationContext, "prisma">,
  { key }: { readonly key: WikiPageLinkKey },
): Promise<WikiPageLinkTarget | null> => {
  const setting = await context.prisma.wikiSetting.findUnique({
    where: { key: getWikiPageLinkSettingKey(key) },
    select: { value: true },
  });
  const pageId = parsePageIdSetting(setting?.value);
  if (!pageId) return null;

  const page = await context.prisma.wikiPage.findUnique({
    where: { id: pageId },
    select: { id: true, title: true, slug: true, deletedAt: true },
  });
  if (!page || page.deletedAt) return null;

  return { pageId: page.id, title: page.title, slug: page.slug };
};

/**
 * The settings are global curation by `wiki;manage`, thus the page permissions
 * do not apply
 */
export const requireLiveWikiPages = async (
  context: Pick<ApplicationContext, "prisma">,
  pageIds: readonly string[],
): Promise<void> => {
  if (pageIds.length === 0) return;

  const livePageCount = await context.prisma.wikiPage.count({
    where: {
      id: { in: [...pageIds] },
      namespace: WikiPageNamespace.WIKI,
      deletedAt: null,
    },
  });
  if (livePageCount !== new Set(pageIds).size)
    throw new NotFoundError(WikiErrorMessage.PageNotFound);
};

/**
 * Null deletes the setting: the audit event then has an empty string as its
 * value
 */
export const writeWikiSetting = async (
  context: ApplicationContext,
  actor: Actor,
  {
    key,
    value,
  }: { readonly key: string; readonly value: string | string[] | null },
): Promise<void> => {
  if (value === null) {
    await context.prisma.wikiSetting.deleteMany({ where: { key } });
  } else {
    const updatedById = actor.citizen?.id ?? null;
    await context.prisma.wikiSetting.upsert({
      where: { key },
      update: { value, updatedById },
      create: { key, value, updatedById },
    });
  }

  await context.audit.create([
    {
      type: AuditEventType.WIKI_SETTINGS_UPDATED,
      data: { setting: key, value: value ?? "" },
      createdById: actor.userId,
    },
  ]);
};
