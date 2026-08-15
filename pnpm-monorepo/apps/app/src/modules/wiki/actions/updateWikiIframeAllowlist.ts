"use server";

import { prisma } from "@/db";
import { createAuthenticatedAction } from "@/modules/actions/utils/createAction";
import { AuditEventType } from "@/modules/audit/utils/AuditEventTypes";
import { createAuditEvents } from "@/modules/audit/utils/createAuditEvent";
import { z } from "zod";
import { revalidateGlobalWikiScope } from "../queries/getWikiPageScopedContext";
import {
  MAX_WIKI_IFRAME_ALLOWLIST_ENTRIES,
  WIKI_SETTING_IFRAME_ALLOWLIST,
} from "../queries/getWikiSettings";
import { WIKI_HOSTNAME_PATTERN } from "../utils/wikiHostnamePattern";

const schema = z.object({
  /** One `domain` form field per hostname */
  domains: z
    .array(z.string().max(255))
    .max(1_000)
    .transform((values) =>
      [
        ...new Set(values.map((value) => value.trim().toLowerCase())),
      ].toSorted(),
    )
    .refine(
      (domains) =>
        domains.length <= MAX_WIKI_IFRAME_ALLOWLIST_ENTRIES &&
        domains.every((domain) => WIKI_HOSTNAME_PATTERN.test(domain)),
      { message: "Invalid hostname" },
    ),
});

export const updateWikiIframeAllowlist = createAuthenticatedAction(
  "updateWikiIframeAllowlist",
  schema,
  async (formData, authentication, data, t) => {
    if (!(await authentication.authorize("wiki", "manage")))
      return { error: t("Common.forbidden"), requestPayload: formData };

    const updatedById = authentication.session.entity?.id ?? null;
    await prisma.wikiSetting.upsert({
      where: { key: WIKI_SETTING_IFRAME_ALLOWLIST },
      update: { value: data.domains, updatedById },
      create: {
        key: WIKI_SETTING_IFRAME_ALLOWLIST,
        value: data.domains,
        updatedById,
      },
    });

    await createAuditEvents([
      {
        type: AuditEventType.WIKI_SETTINGS_UPDATED,
        data: {
          setting: WIKI_SETTING_IFRAME_ALLOWLIST,
          value: data.domains,
        },
        createdById: authentication.session.user.id,
      },
    ]);

    revalidateGlobalWikiScope();

    return { success: t("Common.successfullySaved") };
  },
  {
    parseFormData: (formData) => ({ domains: formData.getAll("domain") }),
  },
);
