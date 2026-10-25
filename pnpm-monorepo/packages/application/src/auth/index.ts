/**
 * The effective roles of a citizen and the use cases of the sign-in, the
 * sessions, the email confirmation and the admin toolbar
 */
export { AuthErrorMessage } from "./authErrors.js";
export {
  confirmEmailWithToken,
  confirmEmailWithTokenInputSchema,
  type ConfirmEmailWithTokenInput,
  type ConfirmEmailWithTokenOutput,
} from "./confirmEmailWithToken.js";
export {
  deleteOwnSession,
  deleteOwnSessionInputSchema,
  type DeleteOwnSessionInput,
  type DeleteOwnSessionOptions,
  type DeleteOwnSessionOutput,
} from "./deleteOwnSession.js";
export {
  sendEmailConfirmation,
  type SendEmailConfirmationInput,
  type SendEmailConfirmationOutput,
} from "./emailConfirmationRequest.js";
export { enableDevelopmentLoginTwoFactor } from "./enableDevelopmentLoginTwoFactor.js";
export {
  findDevelopmentLoginUser,
  findDevelopmentLoginUserInputSchema,
  type FindDevelopmentLoginUserInput,
  type FindDevelopmentLoginUserOutput,
} from "./findDevelopmentLoginUser.js";
export {
  findSessionIdByToken,
  findSessionIdByTokenInputSchema,
  type FindSessionIdByTokenInput,
} from "./findSessionIdByToken.js";
export {
  getEffectiveRolesOfCitizen,
  type EffectiveRoles,
} from "./getEffectiveRolesOfCitizen.js";
export {
  listAssumableUsers,
  listAssumableUsersInputSchema,
  type AssumableUser,
  type ListAssumableUsersInput,
} from "./listAssumableUsers.js";
export { listDevelopmentLoginUsers } from "./listDevelopmentLoginUsers.js";
export {
  SessionSort,
  SessionStatus,
  listOwnSessions,
  listOwnSessionsInputSchema,
  type ListOwnSessionsInput,
  type ListOwnSessionsOptions,
  type OwnSession,
} from "./listOwnSessions.js";
export {
  purgeExpiredAuthenticationRecords,
  type PurgeExpiredAuthenticationRecordsOutput,
} from "./purgeExpiredAuthenticationRecords.js";
export {
  requestEmailConfirmation,
  type RequestEmailConfirmationOutput,
} from "./requestEmailConfirmation.js";

export {
  startAssumingUser,
  startAssumingUserInputSchema,
  type StartAssumingUserInput,
  type StartAssumingUserOutput,
} from "./startAssumingUser.js";
export {
  stopAssumingUser,
  stopAssumingUserInputSchema,
  type StopAssumingUserInput,
} from "./stopAssumingUser.js";
export {
  verifyEmail,
  verifyEmailInputSchema,
  type VerifyEmailInput,
  type VerifyEmailOutput,
} from "./verifyEmail.js";
