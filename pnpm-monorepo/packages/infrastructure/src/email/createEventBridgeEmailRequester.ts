import { createId } from "@paralleldrive/cuid2";
import type { ApplicationContext } from "@sam-monorepo/application";
import type { EmitEvents } from "../eventbridge/createEventBridgeEmitter.js";

/** The rule of the email function matches only this detail type */
const EMAIL_REQUESTED_DETAIL_TYPE = "EmailRequested";

export interface EventBridgeEmailRequesterOptions {
  readonly emitEvents: EmitEvents;
  /** For example "App" or the name of a Lambda function */
  readonly source: string;
}

/**
 * The detail is the contract with the request schema of the email function. The
 * function processes each `requestId` only once.
 */
export const createEventBridgeEmailRequester = ({
  emitEvents,
  source,
}: EventBridgeEmailRequesterOptions): ApplicationContext["email"] => ({
  request: ({ template, messages }) =>
    emitEvents([
      {
        Source: source,
        DetailType: EMAIL_REQUESTED_DETAIL_TYPE,
        Detail: JSON.stringify({ template, messages, requestId: createId() }),
      },
    ]),
});
