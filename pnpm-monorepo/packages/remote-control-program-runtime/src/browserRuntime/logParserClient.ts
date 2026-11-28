import { createLogParserWorker } from "../logFile/createLogParserWorker.js";
import type {
  LogFile,
  ParseRequest,
  ReadResult,
  ResultMessage,
  StopRequest,
} from "../logFile/types.js";

/** The part of `LogParserClient` that the log folder reader uses */
export type LogParser = Pick<
  LogParserClient,
  "parse" | "stopReads" | "terminate"
>;

interface PendingRequest {
  readonly resolve: (result: ReadResult) => void;
  readonly reject: (error: Error) => void;
}

/**
 * Finds the matches of the log files in the Web Worker of the log file
 * connector. The worker reads the files itself, thus their text never
 * reaches the main thread. The worker reads incrementally (see
 * `createLogFileReader`).
 *
 * One listener answers all requests. A listener for each request would keep
 * the data of its request in memory for as long as the worker lives.
 */
export class LogParserClient {
  readonly #worker = createLogParserWorker();
  readonly #pendingRequests = new Map<number, PendingRequest>();
  #nextRequestId = 0;
  #workerError: Error | null = null;

  constructor() {
    this.#worker.addEventListener(
      "message",
      (event: MessageEvent<ResultMessage>) => {
        const request = this.#pendingRequests.get(event.data.id);
        if (!request) return;

        this.#pendingRequests.delete(event.data.id);
        if ("error" in event.data) {
          request.reject(new Error(event.data.error));
        } else {
          request.resolve(event.data);
        }
      },
    );

    /**
     * The worker answers the errors of a request itself. Thus this error
     * means that the worker itself failed, for example because its chunk
     * did not load. It then answers no request, and the next requests must
     * fail at once.
     */
    this.#worker.addEventListener("error", (event) => {
      this.#workerError = new Error(event.message);
      this.#rejectPendingRequests(this.#workerError);
    });

    this.#worker.addEventListener("messageerror", () => {
      this.#rejectPendingRequests(
        new Error("The log parser sent no valid answer"),
      );
    });
  }

  /** Reads the lines of the files which were added since the last request */
  parse(files: readonly LogFile[]) {
    return new Promise<ReadResult>((resolve, reject) => {
      if (this.#workerError) {
        reject(this.#workerError);
        return;
      }

      const id = this.#nextRequestId;
      this.#nextRequestId += 1;
      this.#pendingRequests.set(id, { resolve, reject });

      const request: ParseRequest = { id, files };
      this.#worker.postMessage(request);
    });
  }

  /**
   * Stops the reads on their way between two files. Their answers hold the
   * matches of the files which they completed.
   */
  stopReads() {
    const request: StopRequest = { stopBeforeId: this.#nextRequestId };
    this.#worker.postMessage(request);
  }

  terminate() {
    this.#worker.terminate();
    this.#rejectPendingRequests(new Error("The log parser stopped"));
  }

  #rejectPendingRequests(error: Error) {
    for (const request of this.#pendingRequests.values()) request.reject(error);
    this.#pendingRequests.clear();
  }
}
