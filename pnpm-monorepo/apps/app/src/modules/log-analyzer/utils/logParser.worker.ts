import { createLogFileReader } from "./logFileReader";
import type { ParseRequest, ResultMessage, StopRequest } from "./types";

/**
 * The shortest time between two progress messages. A read of many small files
 * must not send one message for each file to the main thread.
 */
const PROGRESS_INTERVAL_MS = 100;

const readLogFiles = createLogFileReader();

/** One request at a time: a read continues where the last one stopped */
let queue = Promise.resolve();

let stopBeforeId = 0;

self.onmessage = (event: MessageEvent<ParseRequest | StopRequest>) => {
  if ("stopBeforeId" in event.data) {
    stopBeforeId = event.data.stopBeforeId;
    return;
  }

  const { id, files, isFullRead } = event.data;

  /**
   * Each request gets an answer, also when `postMessage` fails. A rejected
   * queue would skip all later requests.
   */
  queue = queue.then(async () => {
    let lastProgressAt = 0;

    try {
      const result = await readLogFiles(files, isFullRead, {
        shouldStop: () => id < stopBeforeId,
        onProgress: (progress) => {
          const now = performance.now();
          if (now - lastProgressAt < PROGRESS_INTERVAL_MS) return;

          lastProgressAt = now;
          self.postMessage({ id, progress } satisfies ResultMessage);
        },
      });

      self.postMessage({ id, ...result } satisfies ResultMessage);
    } catch (error) {
      self.postMessage({ id, error: String(error) } satisfies ResultMessage);
    }
  });
};
