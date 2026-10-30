/**
 * The codes of the `error` search param of the login page. next-auth also
 * sets this search param, thus the values of its codes must stay the same.
 */
export enum LoginError {
  UserBanned = "UserBanned",
  NotGuildMember = "NotGuildMember",
  LoginCancelled = "LoginCancelled",
  DiscordUnavailable = "DiscordUnavailable",
  DiscordEmailMissing = "DiscordEmailMissing",
  /**
   * From next-auth: the state cookie is missing or expired, or the token
   * exchange with Discord failed.
   */
  OAuthCallback = "OAuthCallback",
  /**
   * All other failures. The login page shows the same message for each code
   * that it does not know, for example for the other codes of next-auth.
   */
  LoginFailed = "LoginFailed",
}

export const isLoginError = (value: string): value is LoginError =>
  Object.values<string>(LoginError).includes(value);

export const getLoginErrorPath = (error: LoginError) =>
  `/?${new URLSearchParams({ error }).toString()}`;
