import { describe, expect, test } from "vitest";
import { getSessionStartFromFileName, selectLogFiles } from "./selectLogFiles";

const createLogFile = (name: string, lastModified: Date, content = "") => ({
  path: `LIVE/logbackups/${name}`,
  file: new File([content], name, { lastModified: lastModified.getTime() }),
});

const selectFileNames = async (
  logFiles: ReturnType<typeof createLogFile>[],
  start: Date | null,
  end: Date | null,
) =>
  (await selectLogFiles(logFiles, { start, end })).map(
    (logFile) => logFile.file.name,
  );

const startOfDay = (year: number, month: number, day: number) =>
  new Date(year, month, day);

const endOfDay = (year: number, month: number, day: number) =>
  new Date(year, month, day, 23, 59, 59, 999);

describe("getSessionStartFromFileName", () => {
  test("reads the local start time of a backup", () => {
    expect(
      getSessionStartFromFileName(
        "Game Build(12913470) 04 Nov 26 (18 48 53).log",
      ),
    ).toBe(new Date(2026, 10, 4, 18, 48, 53).getTime());
  });

  test.each(["Game.log", "Game Build(1) 04 Mai 26 (18 48 53).log"])(
    "gives null for %s",
    (fileName) => {
      expect(getSessionStartFromFileName(fileName)).toBeNull();
    },
  );
});

describe("selectLogFiles", () => {
  const overMidnight = createLogFile(
    "Game Build(11715810) 01 May 26 (18 55 13).log",
    new Date(2026, 4, 2, 0, 2),
  );

  test("selects a session which runs past the end of the window", async () => {
    expect(
      await selectFileNames(
        [overMidnight],
        startOfDay(2026, 3, 28),
        endOfDay(2026, 4, 1),
      ),
    ).toEqual([overMidnight.file.name]);
  });

  test("selects a session which began before the start of the window", async () => {
    expect(
      await selectFileNames(
        [overMidnight],
        startOfDay(2026, 4, 2),
        endOfDay(2026, 4, 3),
      ),
    ).toEqual([overMidnight.file.name]);
  });

  test("selects a crashed session whose last change is too old", async () => {
    const crashed = createLogFile(
      "Game Build(11825000) 16 May 26 (23 30 00).log",
      new Date(2026, 4, 16, 23, 40),
    );

    expect(
      await selectFileNames(
        [crashed],
        startOfDay(2026, 4, 17),
        endOfDay(2026, 4, 17),
      ),
    ).toEqual([crashed.file.name]);
  });

  test("leaves out sessions which are clearly outside the window", async () => {
    const older = createLogFile(
      "Game Build(1) 10 Apr 26 (10 00 00).log",
      new Date(2026, 3, 10, 12),
    );
    const inside = createLogFile(
      "Game Build(1) 10 May 26 (10 00 00).log",
      new Date(2026, 4, 10, 12),
    );
    const newer = createLogFile(
      "Game Build(1) 10 Jun 26 (10 00 00).log",
      new Date(2026, 5, 10, 12),
    );

    expect(
      await selectFileNames(
        [older, inside, newer],
        startOfDay(2026, 4, 1),
        endOfDay(2026, 4, 31),
      ),
    ).toEqual([inside.file.name]);
  });

  test("a window without an end selects all newer sessions", async () => {
    const newer = createLogFile(
      "Game Build(1) 10 Jun 26 (10 00 00).log",
      new Date(2026, 5, 10, 12),
    );

    expect(
      await selectFileNames([newer], startOfDay(2026, 4, 1), null),
    ).toEqual([newer.file.name]);
  });

  test("reads the first line of a file without a date in its name", async () => {
    const liveLog = createLogFile(
      "Game.log",
      new Date(2026, 10, 4, 21, 28),
      `<2026-11-04T18:03:00.347Z> BackupNameAttachment=" Build(12913470) 04 Nov 26 (19 02 52)"  -- used by backup system\r\n`,
    );

    expect(
      await selectFileNames(
        [liveLog],
        startOfDay(2026, 9, 1),
        endOfDay(2026, 9, 15),
      ),
    ).toEqual([]);

    expect(
      await selectFileNames(
        [liveLog],
        startOfDay(2026, 10, 1),
        endOfDay(2026, 10, 30),
      ),
    ).toEqual([liveLog.file.name]);
  });

  test("selects a file without any date when its last change fits", async () => {
    const emptyLog = createLogFile("Game.log", new Date(2026, 4, 2));

    expect(
      await selectFileNames(
        [emptyLog],
        startOfDay(2026, 4, 1),
        endOfDay(2026, 4, 1),
      ),
    ).toEqual([emptyLog.file.name]);
  });
});
