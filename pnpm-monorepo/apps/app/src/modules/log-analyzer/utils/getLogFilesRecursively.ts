import { getSessionStartFromFileName } from "./selectLogFiles";
import type { LogFile } from "./types";

/**
 * Finds the log files below the given entry. A backup with a date in its name
 * no longer changes, thus `knownFiles` saves the call of `getFile()` for it.
 * Live mode walks the folder every few seconds.
 */
export async function* getLogFilesRecursively(
  entry: FileSystemFileHandle | FileSystemDirectoryHandle,
  knownFiles: ReadonlyMap<string, LogFile>,
  path = entry.name,
): AsyncGenerator<LogFile> {
  if (entry.kind === "file") {
    if (!entry.name.endsWith(".log")) return;

    const knownFile = knownFiles.get(path);
    if (knownFile && getSessionStartFromFileName(entry.name) !== null) {
      yield knownFile;
      return;
    }

    try {
      yield { path, file: await entry.getFile() };
    } catch (error) {
      console.error("[Log Analyzer] Error getting file: %s", entry.name, error);
    }
  } else if (entry.kind === "directory") {
    // TODO: Ignore subdirectories
    for await (const handle of entry.values()) {
      yield* getLogFilesRecursively(
        handle,
        knownFiles,
        `${path}/${handle.name}`,
      );
    }
  }
}
