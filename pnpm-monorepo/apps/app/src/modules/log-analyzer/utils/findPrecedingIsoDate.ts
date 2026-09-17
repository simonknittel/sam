const TIMESTAMP_AT_LINE_START = /^<([\d\-T:.Z]+)>/;

/** Longer than a timestamp, so the check reads only the start of a line */
const TIMESTAMP_PREFIX_LENGTH = 40;

/**
 * The time of the last timestamped line before the given position of the
 * file. Null when no such line exists. See `Pattern.takesTimeOfPrecedingLine`.
 */
export const findPrecedingIsoDate = (
  fileContent: string,
  position: number,
): string | null => {
  /** The line end before the line which holds the position */
  let lineEnd = fileContent.lastIndexOf("\n", position - 1);

  while (lineEnd >= 0) {
    const lineStart =
      lineEnd === 0 ? 0 : fileContent.lastIndexOf("\n", lineEnd - 1) + 1;

    const match = TIMESTAMP_AT_LINE_START.exec(
      fileContent.slice(lineStart, lineStart + TIMESTAMP_PREFIX_LENGTH),
    );
    if (match) return match[1];

    lineEnd = lineStart - 1;
  }

  return null;
};
