"use server";

import { ActionRefresh, createUseCaseAction } from "@/modules/application";
import { startOwnRuntimes as startOwnRuntimesUseCase } from "@sam-monorepo/application";
import { REMOTE_CONTROL_PROGRAM_ERROR_TEXTS } from "../utils/remoteControlProgramErrorTexts";

/**
 * Ends the "Stop all" of the owner. The client fetches the popover again
 * after the action (see `useSharingPopoverAction()`).
 */
export const startOwnRuntimes = createUseCaseAction({
  name: "startOwnRuntimes",
  useCase: startOwnRuntimesUseCase,
  texts: REMOTE_CONTROL_PROGRAM_ERROR_TEXTS,
  refresh: ActionRefresh.Never,
  success: () => "Alles gestartet",
});
