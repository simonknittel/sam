import type { EmbedAuthentication } from "@/modules/embed-authentication/utils/types";

/**
 * Path of the dashboard in the Grafana of `STATISTICS_GRAFANA_URL`: the UID
 * of the dashboard file `grafana/dashboards/statistics.json` and its slug.
 */
export const STATISTICS_DASHBOARD_PATH = "/d/sam-statistics/statistiken";

/**
 * The Grafana examines the token itself (JWT authentication, see
 * docs/embedded-app-authentication.md).
 */
export const STATISTICS_EMBED_AUTHENTICATION: EmbedAuthentication = {
  /** Grafana pins this value in `expect_claims` */
  audience: "sam-statistics-grafana",
  /**
   * The dashboard reads no permission of the token: the page checks
   * `globalStatistics;read` before it signs the token.
   */
  permissionResources: [],
  /** Grafana reads the token only from this parameter (`url_login`) */
  queryParameter: "auth_token",
  /**
   * Grafana makes no session from the token. Its frontend sends the token
   * with each request, thus the dashboard stops at the expiry. The page then
   * covers the frame with a note and signs a new token on request.
   */
  lifetimeInSeconds: 60 * 60,
};
