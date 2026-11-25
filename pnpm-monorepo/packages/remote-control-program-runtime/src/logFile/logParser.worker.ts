import { createLogFileReader } from "./logFileReader.js";
import type { ParseRequest, ResultMessage, StopRequest } from "./types.js";

const readLogFiles = createLogFileReader();

/** One request at a time: a read continues where the last one stopped */
let queue = Promise.resolve();

let stopBeforeId = 0;

self.onmessage = (event: MessageEvent<ParseRequest | StopRequest>) => {
  if ("stopBeforeId" in event.data) {
    stopBeforeId = event.data.stopBeforeId;
    return;
  }

  const { id, files } = event.data;

  /**
   * Each request gets an answer, also when `postMessage` fails. A rejected
   * queue would skip all later requests.
   */
  queue = queue.then(async () => {
    try {
      const result = await readLogFiles(files, {
        shouldStop: () => id < stopBeforeId,
      });

      self.postMessage({ id, ...result } satisfies ResultMessage);
    } catch (error) {
      self.postMessage({ id, error: String(error) } satisfies ResultMessage);
    }
  });
};
