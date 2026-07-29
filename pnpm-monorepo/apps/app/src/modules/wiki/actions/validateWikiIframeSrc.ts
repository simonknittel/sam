"use server";

import { createAuthenticatedAction } from "@/modules/actions/utils/createAction";
import { isWikiIframeSrcAllowed } from "@sam-monorepo/wiki-editor";
import { z } from "zod";
import { getWikiContext } from "../queries/getWikiContext";
import { getWikiIframeAllowlist } from "../queries/getWikiSettings";

const schema = z.object({
  src: z.url().max(2_000),
});

/**
 * Insertion-time check of a generic iframe URL against the current
 * allowlist. The static renderer and the editor re-validate on every
 * render, so this is UX (fail early with a clear message), not the only
 * line of defense.
 */
export const validateWikiIframeSrc = createAuthenticatedAction(
  "validateWikiIframeSrc",
  schema,
  async (formData, _authentication, data, t) => {
    const context = await getWikiContext();
    if (!context)
      return { error: t("Common.forbidden"), requestPayload: formData };

    const allowlist = await getWikiIframeAllowlist();
    if (!isWikiIframeSrcAllowed(data.src, allowlist))
      return {
        error:
          "Diese Domain ist nicht für eingebettete Inhalte freigegeben. Wiki-Administratoren können sie in den Wiki-Einstellungen freigeben.",
        requestPayload: formData,
      };

    return { success: "Erlaubt." };
  },
);
