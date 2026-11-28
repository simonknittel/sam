import { getSessionStartFromFileName } from "./selectLogFiles.js";
import type { LogFile } from "./types.js";

/**
 * The log files of Star Citizen in the folder that the owner selected. The
 * rule is the rule of the log file connector of the desktop companion
 * (`crates/core/src/log_file/file_system.rs` of the companion): the
 * installation folder (for example `…\Roberts Space Industries\StarCitizen`)
 * has one environment folder for each game environment, for example `LIVE`
 * and `PTU`. Each environment folder has its own `Game.log` and
 * `logbackups/`. The connector reads no other file, also not the other logs
 * of the game (for example in `Bin64/` or `Data/`).
 *
 * Only an error of the selected folder (or of its folder `StarCitizen` in the
 * folder of the launcher) stops the listing. A `Game.log` or a `logbackups/`
 * that cannot be read does not hide the files of the other environment
 * folders, like in the desktop companion.
 */

const LIVE_LOG_FILE_NAME = "Game.log";
const BACKUP_FOLDER_NAME = "logbackups";
const LOG_FILE_EXTENSION = ".log";

/**
 * The launcher writes this file into each environment folder. An environment
 * folder of a game that never started has no `Game.log` yet. Chromium gives access to
 * `.id` files on Windows (it refuses only the extensions that
 * `download_file_types.asciipb` marks as dangerous, for example `.cfg`).
 */
const BUILD_MANIFEST_FILE_NAME = "build_manifest.id";

/**
 * The name of the installation folder in the folder of the launcher
 * (`Roberts Space Industries`)
 */
const INSTALLATION_FOLDER_NAME = "StarCitizen";

interface Folder {
  readonly handle: FileSystemDirectoryHandle;
  /** The path from the selected folder, for example `StarCitizen/LIVE` */
  readonly path: string;
}

export interface LogFileListing {
  /** Zero when the selected folder has no environment folder */
  readonly environmentFolderCount: number;
  readonly logFiles: LogFile[];
  /**
   * The log files and the `logbackups/` folders that could not be read. The
   * listing skips them, and the next listing tries them again.
   */
  readonly failedFileCount: number;
}

const isMissing = (error: unknown) =>
  error instanceof DOMException &&
  (error.name === "NotFoundError" || error.name === "TypeMismatchError");

/** Null when the folder has no file of this name */
const findFile = async (folder: FileSystemDirectoryHandle, name: string) => {
  try {
    return await folder.getFileHandle(name);
  } catch (error) {
    if (isMissing(error)) return null;
    throw error;
  }
};

/** Null when the folder has no folder of this name */
const findFolder = async (folder: Folder, name: string) => {
  try {
    return {
      handle: await folder.handle.getDirectoryHandle(name),
      path: `${folder.path}/${name}`,
    };
  } catch (error) {
    if (isMissing(error)) return null;
    throw error;
  }
};

const isEnvironmentFolder = async (folder: FileSystemDirectoryHandle) =>
  (await findFile(folder, BUILD_MANIFEST_FILE_NAME)) !== null ||
  (await findFile(folder, LIVE_LOG_FILE_NAME)) !== null;

/**
 * Like the desktop companion: a subfolder that cannot be read is no
 * environment folder
 */
const isReadableEnvironmentFolder = (folder: FileSystemDirectoryHandle) =>
  isEnvironmentFolder(folder).catch(() => false);

/** The direct subfolders that are environment folders, sorted by their name */
const listEnvironmentFolders = async (folder: Folder) => {
  const environmentFolders: Folder[] = [];
  for await (const handle of folder.handle.values())
    if (
      handle.kind === "directory" &&
      (await isReadableEnvironmentFolder(handle))
    )
      environmentFolders.push({
        handle,
        path: `${folder.path}/${handle.name}`,
      });

  return environmentFolders.toSorted((first, second) =>
    first.handle.name.localeCompare(second.handle.name),
  );
};

