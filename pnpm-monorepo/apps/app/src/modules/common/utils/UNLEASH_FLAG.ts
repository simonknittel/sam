/**
 * New flags should also be added to the unleash-bootstrap service in
 * compose.yml so the local Unleash container creates them on startup.
 */
export enum UNLEASH_FLAG {
  EnableCareBearShooter = "EnableCareBearShooter",
  DisableRoleNameSuggestions = "DisableRoleNameSuggestions",
  CrashLogAnalyzer = "CrashLogAnalyzer",
  /** Stops the upload and the download of shared log analyzer entries. */
  DisableLogAnalyzerSharing = "DisableLogAnalyzerSharing",
  /** Stops the MCP endpoint, the OAuth endpoints and the consent page. */
  DisableMcpServer = "DisableMcpServer",
  /**
   * Turns off all parts of the Remote Control Program. This flag and the next
   * two flags have the values of `RemoteControlProgramUnleashFlag` of the
   * `domain` package. Each of them is a kill switch: when it is on, its part
   * is off.
   */
  DisableRemoteControlProgram = "DisableRemoteControlProgram",
  /** The relay refuses the uploads of the log file connector. */
  DisableLogFileConnector = "DisableLogFileConnector",
  /** The relay refuses the uploads of `log_entries`, and the consumers read no log entries. */
  DisableLogEntriesCapability = "DisableLogEntriesCapability",
}
