import { WIKI_HOSTNAME_PATTERN } from "@sam-monorepo/domain";
import * as z from "zod";
import { requirePermission, type Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";
import { withSpan } from "../withSpan.js";
import {
  MAXIMUM_WIKI_IFRAME_ALLOWLIST_ENTRIES,
  WIKI_SETTING_IFRAME_ALLOWLIST,
} from "./wikiIframeAllowlist.js";
import { writeWikiSetting } from "./wikiSettings.js";

/**
 * The limit of the raw entries before the deduplication. It only stops large
 * requests: the deduplicated list has a lower limit.
 */
const MAXIMUM_RAW_WIKI_IFRAME_ALLOWLIST_ENTRIES = 1_000;

/** The longest name of a host (RFC 1035) */
const MAXIMUM_HOSTNAME_LENGTH = 255;

export const updateWikiIframeAllowlistInputSchema = z.object({
  /** Sorted and without duplicates after the parse */
  domains: z
    .array(z.string().max(MAXIMUM_HOSTNAME_LENGTH))
    .max(MAXIMUM_RAW_WIKI_IFRAME_ALLOWLIST_ENTRIES)
    .transform((values) =>
      [
        ...new Set(values.map((value) => value.trim().toLowerCase())),
      ].toSorted(),
    )
    .refine(
      (domains) =>
        domains.length <= MAXIMUM_WIKI_IFRAME_ALLOWLIST_ENTRIES &&
        domains.every((domain) => WIKI_HOSTNAME_PATTERN.test(domain)),
      { message: "Invalid hostname" },
    ),
});

export type UpdateWikiIframeAllowlistInput = z.infer<
  typeof updateWikiIframeAllowlistInputSchema
>;

export interface UpdateWikiIframeAllowlistOutput {
  readonly domains: string[];
}

export const updateWikiIframeAllowlist = (
  context: ApplicationContext,
  actor: Actor,
  input: UpdateWikiIframeAllowlistInput,
): Promise<UpdateWikiIframeAllowlistOutput> =>
  withSpan(context, "updateWikiIframeAllowlist", async () => {
    requirePermission(actor, "wiki", "manage");

    await writeWikiSetting(context, actor, {
      key: WIKI_SETTING_IFRAME_ALLOWLIST,
      value: input.domains,
    });

    return { domains: input.domains };
  });