/**
 * The environment folders for the selected folder: the selected folder when
 * it is an environment folder (for example `LIVE`), else its subfolders that
 * are environment folders (the installation folder), else the environment
 * folders of its subfolder `StarCitizen` (the folder of the launcher). A
 * browser cannot read the parent folders of the selected folder. Thus,
 * different from the desktop companion, a folder in an environment folder
 * (for example `logbackups`) gives no environment folder.
 */
const findEnvironmentFolders = async (
  selectedFolder: FileSystemDirectoryHandle,
): Promise<Folder[]> => {
  const folder = { handle: selectedFolder, path: selectedFolder.name };
  if (await isEnvironmentFolder(selectedFolder)) return [folder];

  const environmentFolders = await listEnvironmentFolders(folder);
  if (environmentFolders.length > 0) return environmentFolders;

  const installationFolder = await findFolder(folder, INSTALLATION_FOLDER_NAME);
  return installationFolder ? listEnvironmentFolders(installationFolder) : [];
};

/**
 * A backup with a date in its name no longer changes, thus `knownFiles` saves
 * the call of `getFile()` for it
 */
const readLogFile = async (
  handle: FileSystemFileHandle,
  path: string,
  knownFiles: ReadonlyMap<string, LogFile>,
): Promise<LogFile> => {
  const knownFile = knownFiles.get(path);
  if (knownFile && getSessionStartFromFileName(handle.name) !== null)
    return knownFile;

  return { path, file: await handle.getFile() };
};

/**
 * `Game.log` and the `.log` files in `logbackups/` of an environment folder.
 * A part that cannot be read counts as one failed file. The files after an
 * error of `logbackups/` are not known.
 */
const listEnvironmentLogFiles = async (
  environmentFolder: Folder,
  knownFiles: ReadonlyMap<string, LogFile>,
) => {
  const logFiles: LogFile[] = [];
  let failedFileCount = 0;

  const skipFailure = async (readPart: () => Promise<void>) => {
    try {
      await readPart();
    } catch (error) {
      console.error("[Log Analyzer] Error listing a log file:", error);
      failedFileCount += 1;
    }
  };

  await skipFailure(async () => {
    const liveLogFile = await findFile(
      environmentFolder.handle,
      LIVE_LOG_FILE_NAME,
    );
    if (liveLogFile)
      logFiles.push(
        await readLogFile(
          liveLogFile,
          `${environmentFolder.path}/${LIVE_LOG_FILE_NAME}`,
          knownFiles,
        ),
      );
  });

  await skipFailure(async () => {
    const backupFolder = await findFolder(
      environmentFolder,
      BACKUP_FOLDER_NAME,
    );
    if (!backupFolder) return;

    for await (const handle of backupFolder.handle.values())
      if (handle.kind === "file" && handle.name.endsWith(LOG_FILE_EXTENSION))
        await skipFailure(async () => {
          logFiles.push(
            await readLogFile(
              handle,
              `${backupFolder.path}/${handle.name}`,
              knownFiles,
            ),
          );
        });
  });

  return { logFiles, failedFileCount };
};

/**
 * The log files of all environment folders of the selected folder (see
 * `findEnvironmentFolders()`). Live mode reads the folder every few seconds.
 */
export const listLogFiles = async (
  selectedFolder: FileSystemDirectoryHandle,
  knownFiles: ReadonlyMap<string, LogFile>,
): Promise<LogFileListing> => {
  const environmentFolders = await findEnvironmentFolders(selectedFolder);

  const logFiles: LogFile[] = [];
  let failedFileCount = 0;
  for (const environmentFolder of environmentFolders) {
    const listing = await listEnvironmentLogFiles(
      environmentFolder,
      knownFiles,
    );
    logFiles.push(...listing.logFiles);
    failedFileCount += listing.failedFileCount;
  }

  return {
    environmentFolderCount: environmentFolders.length,
    logFiles,
    failedFileCount,
  };
};
