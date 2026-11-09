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
