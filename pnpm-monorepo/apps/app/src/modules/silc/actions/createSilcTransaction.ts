"use server";

import { createUseCaseAction } from "@/modules/application";
import {
  createSilcTransactionInputSchema,
  createSilcTransaction as createSilcTransactionUseCase,
} from "@sam-monorepo/application";
import { SILC_ERROR_TEXTS } from "../utils/silcErrorTexts";

export const createSilcTransaction = createUseCaseAction({
  name: "createSilcTransaction",
  schema: createSilcTransactionInputSchema,
  useCase: createSilcTransactionUseCase,
  parseFormData: (formData) => ({
    receiver_ids: formData.getAll("receiverId[]"),
    value: Number(formData.get("value")),
    description: formData.has("description")
      ? formData.get("description")
      : undefined,
  }),
  texts: SILC_ERROR_TEXTS,
  success: (t) => t("Common.successfullySaved"),
});
