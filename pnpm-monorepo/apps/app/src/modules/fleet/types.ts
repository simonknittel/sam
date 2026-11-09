import { ExternalService } from "@sam-monorepo/domain";

export const ExternalServiceDisplayNames: Record<ExternalService, string> = {
  [ExternalService.SPVIEWER]: "SPViewer",
  [ExternalService.RSI]: "RSI",
  [ExternalService.FLEETYARDS]: "FleetYards",
  [ExternalService.STAR_CITIZEN_WIKI]: "Star Citizen Wiki",
  [ExternalService.UEX]: "UEX",
  [ExternalService.CORNERSTONE]: "Cornerstone",
  [ExternalService.CCU_GAME]: "CCU Game",
};

const isExternalService = (value: string): value is ExternalService =>
  Object.values<string>(ExternalService).includes(value);

/**
 * The database stores the service of a link as text. A value that is not a
 * member of `ExternalService` shows as it is.
 */
export const getExternalServiceDisplayName = (serviceName: string) =>
  isExternalService(serviceName)
    ? ExternalServiceDisplayNames[serviceName]
    : serviceName;
