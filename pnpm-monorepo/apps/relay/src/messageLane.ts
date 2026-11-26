type Task = () => Promise<void>;

/**
 * Runs the tasks of one connection one after the other, in the sequence of
 * their arrival. The tasks must not throw: each task sends its own answer.
 */
export class MessageLane {
  readonly #maximumWaitingTasks: number;
  readonly #onTaskError: (error: unknown) => void;
  readonly #waitingTasks: Task[] = [];
  /** The loop that runs the waiting tasks. Null while the lane is empty. */
  #run: Promise<void> | null = null;
  #isStopped = false;

  constructor(
    maximumWaitingTasks: number,
    onTaskError: (error: unknown) => void,
  ) {
    this.#maximumWaitingTasks = maximumWaitingTasks;
    this.#onTaskError = onTaskError;
  }

  /**
   * False when the lane is full or stopped: then the lane does not run the
   * task
   */
  enqueue(task: Task) {
    if (
      this.#isStopped ||
      this.#waitingTasks.length >= this.#maximumWaitingTasks
    )
      return false;

    this.#waitingTasks.push(task);
    this.#run ??= this.#runWaitingTasks();
    return true;
  }

  /** Removes the waiting tasks, and waits for the running task */
  async stop() {
    this.#isStopped = true;
    this.#waitingTasks.length = 0;
    await this.#run;
  }

  async #runWaitingTasks() {
    // The loop must not end before `enqueue()` keeps its promise, also when a task throws at once
    await null;

    for (
      let task = this.#waitingTasks.shift();
      task !== undefined;
      task = this.#waitingTasks.shift()
    ) {
      try {
        await task();
      } catch (error) {
        this.#onTaskError(error);
      }
    }

    this.#run = null;
  }
}
