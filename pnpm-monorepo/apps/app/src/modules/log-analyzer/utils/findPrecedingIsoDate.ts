export const TIMESTAMP_AT_LINE_START = /^<([\d\-T:.Z]+)>/;

/** Longer than a timestamp, so the check reads only the start of a line */
const TIMESTAMP_PREFIX_LENGTH = 40;

/**
 * Null when no timestamped line exists before the position. See
 * `takesTimeOfPrecedingLine` of the domain package.
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

/**
 * Also of a last line which has no line end yet: the game writes the timestamp
 * first, thus the timestamp of a line which it still writes is complete.
 */
export const findLastIsoDate = (fileContent: string): string | null => {
  const lastLineStart = fileContent.lastIndexOf("\n") + 1;
  const match = TIMESTAMP_AT_LINE_START.exec(
    fileContent.slice(lastLineStart, lastLineStart + TIMESTAMP_PREFIX_LENGTH),
  );

  return match ? match[1] : findPrecedingIsoDate(fileContent, lastLineStart);
};
