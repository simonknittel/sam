/**
 * App events interpret their datetime inputs as fixed Europe/Berlin wall
 * time, matching the app-wide rendering convention (`timeZone:
 * "Europe/Berlin"`). Pure and dependency-free (built on Intl) so both the
 * server actions and the client-side "your local time" hint share the exact
 * same conversion.
 */

const BERLIN_TIME_ZONE = "Europe/Berlin";

const WALL_TIME_PATTERN = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/;

const berlinOffsetMilliseconds = (instant: Date): number => {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: BERLIN_TIME_ZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    })
      .formatToParts(instant)
      .map((part) => [part.type, part.value]),
  );

  const shownAsUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    // Intl renders midnight as "24" with hour12: false
    Number(parts.hour) % 24,
    Number(parts.minute),
    Number(parts.second),
  );

  return shownAsUtc - instant.getTime();
};

/**
 * Interprets a naive `datetime-local` value ("YYYY-MM-DDTHH:mm") as
 * Europe/Berlin wall time and returns the UTC instant. DST edge cases are
 * deterministic: a wall time inside the spring-forward gap (e.g. 02:30 on
 * the last Sunday of March) maps to the instant one hour later, an
 * ambiguous fall-back wall time resolves to the later (standard time)
 * instant.
 */
export const berlinWallTimeToUtc = (wallTime: string): Date => {
  const match = WALL_TIME_PATTERN.exec(wallTime);
  if (!match) throw new Error(`Invalid wall time: ${wallTime}`);

  const [, year, month, day, hour, minute] = match;
  const pretendedUtc = Date.UTC(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
  );

  /**
   * Two fixed passes: the first guesses the offset at the pretended-UTC
   * instant, the second corrects it with the offset at the guessed instant.
   */
  const firstGuess =
    pretendedUtc - berlinOffsetMilliseconds(new Date(pretendedUtc));
  return new Date(
    pretendedUtc - berlinOffsetMilliseconds(new Date(firstGuess)),
  );
};

/**
 * Formats a UTC instant as the `datetime-local` value ("YYYY-MM-DDTHH:mm")
 * showing its Europe/Berlin wall time — the inverse of
 * `berlinWallTimeToUtc` for prefilling edit forms.
 */
export const utcToBerlinWallTime = (instant: Date): string => {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: BERLIN_TIME_ZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    })
      .formatToParts(instant)
      .map((part) => [part.type, part.value]),
  );

  const hour = String(Number(parts.hour) % 24).padStart(2, "0");
  return `${parts.year}-${parts.month}-${parts.day}T${hour}:${parts.minute}`;
};
