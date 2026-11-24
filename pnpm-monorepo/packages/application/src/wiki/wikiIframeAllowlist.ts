import {
  collectWikiIframeSrcs,
  isWikiIframeSrcAllowed,
} from "@sam-monorepo/wiki-editor";
import * as z from "zod";
import type { ApplicationContext } from "../context.js";

/** `WikiSetting.key` of the hostnames that generic iframes may embed */
export const WIKI_SETTING_IFRAME_ALLOWLIST = "iframeAllowlist";

/**
 * The most hostnames of the allowlist. The renders compare each iframe with
 * each hostname, and the settings page shows one entry for each hostname:
 * 100 is much more than the organization needs, and it keeps both small.
 */
export const MAXIMUM_WIKI_IFRAME_ALLOWLIST_ENTRIES = 100;

const iframeAllowlistSchema = z
  .array(z.string())
  .max(MAXIMUM_WIKI_IFRAME_ALLOWLIST_ENTRIES);

/** An invalid value allows no hostname */
export const parseWikiIframeAllowlist = (value: unknown): string[] => {
  const parsed = iframeAllowlistSchema.safeParse(value);
  return parsed.success ? parsed.data : [];
};

export const loadWikiIframeAllowlist = async (
  prisma: ApplicationContext["prisma"],
): Promise<string[]> => {
  const setting = await prisma.wikiSetting.findUnique({
    where: { key: WIKI_SETTING_IFRAME_ALLOWLIST },
  });
  return parseWikiIframeAllowlist(setting?.value);
};

/**
 * Content that does not come from the editor (an import, a Markdown text)
 * bypasses the insertion-time validation, thus its writes check it with this
 * function
 */
export const findDisallowedWikiIframeSources = async (
  prisma: ApplicationContext["prisma"],
  content: unknown,
): Promise<string[]> => {
  const iframeAllowlist = await loadWikiIframeAllowlist(prisma);

  return collectWikiIframeSrcs(content).filter(
    (source) => !isWikiIframeSrcAllowed(source, iframeAllowlist),
  );
};
