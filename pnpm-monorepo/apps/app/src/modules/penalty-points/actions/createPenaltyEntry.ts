"use server";

import { createUseCaseAction } from "@/modules/application";
import {
  createPenaltyEntryInputSchema,
  createPenaltyEntry as createPenaltyEntryUseCase,
  PenaltyEntryErrorMessage,
} from "@sam-monorepo/application";

export const createPenaltyEntry = createUseCaseAction({
  name: "createPenaltyEntry",
  schema: createPenaltyEntryInputSchema,
  useCase: createPenaltyEntryUseCase,
  parseFormData: (formData) => ({
    citizen_id: formData.get("citizenId"),
    points: Number(formData.get("points")),
    reason: formData.has("reason") ? formData.get("reason") : undefined,
    // The wall time of the form, in the time zone of the organization
    expires_at: formData.get("expiresAt") || undefined,
  }),
  texts: {
    [PenaltyEntryErrorMessage.CitizenDeleted]: "Der Citizen ist gelöscht.",
  },
  success: (t) => t("Common.successfullySaved"),
});
