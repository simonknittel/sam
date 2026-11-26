/**
 * New flags should also be added to the unleash-bootstrap service in
 * compose.yml so the local Unleash container creates them on startup. The
 * flags of the Remote Control Program are `RemoteControlProgramUnleashFlag`
 * of the `domain` package (see `getRemoteControlProgramUnleashFlag()`).
 */
export enum UNLEASH_FLAG {
  EnableCareBearShooter = "EnableCareBearShooter",
  DisableRoleNameSuggestions = "DisableRoleNameSuggestions",
  CrashLogAnalyzer = "CrashLogAnalyzer",
  /** Stops the upload and the download of shared log analyzer entries. */
  DisableLogAnalyzerSharing = "DisableLogAnalyzerSharing",
  /** Stops the MCP endpoint, the OAuth endpoints and the consent page. */
  DisableMcpServer = "DisableMcpServer",
}
