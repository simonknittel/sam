import { spawn, type ChildProcess } from "node:child_process";
import net from "node:net";
import { setTimeout as sleep } from "node:timers/promises";

interface RunCommandOptions {
  readonly cwd: string;
  readonly env?: Readonly<Record<string, string>>;
  readonly label: string;
}

/** Runs a command to completion, inheriting stdout/stderr for visibility. */
export const runCommand = (
  command: string,
  commandArguments: readonly string[],
  { cwd, env, label }: RunCommandOptions,
) =>
  new Promise<void>((resolve, reject) => {
    const child = spawn(command, commandArguments, {
      cwd,
      env: { ...process.env, ...env },
      stdio: "inherit",
    });

    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${label} exited with code ${code}`));
      }
    });
  });

export const getFreePort = () =>
  new Promise<number>((resolve, reject) => {
    const server = net.createServer();
    server.once("error", reject);
    server.listen(0, () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        reject(new Error("Failed to determine a free port"));
        return;
      }
      server.close(() => resolve(address.port));
    });
  });

const APP_READY_TIMEOUT_MS = 90_000;
const APP_POLL_INTERVAL_MS = 250;

/**
 * Polls the app until it responds. The child process exiting early (e.g. a
 * missing build) fails fast instead of waiting for the full timeout.
 */
export const waitForHttpOk = async (url: string, child: ChildProcess) => {
  const deadline = Date.now() + APP_READY_TIMEOUT_MS;
  let exited = false;
  child.once("exit", () => {
    exited = true;
  });

  while (Date.now() < deadline) {
    if (exited) throw new Error(`Process exited before ${url} became ready`);

    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(5000),
      });
      if (response.ok) return;
    } catch {
      // Not ready yet
    }

    await sleep(APP_POLL_INTERVAL_MS);
  }

  throw new Error(`Timed out waiting for ${url} to become ready`);
};

export const stopProcess = async (child: ChildProcess) => {
  if (child.exitCode !== null || child.signalCode !== null) return;

  const exited = new Promise<void>((resolve) => {
    child.once("exit", () => resolve());
  });

  child.kill("SIGTERM");
  const result = await Promise.race([
    exited.then(() => "exited" as const),
    sleep(10_000).then(() => "timeout" as const),
  ]);
  if (result === "timeout") {
    child.kill("SIGKILL");
    await exited;
  }
};
