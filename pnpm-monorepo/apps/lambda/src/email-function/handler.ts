import formData from "form-data";
import Mailgun from "mailgun.js";
import { z } from "zod";
import { log } from "../common/logger";
import { requestBodySchema } from "../email-function";
import { emailConfirmation } from "./templates/emailConfirmation";

export const emailFunctionHandler = async (
  body: z.infer<typeof requestBodySchema>,
) => {
  log.info("Processing email request", {
    template: body.template,
    requestId: body.requestId,
  });

  const mailgun = new Mailgun(formData);

  const mg = mailgun.client({
    username: "api",
    key: process.env.MAILGUN_API_KEY!,
    url: "https://api.eu.mailgun.net",
  });

  switch (body.template) {
    case "emailConfirmation":
      await emailConfirmation(mg, body.messages);
      break;

    default:
      throw new Error(`Invalid template: ${body.template}`);
  }
};
