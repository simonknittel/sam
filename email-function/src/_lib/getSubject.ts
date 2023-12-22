import { CustomError } from "./logging/CustomError";
import { TemplateType } from "./types";

export const getSubject = (template: TemplateType) => {
  switch (template) {
    case "emailConfirmation":
      return "E-Mail-Adresse bestätigen | Sinister Incorporated";

    default:
      throw new CustomError("Invalid template", { template });
  }
}
