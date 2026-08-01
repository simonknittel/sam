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
        /**
         * The allowlist check is the last stop after the dedicated-provider
         * patterns didn't match, so the message covers the whole range of
         * supported URLs.
         */
        error:
          "Diese URL wird nicht unterstützt. Möglich sind YouTube, Twitch, Spotify, Google Docs/Tabellen/Präsentationen sowie Domains, die in den Wiki-Einstellungen freigegeben sind.",
        requestPayload: formData,
      };

    return { success: "Erlaubt." };
  },
);
