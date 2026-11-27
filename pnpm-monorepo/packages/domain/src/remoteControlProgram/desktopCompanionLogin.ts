/**
 * The values of the login of the desktop companion (decision 35) and of its
 * connection tokens. The export of the shared definitions contains them, thus
 * the desktop companion has no copy of them (principle 11). The paths are
 * relative to the SAM address. The route folders of the app must agree with
 * the paths.
 */

/** RFC 8414 section 3 */
export const AUTHORIZATION_SERVER_METADATA_PATH =
  "/.well-known/oauth-authorization-server";

/** The resource (RFC 8707) and the audience of the access tokens */
export const REMOTE_CONTROL_PROGRAM_RESOURCE_PATH =
  "/api/remote-control-program";

/** RFC 9728 section 3.1: the well-known path with the path of the resource */
export const REMOTE_CONTROL_PROGRAM_PROTECTED_RESOURCE_METADATA_PATH = `/.well-known/oauth-protected-resource${REMOTE_CONTROL_PROGRAM_RESOURCE_PATH}`;

/**
 * The only scope of the Remote Control Program: the desktop companion gets
 * connection tokens for the runtime of the citizen of the user
 */
export const REMOTE_CONTROL_PROGRAM_SCOPE = "remote_control_program";

/**
 * The client id of the desktop companion is the URL of this path on the SAM
 * address: each environment has its own client id.
 */
export const DESKTOP_COMPANION_CLIENT_ID_PATH = `${REMOTE_CONTROL_PROGRAM_RESOURCE_PATH}/desktop-companion/client-metadata.json`;

/**
 * The program listens on a random port of the loopback interface for one
 * redirect, and adds this port to the URI. The authorization server ignores
 * the port of a loopback redirect URI (RFC 8252 section 7.3).
 */
export const DESKTOP_COMPANION_REDIRECT_URI = "http://127.0.0.1/callback";

/**
 * The route of the connection tokens of the runtimes: the session of the
 * browser runtime, or the Bearer access token of the desktop companion
 */
export const RUNTIME_CONNECTION_TOKEN_PATH = `${REMOTE_CONTROL_PROGRAM_RESOURCE_PATH}/connection-token`;
