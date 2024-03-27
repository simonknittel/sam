import { render } from "@react-email/render";
import { IMailgunClient } from "mailgun.js/Interfaces";
import Email, {
	EmailConfirmationProps,
} from "../../../../emails/emails/EmailConfirmation";

export const emailConfirmation = async (
	mg: IMailgunClient,
	messages: Array<{
		to: string;
		templateProps: Record<string, string>;
		recipientsPublicKey?: string;
	}>,
) => {
	/**
	 * HTML
	 */
	const htmlMessages = messages.filter((email) => !email.recipientsPublicKey);

	const htmlEmail = renderHtmlEmail({
		baseUrl: "%recipient.baseUrl%",
		host: "%recipient.host%",
		token: "%recipient.token%",
	});

	const htmlRecipientVariables = {};
	for (const htmlMessage of htmlMessages) {
		htmlRecipientVariables[htmlMessage.to] = htmlMessage.templateProps;
	}

	await mg.messages.create("mailgun.simonknittel.de", {
		from: "Sinister Incorporated <noreply@mailgun.simonknittel.de>",
		to: htmlMessages.map((message) => message.to),
		subject: subject,
		html: htmlEmail,
		"recipient-variables": JSON.stringify(htmlRecipientVariables),
	});

	// /**
	//  * Text
	//  */
	// const textMessages = messages.filter((email) => email.recipientsPublicKey);

	// const textEmail = renderTextEmail({
	// 	baseUrl: "%recipient.baseUrl%",
	// 	host: "%recipient.host%",
	// 	token: "%recipient.token%",
	// });

	// const textRecipientVariables = {};
	// for (const textMessage of textMessages) {
	// 	textRecipientVariables[textMessage.to] = textMessage.templateProps;
	// }

	// await mg.messages.create("mailgun.simonknittel.de", {
	// 	from: "Sinister Incorporated <noreply@mailgun.simonknittel.de>",
	// 	to: textMessages.map((message) => message.to),
	// 	subject: subject,
	// 	text: textEmail,
	// 	"recipient-variables": JSON.stringify(textRecipientVariables),
	// });
};

const subject =
	"E-Mail-Adresse und Datenschutzerklärung bestätigen | Sinister Incorporated";

const renderHtmlEmail = (templateProps: EmailConfirmationProps) => {
	return render(Email(templateProps));
};

const renderTextEmail = (templateProps: EmailConfirmationProps) => {
	const { baseUrl, host, token } = templateProps;

	return `E-Mail-Adresse und Datenschutzerklärung bestätigen - Sinister Inc

Deine E-Mail-Adresse und die Datenschutzerklärung müssen bestätigt werden bevor du ${host} nutzen kannst.

Öffne folgenden Link in deinem Browser um diese zu bestätigen:
${baseUrl}/api/confirm-email?token=${token}

Falls du diese E-Mail nicht erwartet hast, melde dich bei info@sinister-incorporated.de.

---

Impressum: ${baseUrl}/imprint
Datenschutzerklärung: ${baseUrl}/privacy-policy
`;
};
