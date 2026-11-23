"use server";

import { ActionRefresh, createUseCaseAction } from "@/modules/application";
import { stopOwnRuntimes as stopOwnRuntimesUseCase } from "@sam-monorepo/application";
import { REMOTE_CONTROL_PROGRAM_ERROR_TEXTS } from "../utils/remoteControlProgramErrorTexts";

/**
 * The "Stop all" of the sharing popover for all runtimes of the owner. The
 * client fetches the popover again after the action (see
 * `useSharingPopoverAction()`).
 */
export const stopOwnRuntimes = createUseCaseAction({
  name: "stopOwnRuntimes",
  useCase: stopOwnRuntimesUseCase,
  texts: REMOTE_CONTROL_PROGRAM_ERROR_TEXTS,
  refresh: ActionRefresh.Never,
  success: () => "Alles gestoppt",
});
