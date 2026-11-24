import { createId } from "@paralleldrive/cuid2";
import { EmailTemplate, type ApplicationContext } from "../context.js";
import { withSpan } from "../withSpan.js";

const EMAIL_CONFIRMATION_TOKEN_LIFETIME_MILLISECONDS = 24 * 60 * 60 * 1000;

export interface SendEmailConfirmationInput {
  readonly userId: string;
  /** An empty value sends no email */
  readonly email: string;
}

export interface SendEmailConfirmationOutput {
  /** False when the user has no email address or the request failed */
  readonly requested: boolean;
}

/**
 * Never throws, thus it cannot stop the sign-in. The token never goes into a
 * log. No permission check, see the README.
 */
export const sendEmailConfirmation = (
  context: ApplicationContext,
  { userId, email }: SendEmailConfirmationInput,
): Promise<SendEmailConfirmationOutput> =>
  withSpan(context, "sendEmailConfirmation", async () => {
    // The type does not stop a sign-in provider that gives no email address
    if (!email) {
      context.log.warn("The user has no email address to confirm", {
        userId,
      });

      return { requested: false };
    }

    try {
      // `confirmEmailWithToken` accepts only a cuid2 as the token
      const token = createId();

      await context.prisma.emailConfirmationToken.create({
        data: {
          token,
          email,
          userId,
          expires: new Date(
            context.now().getTime() +
              EMAIL_CONFIRMATION_TOKEN_LIFETIME_MILLISECONDS,
          ),
        },
      });

      await context.email.request({
        template: EmailTemplate.EmailConfirmation,
        messages: [
          {
            to: email,
            templateProps: {
              baseUrl: context.urls.issuer,
              host: context.urls.baseUrl.host,
              token,
            },
          },
        ],
      });

      return { requested: true };
    } catch (error) {
      context.log.error("Failed to request the confirmation email", {
        userId,
        error,
      });

      return { requested: false };
    }
  });
