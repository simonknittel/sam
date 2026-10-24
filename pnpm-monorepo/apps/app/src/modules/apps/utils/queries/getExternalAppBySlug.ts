import { requireAuthenticationPage } from "@/modules/auth/server";
import { withTrace } from "@/modules/tracing/utils/withTrace";
import { cache } from "react";
import { externalApps } from "../externalApps";

export const getExternalAppBySlug = cache(
  withTrace("getExternalApp", async (slug: string) => {
    await requireAuthenticationPage();

    // TODO: Implement fetching apps from database

    const app = externalApps.find((app) => app.slug === slug);
    if (!app) return null;

    return app;
  }),
);
