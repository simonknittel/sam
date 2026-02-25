import { render } from "@react-email/render";
import { Interfaces } from "mailgun.js/definitions";
import Email, {
	EmailConfirmationProps,
} from "../../../../emails/emails/EmailConfirmation";

export const emailConfirmation = async (
	mg: Interfaces.IMailgunClient,
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

	const htmlEmail = await renderHtmlEmail({
		baseUrl: "%recipient.baseUrl%",
		host: "%recipient.host%",
		token: "%recipient.token%",
	});

	const htmlRecipientVariables = {};
	for (const htmlMessage of htmlMessages) {
		htmlRecipientVariables[htmlMessage.to] = htmlMessage.templateProps;
	}

	await mg.messages.create("sam-mail.sinister-incorporated.de", {
		from: "Sinister Incorporated <no-reply@sam-mail.sinister-incorporated.de>",
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

	// await mg.messages.create("sam-mail.sinister-incorporated.de", {
	// 	from: "Sinister Incorporated <no-reply@sam-mail.sinister-incorporated.de>",
	// 	to: textMessages.map((message) => message.to),
	// 	subject: subject,
	// 	text: textEmail,
	// 	"recipient-variables": JSON.stringify(textRecipientVariables),
	// });
};

const subject =
	"E-Mail-Adresse und Datenschutzerklärung bestätigen | SAM - Sinister Incorporated";

const renderHtmlEmail = (templateProps: EmailConfirmationProps) => {
	return render(Email(templateProps));
};

const renderTextEmail = (templateProps: EmailConfirmationProps) => {
	const { baseUrl, host, token } = templateProps;

	return `E-Mail-Adresse und Datenschutzerklärung bestätigen - SAM

Deine E-Mail-Adresse und die Datenschutzerklärung müssen bestätigt werden bevor du ${host} nutzen kannst.

Öffne folgenden Link in deinem Browser um diese zu bestätigen:
${baseUrl}/api/confirm-email?token=${token}

Falls du diese E-Mail nicht erwartet hast, melde dich bei info@sinister-incorporated.de.

---

Impressum: ${baseUrl}/imprint
Datenschutzerklärung: ${baseUrl}/privacy-policy
`;
};
