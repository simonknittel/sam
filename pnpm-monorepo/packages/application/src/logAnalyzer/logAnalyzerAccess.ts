import { requirePermission, type Actor } from "../actor.js";
import { ForbiddenError } from "../errors.js";
import { LogAnalyzerErrorMessage } from "./logAnalyzerErrors.js";

/** A flag of the host (Unleash) */
export interface LogAnalyzerSharingOptions {
  readonly isSharingDisabled: boolean;
}

export const requireLogAnalyzerAccess = (
  actor: Actor,
  options: LogAnalyzerSharingOptions,
) => {
  requirePermission(actor, "logAnalyzer", "read");

  if (options.isSharingDisabled)
    throw new ForbiddenError(LogAnalyzerErrorMessage.SharingDisabled);
};
