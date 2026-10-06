import Mailgun from "mailgun.js";
import * as z from "zod";
import { log } from "../common/logger";
import { requestBodySchema } from "../email-function";
import { env } from "./setup";
import { emailConfirmation } from "./templates/emailConfirmation";

const mailgunClient = new Mailgun(FormData).client({
  username: "api",
  key: env.MAILGUN_API_KEY,
  url: "https://api.eu.mailgun.net",
  /** In milliseconds */
  timeout: 5_000,
});

export const emailFunctionHandler = async (
  body: z.infer<typeof requestBodySchema>,
) => {
  log.info("Processing email request", {
    template: body.template,
    requestId: body.requestId,
  });

  // body.template is a size-1 z.enum; reintroduce a switch when a second
  // template exists.
  await emailConfirmation(mailgunClient, body.messages);
};
