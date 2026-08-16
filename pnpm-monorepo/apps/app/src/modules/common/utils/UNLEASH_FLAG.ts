/**
 * New flags should also be added to the unleash-bootstrap service in
 * compose.yml so the local Unleash container creates them on startup.
 */
export enum UNLEASH_FLAG {
  DisableAlgolia = "DisableAlgolia",
  EnableCareBearShooter = "EnableCareBearShooter",
  DisableRoleNameSuggestions = "DisableRoleNameSuggestions",
  CrashLogAnalyzer = "CrashLogAnalyzer",
}
