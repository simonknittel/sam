import { afterEach, expect, test, vi } from "vitest";
import { createLogFileReader } from "../logFile/logFileReader.js";
import { createLogFolderReader } from "./logFolderReader.js";
import type { LogParser } from "./logParserClient.js";

const ALL_TIME = { start: null, end: null };

class FakeFile {
  readonly kind = "file";
  readonly name: string;
  readonly #content: string;

  constructor(name: string, content: string) {
    this.name = name;
    this.#content = content;
  }

  getFile() {
    return Promise.resolve(new File([this.#content], this.name));
  }
}

/** The error of the File System Access API for a missing entry or an entry of the other kind */
const createLookupError = (name: string, entry: unknown) =>
  new DOMException(name, entry ? "TypeMismatchError" : "NotFoundError");

/** The error of the File System Access API for a folder without the access of the operating system */
const createReadError = (name: string) =>
  new DOMException(name, "NotReadableError");

/** A folder of the File System Access API, with the files in memory */
class FakeFolder {
  readonly kind = "directory";
  readonly name: string;
  isReadable = true;
  readonly #entries = new Map<string, FakeFolder | FakeFile>();

  constructor(name: string) {
    this.name = name;
  }

  getOrCreateFolder(name: string) {
    const entry = this.#entries.get(name);
    if (entry instanceof FakeFolder) return entry;

    const folder = new FakeFolder(name);
    this.#entries.set(name, folder);
    return folder;
  }

  writeFile(name: string, content: string) {
    this.#entries.set(name, new FakeFile(name, content));
  }

  getFileHandle(name: string) {
    if (!this.isReadable) return Promise.reject(createReadError(name));

    const entry = this.#entries.get(name);
    return entry instanceof FakeFile
      ? Promise.resolve(entry)
      : Promise.reject(createLookupError(name, entry));
  }

  getDirectoryHandle(name: string) {
    if (!this.isReadable) return Promise.reject(createReadError(name));

    const entry = this.#entries.get(name);
    return entry instanceof FakeFolder
      ? Promise.resolve(entry)
      : Promise.reject(createLookupError(name, entry));
  }

  values() {
    const { isReadable, name } = this;
    const entries = Array.from(this.#entries.values());
    return (async function* () {
      if (!isReadable) throw createReadError(name);
      yield* entries;
    })();
  }

  /** The folder at the path. A missing folder is an error. */
  getFolder(path: string) {
    return path.split("/").reduce<FakeFolder>((parent, name) => {
      const entry = parent.#entries.get(name);
      if (!(entry instanceof FakeFolder))
        throw new Error(`The folder ${name} is missing`);
      return entry;
    }, this);
  }
}

const joinLine = (port: number) =>
  `<2026-11-25T20:00:00.000Z> [Notice] <Join PU> address[35.187.166.216] port[${port}] shard[pub_euw1b_9873572_100] locationId[-281470681677823] [Team_GameServices][GIM][Matchmaking]`;

/** A log file of the game with the lines of its header, and one join */
const createLogFileContent = (
  environment: string,
  build: string,
  port: number,
) =>
  [
    `<2026-11-25T19:42:06.738Z> BackupNameAttachment=" Build(${build}) 25 Nov 26 (20 41 58)"  -- used by backup system`,
    "<2026-11-25T19:42:06.738Z> Log started on Wed Nov 25 19:42:06 2026",
    `<2026-11-25T19:42:06.738Z> Executable: C:\\Program Files\\Roberts Space Industries\\StarCitizen\\${environment}\\Bin64\\StarCitizen.exe`,
    "<2026-11-25T19:42:06.738Z> FileVersion: 4.10.201.48085",
    joinLine(port),
    "",
  ].join("\r\n");

const LIVE_BUILD = "13220821";
const PTU_BUILD = "13284307";
/** A session of the build before */
const OLDER_LIVE_BUILD = "13198765";

const BACKUP_PATH = `StarCitizen/LIVE/logbackups/Game Build(${OLDER_LIVE_BUILD}) 24 Nov 26 (18 48 53).log`;

/**
 * The folder of the launcher (`Roberts Space Industries`) of an owner: LIVE
 * and PTU with log files, EPTU before the first start of the game, and other
 * logs of the game and of the launcher, which the connector does not read
 */
const createLauncherFolder = () => {
  const files: Readonly<Record<string, string>> = {
    "StarCitizen/LIVE/build_manifest.id": "{}",
    "StarCitizen/LIVE/Game.log": createLogFileContent("LIVE", LIVE_BUILD, 1101),
    [BACKUP_PATH]: createLogFileContent("LIVE", OLDER_LIVE_BUILD, 1103),
    "StarCitizen/LIVE/logbackups/notes.txt": joinLine(1901),
    "StarCitizen/LIVE/USER.cfg": "",
    "StarCitizen/LIVE/Bin64/crash.log": joinLine(1902),
    "StarCitizen/LIVE/Data/Logs/shaders.log": joinLine(1903),
    "StarCitizen/PTU/build_manifest.id": "{}",
    "StarCitizen/PTU/Game.log": createLogFileContent("PTU", PTU_BUILD, 1102),
    "StarCitizen/EPTU/build_manifest.id": "{}",
    "StarCitizen/PSOCacheGen.log": joinLine(1904),
    "RSI Launcher/logs/log.log": joinLine(1905),
  };

  const launcherFolder = new FakeFolder("Roberts Space Industries");
  for (const [path, content] of Object.entries(files)) {
    const folderNames = path.split("/");
    const fileName = folderNames.pop()!;
    folderNames
      .reduce(
        (parent, folderName) => parent.getOrCreateFolder(folderName),
        launcherFolder,
      )
      .writeFile(fileName, content);
  }
  return launcherFolder;
};

/** The parser of the Web Worker, in the thread of the test */
const createParser = (): LogParser => {
  const readLogFiles = createLogFileReader();
  return {
    parse: (files) => readLogFiles(files),
    stopReads: () => {},
    terminate: () => {},
  };
};

const readFolder = async (folder: FakeFolder) => {
  const reader = createLogFolderReader(
    folder as unknown as FileSystemDirectoryHandle,
    createParser(),
  );
  const { matches, hasEnvironmentFolder, failedFileCount } = await reader.read([
    ALL_TIME,
  ]);

  return {
    hasEnvironmentFolder,
    failedFileCount,
    entries: matches
      .map(({ rawLine, gameEnvironment, gameBuild }) => ({
        port: Number(/port\[(?<port>\d+)\]/.exec(rawLine)?.groups?.port),
        gameEnvironment,
        gameBuild,
      }))
      .toSorted((first, second) => first.port - second.port),
  };
};

afterEach(() => {
  vi.restoreAllMocks();
});

test("reads Game.log and the backups of all environment folders, each entry with the header of its own file", async () => {
  const folder = createLauncherFolder().getFolder("StarCitizen");

  // The game environment is the name of the folder in the header, not its path
  expect(await readFolder(folder)).toEqual({
    hasEnvironmentFolder: true,
    failedFileCount: 0,
    entries: [
      { port: 1101, gameEnvironment: "LIVE", gameBuild: LIVE_BUILD },
      { port: 1102, gameEnvironment: "PTU", gameBuild: PTU_BUILD },
      { port: 1103, gameEnvironment: "LIVE", gameBuild: OLDER_LIVE_BUILD },
    ],
  });
});

test.each([
  { selected: "the launcher", path: null, ports: [1101, 1102, 1103] },
  { selected: "LIVE", path: "StarCitizen/LIVE", ports: [1101, 1103] },
])(
  "reads the log files of the folder of $selected",
  async ({ path, ports }) => {
    const launcherFolder = createLauncherFolder();
    const folder =
      path === null ? launcherFolder : launcherFolder.getFolder(path);

    const { hasEnvironmentFolder, entries } = await readFolder(folder);

    expect(hasEnvironmentFolder).toBe(true);
    expect(entries.map(({ port }) => port)).toEqual(ports);
  },
);

test.each([
  "StarCitizen/LIVE/logbackups",
  "StarCitizen/LIVE/Bin64",
  "RSI Launcher",
])(
  "finds no environment folder in %s, because a browser cannot read the parent folders",
  async (path) => {
    const folder = createLauncherFolder().getFolder(path);

    expect(await readFolder(folder)).toEqual({
      hasEnvironmentFolder: false,
      failedFileCount: 0,
      entries: [],
    });
  },
);

test("an unreadable logbackups/ of one environment folder does not stop the read of the others, but an unreadable selected folder does", async () => {
  vi.spyOn(console, "error").mockImplementation(() => undefined);
  const launcherFolder = createLauncherFolder();
  launcherFolder.getFolder("StarCitizen/LIVE/logbackups").isReadable = false;

  const { hasEnvironmentFolder, failedFileCount, entries } =
    await readFolder(launcherFolder);

  expect(hasEnvironmentFolder).toBe(true);
  expect(failedFileCount).toBe(1);
  expect(entries.map(({ port }) => port)).toEqual([1101, 1102]);

  launcherFolder.isReadable = false;
  await expect(readFolder(launcherFolder)).rejects.toThrow(DOMException);
});
