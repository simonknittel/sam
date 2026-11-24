import { log } from "./logger";

/**
 * A failed job does not stop the jobs after it. The invocation still fails at
 * the end, so that the failure is visible in the Lambda metrics.
 *
 * The object keys name the jobs in the logs. They are string literals, thus a
 * minifier cannot change them like a function name.
 */
export const runJobsInIsolation = async (
  jobs: Readonly<Record<string, (name: string) => Promise<void>>>,
) => {
  const failedJobs: string[] = [];

  for (const [name, job] of Object.entries(jobs)) {
    try {
      await job(name);
    } catch (error) {
      failedJobs.push(name);
      log.error("Job failed", { job: name, error });
    }
  }

  if (failedJobs.length > 0)
    throw new Error(`Failed jobs: ${failedJobs.join(", ")}`);
};
