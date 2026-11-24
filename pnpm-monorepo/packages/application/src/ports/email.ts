export enum EmailTemplate {
  /** The value is the contract with the email function (its request schema) */
  EmailConfirmation = "emailConfirmation",
}

export interface EmailMessage {
  readonly to: string;
  /** Mailgun replaces `%recipient.<name>%` of the template with these values */
  readonly templateProps: Readonly<Record<string, string>>;
}

export interface EmailRequest {
  readonly template: EmailTemplate;
  readonly messages: readonly EmailMessage[];
}

/**
 * Requests emails from the email function. When the host has no event bus,
 * the implementation logs this and sends nothing.
 */
export interface EmailRequester {
  readonly request: (request: EmailRequest) => Promise<void>;
}
