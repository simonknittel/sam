"use client";

import { useCallback, useEffect, useRef } from "react";
import type {
  LogFile,
  ParseRequest,
  RawMatch,
  ResultMessage,
} from "../utils/types";

interface PendingRequest {
  readonly resolve: (matches: RawMatch[]) => void;
  readonly reject: (error: Error) => void;
}

/**
 * Finds the matches of the log files in a Web Worker. The worker reads the
 * files itself, thus their text never reaches the main thread. See
 * `createLogFileReader` for which lines a request reads.
 *
 * One listener answers all requests. A listener for each request would keep
 * the data of its request in memory for as long as the worker lives.
 */
export const useLogParser = () => {
  const workerRef = useRef<Worker | null>(null);
  const pendingRequestsRef = useRef(new Map<number, PendingRequest>());
  const nextRequestIdRef = useRef(0);
  const workerErrorRef = useRef<Error | null>(null);

  useEffect(() => {
    const worker = new Worker(
      new URL("../utils/logParser.worker.ts", import.meta.url),
      { type: "module" },
    );
    const pendingRequests = pendingRequestsRef.current;

    const rejectPendingRequests = (error: Error) => {
      for (const request of pendingRequests.values()) request.reject(error);
      pendingRequests.clear();
    };

    worker.addEventListener("message", (event: MessageEvent<ResultMessage>) => {
      const request = pendingRequests.get(event.data.id);
      if (!request) return;

      pendingRequests.delete(event.data.id);
      if ("error" in event.data) {
        request.reject(new Error(event.data.error));
      } else {
        request.resolve(event.data.matches);
      }
    });

    /**
     * The worker answers the errors of a request itself. Thus this error
     * means that the worker itself failed, for example because its chunk
     * did not load. It then answers no request, and the next requests must
     * fail at once.
     */
    worker.addEventListener("error", (event) => {
      workerErrorRef.current = new Error(event.message);
      rejectPendingRequests(workerErrorRef.current);
    });

    worker.addEventListener("messageerror", () => {
      rejectPendingRequests(new Error("The log parser sent no valid answer"));
    });

    workerRef.current = worker;

    return () => {
      worker.terminate();
      workerRef.current = null;
      /** A transition which waits forever holds up the transitions after it */
      rejectPendingRequests(new Error("The log parser stopped"));
    };
  }, []);

  return useCallback(
    (files: readonly LogFile[], isFullRead: boolean) =>
      new Promise<RawMatch[]>((resolve, reject) => {
        const worker = workerRef.current;
        if (!worker) {
          reject(new Error("The log parser is not running"));
          return;
        }
        if (workerErrorRef.current) {
          reject(workerErrorRef.current);
          return;
        }

        const id = nextRequestIdRef.current;
        nextRequestIdRef.current += 1;
        pendingRequestsRef.current.set(id, { resolve, reject });

        const request: ParseRequest = { id, files, isFullRead };
        worker.postMessage(request);
      }),
    [],
  );
};
