export enum ExternalService {
  SPVIEWER = "SPVIEWER",
  RSI = "RSI",
  FLEETYARDS = "FLEETYARDS",
}

export const ExternalServiceDisplayNames: Record<ExternalService, string> = {
  [ExternalService.SPVIEWER]: "SPViewer",
  [ExternalService.RSI]: "RSI",
  [ExternalService.FLEETYARDS]: "FleetYards",
};
