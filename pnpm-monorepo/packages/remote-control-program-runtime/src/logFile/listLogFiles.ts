import { getSessionStartFromFileName } from "./selectLogFiles.js";
import type { LogFile } from "./types.js";

/**
 * The log files of Star Citizen in the folder that the owner selected. The
 * rule is the rule of the log file connector of the desktop companion
 * (`crates/core/src/log_file/file_system.rs` of the companion): the
 * installation folder (for example `…\Roberts Space Industries\StarCitizen`)
 * has one channel folder for each game channel, for example `LIVE` and
 * `PTU`. Each channel folder has its own `Game.log` and `logbackups/`. The
 * connector reads no other file, also not the other logs of the game (for
 * example in `Bin64/` or `Data/`).
 */

const LIVE_LOG_FILE_NAME = "Game.log";
const BACKUP_FOLDER_NAME = "logbackups";
const LOG_FILE_EXTENSION = ".log";

/**
 * The launcher writes this file into each channel folder. A channel folder of
 * a game that never started has no `Game.log` yet. Chromium gives access to
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
  /** Zero when the selected folder has no channel folder */
  readonly channelFolderCount: number;
  readonly logFiles: LogFile[];
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

const isChannelFolder = async (folder: FileSystemDirectoryHandle) =>
  (await findFile(folder, BUILD_MANIFEST_FILE_NAME)) !== null ||
  (await findFile(folder, LIVE_LOG_FILE_NAME)) !== null;

/** The direct subfolders that are channel folders, sorted by their name */
const listChannelFolders = async (folder: Folder) => {
  const channelFolders: Folder[] = [];
  for await (const handle of folder.handle.values())
    if (handle.kind === "directory" && (await isChannelFolder(handle)))
      channelFolders.push({ handle, path: `${folder.path}/${handle.name}` });

  return channelFolders.toSorted((first, second) =>
    first.handle.name.localeCompare(second.handle.name),
  );
};

/**
 * The channel folders for the selected folder: the selected folder when it
 * is a channel folder (for example `LIVE`), else its subfolders that are
 * channel folders (the installation folder), else the channel folders of
 * its subfolder `StarCitizen` (the folder of the launcher). A browser cannot
 * read the parent folders of the selected folder. Thus, different from the
 * desktop companion, a folder in a channel folder (for example `logbackups`)
 * gives no channel folder.
 */
const findChannelFolders = async (
  selectedFolder: FileSystemDirectoryHandle,
): Promise<Folder[]> => {
  const folder = { handle: selectedFolder, path: selectedFolder.name };
  if (await isChannelFolder(selectedFolder)) return [folder];

  const channelFolders = await listChannelFolders(folder);
  if (channelFolders.length > 0) return channelFolders;

  const installationFolder = await findFolder(folder, INSTALLATION_FOLDER_NAME);
  return installationFolder ? listChannelFolders(installationFolder) : [];
};

/**
 * A backup with a date in its name no longer changes, thus `knownFiles` saves
 * the call of `getFile()` for it. Null when the file cannot be read.
 */
const readLogFile = async (
  handle: FileSystemFileHandle,
  path: string,
  knownFiles: ReadonlyMap<string, LogFile>,
): Promise<LogFile | null> => {
  const knownFile = knownFiles.get(path);
  if (knownFile && getSessionStartFromFileName(handle.name) !== null)
    return knownFile;

  try {
    return { path, file: await handle.getFile() };
  } catch (error) {
    console.error("[Log Analyzer] Error getting file: %s", handle.name, error);
    return null;
  }
};

/** `Game.log` and the `.log` files in `logbackups/` of a channel folder */
const listChannelLogFiles = async (
  channelFolder: Folder,
  knownFiles: ReadonlyMap<string, LogFile>,
) => {
  const logFiles: (LogFile | null)[] = [];

  const liveLogFile = await findFile(channelFolder.handle, LIVE_LOG_FILE_NAME);
  if (liveLogFile)
    logFiles.push(
      await readLogFile(
        liveLogFile,
        `${channelFolder.path}/${LIVE_LOG_FILE_NAME}`,
        knownFiles,
      ),
    );

  const backupFolder = await findFolder(channelFolder, BACKUP_FOLDER_NAME);
  if (backupFolder)
    for await (const handle of backupFolder.handle.values())
      if (handle.kind === "file" && handle.name.endsWith(LOG_FILE_EXTENSION))
        logFiles.push(
          await readLogFile(
            handle,
            `${backupFolder.path}/${handle.name}`,
            knownFiles,
          ),
        );

  return logFiles.filter((logFile) => logFile !== null);
};

/**
 * The log files of all channel folders of the selected folder (see
 * `findChannelFolders()`). Live mode reads the folder every few seconds.
 */
export const listLogFiles = async (
  selectedFolder: FileSystemDirectoryHandle,
  knownFiles: ReadonlyMap<string, LogFile>,
): Promise<LogFileListing> => {
  const channelFolders = await findChannelFolders(selectedFolder);

  const logFiles: LogFile[] = [];
  for (const channelFolder of channelFolders)
    logFiles.push(...(await listChannelLogFiles(channelFolder, knownFiles)));

  return { channelFolderCount: channelFolders.length, logFiles };
};
