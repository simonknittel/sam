/** A supporting file of a skill, for example a reference */
export interface SkillFile {
  /**
   * Relative to the root of the skill, with `/` as the separator. The
   * instructions link to the file with this path.
   */
  readonly path: string;
  /** English. Tells the model what the file explains. */
  readonly description: string;
  /** Markdown */
  readonly content: string;
}

/**
 * A skill of the Agent Skills specification (https://agentskills.io). The
 * server serves it with the Skills extension of MCP.
 */
export interface SkillDefinition {
  /**
   * Lowercase letters, digits and single dashes, at most 64 characters. Also
   * the directory of the skill in its URI.
   */
  readonly name: string;
  /**
   * English, at most 1024 characters. Tells the model what the skill
   * explains and when to load it.
   */
  readonly description: string;
  /** The Markdown of `SKILL.md` after the frontmatter */
  readonly instructions: string;
  readonly files: readonly SkillFile[];
}
