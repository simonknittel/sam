import type { ApplicationErrorTexts } from "@/modules/application";
import { INACTIVE_RECEIVER_ERROR } from "@/modules/silc/utils/silcErrorTexts";
import { TaskErrorMessage } from "@sam-monorepo/application";

const TASK_NOT_FOUND_ERROR = "Task nicht gefunden";

/** The other validation errors need a request that bypassed the forms */
export const TASK_ERROR_TEXTS: ApplicationErrorTexts = {
  [TaskErrorMessage.NotFound]: TASK_NOT_FOUND_ERROR,
  [TaskErrorMessage.NotOpen]: "Der Task ist bereits abgeschlossen.",
  [TaskErrorMessage.NotSelfAssignable]:
    "Du kannst deine Teilnahme an einem personalisierten Task nicht selbstständig ändern.",
  [TaskErrorMessage.AssignmentLimitReached]:
    "Dieser Task kann nicht von Weiteren angenommen werden.",
  [TaskErrorMessage.MissingRequiredRole]:
    "Du erfüllst nicht die Voraussetzungen für diesen Task.",
  [TaskErrorMessage.NotAccepted]: "Du hast diesen Task nicht angenommen.",
  [TaskErrorMessage.NoCompletionist]:
    "Der Task kann nicht abgeschlossen werden, ohne dass ihn jemand erfüllt hat.",
  [TaskErrorMessage.InactiveCompletionist]: INACTIVE_RECEIVER_ERROR,
  [TaskErrorMessage.NoAssignee]: "Bitte wähle mindestens einen Citizen aus.",
  [TaskErrorMessage.UnknownAssignee]: INACTIVE_RECEIVER_ERROR,
};
