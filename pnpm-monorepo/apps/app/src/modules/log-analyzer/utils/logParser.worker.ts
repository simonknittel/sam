import { createLogFileReader } from "./logFileReader";
import type { ParseRequest, ResultMessage } from "./types";

const readLogFiles = createLogFileReader();

/** One request at a time: a read continues where the last one stopped */
let queue = Promise.resolve();

self.onmessage = (event: MessageEvent<ParseRequest>) => {
  const { id, files, isFullRead } = event.data;

  /**
   * Each request gets an answer, also when `postMessage` fails. A rejected
   * queue would skip all later requests.
   */
  queue = queue.then(async () => {
    try {
      self.postMessage({
        id,
        matches: await readLogFiles(files, isFullRead),
      } satisfies ResultMessage);
    } catch (error) {
      self.postMessage({ id, error: String(error) } satisfies ResultMessage);
    }
  });
};
