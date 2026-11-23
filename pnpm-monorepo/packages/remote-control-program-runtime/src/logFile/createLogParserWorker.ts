/**
 * Starts the Web Worker of the log file connector. The worker reads the files
 * itself, thus their text never reaches the main thread. It answers each
 * `ParseRequest` with `ResultMessage`s, and a `StopRequest` stops the reads
 * with a lower id between two files.
 *
 * The bundlers of the app find the worker in a dependency only in this form:
 * `new Worker(new URL(…, import.meta.url))`, with the path of the compiled
 * file next to this file in `dist`.
 */
export const createLogParserWorker = () =>
  new Worker(new URL("./logParser.worker.js", import.meta.url), {
    type: "module",
  });
