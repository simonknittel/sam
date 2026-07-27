export async function* getFilesRecursively(
  entry: FileSystemFileHandle | FileSystemDirectoryHandle,
): AsyncGenerator<File | null> {
  if (entry.kind === "file") {
    try {
      const file = await entry.getFile();
      if (file) yield file;
    } catch (error) {
      console.error(`[Log Analyzer] Error getting file: ${entry.name}`, error);
      yield null;
    }
  } else if (entry.kind === "directory") {
    // TODO: Ignore subdirectories
    for await (const handle of entry.values()) {
      yield* getFilesRecursively(handle);
    }
  }
}
