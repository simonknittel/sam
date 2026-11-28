import { expect, test } from "vitest";
import { createLogFileReader } from "../logFile/logFileReader.js";
import { createLogFolderReader } from "./logFolderReader.js";
import type { LogParser } from "./logParserClient.js";

const GAME_VERSION = "4.10.201.48085";

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

/** A folder of the File System Access API, with the files in memory */
class FakeFolder {
  readonly kind = "directory";
  readonly name: string;
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
    const entry = this.#entries.get(name);
    return entry instanceof FakeFile
      ? Promise.resolve(entry)
      : Promise.reject(createLookupError(name, entry));
  }

  getDirectoryHandle(name: string) {
    const entry = this.#entries.get(name);
    return entry instanceof FakeFolder
      ? Promise.resolve(entry)
      : Promise.reject(createLookupError(name, entry));
  }

  values() {
    const entries = Array.from(this.#entries.values());
    return (async function* () {
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
const createLogFileContent = (channel: string, port: number) =>
  [
    "<2026-11-25T19:42:06.738Z> Log started on Wed Nov 25 19:42:06 2026",
    `<2026-11-25T19:42:06.738Z> Executable: C:\\Program Files\\Roberts Space Industries\\StarCitizen\\${channel}\\Bin64\\StarCitizen.exe`,
    `<2026-11-25T19:42:06.738Z> FileVersion: ${GAME_VERSION}`,
    joinLine(port),
    "",
  ].join("\r\n");

const BACKUP_PATH =
  "StarCitizen/LIVE/logbackups/Game Build(1) 04 Nov 26 (18 48 53).log";

/**
 * The folder of the launcher (`Roberts Space Industries`) of an owner: LIVE
 * and PTU with log files, EPTU before the first start of the game, and other
 * logs of the game and of the launcher, which the connector does not read
 */
const createLauncherFolder = () => {
  const files: Readonly<Record<string, string>> = {
    "StarCitizen/LIVE/build_manifest.id": "{}",
    "StarCitizen/LIVE/Game.log": createLogFileContent("LIVE", 1101),
    [BACKUP_PATH]: createLogFileContent("LIVE", 1103),
    "StarCitizen/LIVE/logbackups/notes.txt": joinLine(1901),
    "StarCitizen/LIVE/USER.cfg": "",
    "StarCitizen/LIVE/Bin64/crash.log": joinLine(1902),
    "StarCitizen/LIVE/Data/Logs/shaders.log": joinLine(1903),
    "StarCitizen/PTU/build_manifest.id": "{}",
    "StarCitizen/PTU/Game.log": createLogFileContent("PTU", 1102),
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
  const { matches, hasChannelFolder } = await reader.read([ALL_TIME]);

  return {
    hasChannelFolder,
    entries: matches
      .map(({ rawLine, gameChannel, gameVersion }) => ({
        port: Number(/port\[(?<port>\d+)\]/.exec(rawLine)?.groups?.port),
        gameChannel,
        gameVersion,
      }))
      .toSorted((first, second) => first.port - second.port),
  };
};

test("reads Game.log and the backups of all channel folders, each entry with the header of its own file", async () => {
  const folder = createLauncherFolder().getFolder("StarCitizen");

  // The game channel is the name of the folder in the header, not its path
  expect(await readFolder(folder)).toEqual({
    hasChannelFolder: true,
    entries: [
      { port: 1101, gameChannel: "LIVE", gameVersion: GAME_VERSION },
      { port: 1102, gameChannel: "PTU", gameVersion: GAME_VERSION },
      { port: 1103, gameChannel: "LIVE", gameVersion: GAME_VERSION },
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

    const { hasChannelFolder, entries } = await readFolder(folder);

    expect(hasChannelFolder).toBe(true);
    expect(entries.map(({ port }) => port)).toEqual(ports);
  },
);

test.each([
  "StarCitizen/LIVE/logbackups",
  "StarCitizen/LIVE/Bin64",
  "RSI Launcher",
])(
  "finds no channel folder in %s, because a browser cannot read the parent folders",
  async (path) => {
    const folder = createLauncherFolder().getFolder(path);

    expect(await readFolder(folder)).toEqual({
      hasChannelFolder: false,
      entries: [],
    });
  },
);
