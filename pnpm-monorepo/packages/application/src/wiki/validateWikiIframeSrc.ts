import { isWikiIframeSrcAllowed } from "@sam-monorepo/wiki-editor";
import * as z from "zod";
import type { Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";
import { ValidationError } from "../errors.js";
import { WikiErrorMessage } from "./wikiErrors.js";
import { loadWikiIframeAllowlist } from "./wikiIframeAllowlist.js";

/** The URLs of real embeds are much shorter: the limit keeps the check small */
const MAXIMUM_WIKI_IFRAME_SOURCE_LENGTH = 2_000;

export const validateWikiIframeSrcInputSchema = z.object({
  src: z.url().max(MAXIMUM_WIKI_IFRAME_SOURCE_LENGTH),
});

export type ValidateWikiIframeSrcInput = z.output<
  typeof validateWikiIframeSrcInputSchema
>;

export interface ValidateWikiIframeSrcOutput {
  readonly src: string;
}

/**
 * Checks the URL of a generic iframe against the current allowlist when the
 * user adds the iframe. The static render and the editor check the URL
 * again on each render, thus this check only gives the user a clear message
 * early. It is not the only check. The use case needs no permission other
 * than the clearance that the caller checks.
 *
 * @throws ValidationError when the URL is not an HTTPS URL, or when its host
 * is not on the allowlist and is not a subdomain of an entry
 */
export const validateWikiIframeSrc = async (
  context: ApplicationContext,
  _actor: Actor,
  input: ValidateWikiIframeSrcInput,
): Promise<ValidateWikiIframeSrcOutput> => {
  const allowlist = await loadWikiIframeAllowlist(context.prisma);
  if (!isWikiIframeSrcAllowed(input.src, allowlist))
    throw new ValidationError(WikiErrorMessage.IframeSourceNotAllowed);

  return { src: input.src };
};
