import Email, {
  type EmailConfirmationProps,
} from "@sam-monorepo/emails/emails/EmailConfirmation";
import type { Interfaces } from "mailgun.js/definitions";
import { render } from "react-email";

const subject =
  "E-Mail-Adresse und Datenschutzerklärung bestätigen | SAM - Sinister Incorporated";

export const emailConfirmation = async (
  mg: Interfaces.IMailgunClient,
  messages: Array<{
    to: string;
    templateProps: Record<string, string>;
  }>,
) => {
  const htmlEmail = await renderHtmlEmail({
    baseUrl: "%recipient.baseUrl%",
    host: "%recipient.host%",
    token: "%recipient.token%",
  });

  const htmlRecipientVariables: Record<string, Record<string, string>> = {};
  for (const htmlMessage of messages) {
    htmlRecipientVariables[htmlMessage.to] = htmlMessage.templateProps;
  }

  await mg.messages.create("sam-mail.sinister-incorporated.de", {
    from: "Sinister Incorporated <no-reply@sam-mail.sinister-incorporated.de>",
    to: messages.map((message) => message.to),
    subject: subject,
    html: htmlEmail,
    "recipient-variables": JSON.stringify(htmlRecipientVariables),
  });
};

const renderHtmlEmail = (templateProps: EmailConfirmationProps) => {
  return render(Email(templateProps));
};
