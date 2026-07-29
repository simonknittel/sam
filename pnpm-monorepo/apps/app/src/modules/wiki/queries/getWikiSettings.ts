import { prisma } from "@/db";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import { cache } from "react";
import { z } from "zod";

export const WIKI_SETTING_IFRAME_ALLOWLIST = "iframeAllowlist";
export const WIKI_SETTING_SUPPORT_PAGE_ID = "supportPageId";

export const MAX_WIKI_IFRAME_ALLOWLIST_ENTRIES = 100;

const iframeAllowlistSchema = z
  .array(z.string())
  .max(MAX_WIKI_IFRAME_ALLOWLIST_ENTRIES);

/**
 * Hostnames generic iframes may embed. Used by the insertion-time
 * validation and passed to the editor/static renderer for the render-time
 * re-check.
 */
export const getWikiIframeAllowlist = cache(
  withTrace("getWikiIframeAllowlist", async (): Promise<string[]> => {
    const setting = await prisma.wikiSetting.findUnique({
      where: { key: WIKI_SETTING_IFRAME_ALLOWLIST },
    });
    const parsed = iframeAllowlistSchema.safeParse(setting?.value);
    return parsed.success ? parsed.data : [];
  }),
);

/**
 * Id of the page the topbar support icon links to, or null if unset.
 */
export const getWikiSupportPageId = cache(
  withTrace("getWikiSupportPageId", async (): Promise<string | null> => {
    const setting = await prisma.wikiSetting.findUnique({
      where: { key: WIKI_SETTING_SUPPORT_PAGE_ID },
    });
    const parsed = z.string().min(1).safeParse(setting?.value);
    return parsed.success ? parsed.data : null;
  }),
);
