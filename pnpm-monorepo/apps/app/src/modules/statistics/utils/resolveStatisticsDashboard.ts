import { env } from "@/env";
import {
  AuthenticatedEmbedUrlStatus,
  authenticateEmbedUrl,
} from "@/modules/embed-authentication/utils/resolveEmbedUrl";
import type { Session } from "next-auth";
import "server-only";
import {
  STATISTICS_DASHBOARD_PATH,
  STATISTICS_EMBED_AUTHENTICATION,
} from "./constants";

export enum StatisticsDashboardStatus {
  Ready = "ready",
  /**
   * The environment has no Grafana (`STATISTICS_GRAFANA_URL`) or no signing
   * key (`EMBED_JWT_PRIVATE_KEY`)
   */
  NotConfigured = "notConfigured",
  NoCitizen = "noCitizen",
}

export type StatisticsDashboardState =
  | {
      readonly status: StatisticsDashboardStatus.Ready;
      readonly src: string;
      readonly remainingLifetimeInMilliseconds: number;
    }
  | {
      readonly status:
        | StatisticsDashboardStatus.NotConfigured
        | StatisticsDashboardStatus.NoCitizen;
    };

export const resolveStatisticsDashboard = async (
  session: Session,
): Promise<StatisticsDashboardState> => {
  if (!env.STATISTICS_GRAFANA_URL)
    return { status: StatisticsDashboardStatus.NotConfigured };

  const dashboardUrl = new URL(
    STATISTICS_DASHBOARD_PATH,
    env.STATISTICS_GRAFANA_URL,
  );
  // Grafana starts the kiosk mode only with a value: `kiosk=` does not work
  dashboardUrl.searchParams.set("kiosk", "1");

  const authenticatedEmbedUrl = await authenticateEmbedUrl(
    dashboardUrl.toString(),
    session,
    STATISTICS_EMBED_AUTHENTICATION,
  );

  switch (authenticatedEmbedUrl.status) {
    case AuthenticatedEmbedUrlStatus.Signed:
      return {
        status: StatisticsDashboardStatus.Ready,
        src: authenticatedEmbedUrl.url,
        remainingLifetimeInMilliseconds:
          authenticatedEmbedUrl.expiresAt.getTime() - Date.now(),
      };

    case AuthenticatedEmbedUrlStatus.NoSigningKey:
      return { status: StatisticsDashboardStatus.NotConfigured };

    case AuthenticatedEmbedUrlStatus.NoEntity:
      return { status: StatisticsDashboardStatus.NoCitizen };

    default:
      throw new Error(
        `Unknown status: ${authenticatedEmbedUrl satisfies never}`,
      );
  }
};
