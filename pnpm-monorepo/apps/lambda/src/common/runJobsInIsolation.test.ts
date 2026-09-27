import { expect, test, vi } from "vitest";
import { runJobsInIsolation } from "./runJobsInIsolation";

vi.mock("./logger", () => ({
  log: { error: vi.fn() },
}));

test("a failed job does not stop the next jobs, but fails the run", async () => {
  const laterJob = vi.fn(async () => {});

  await expect(
    runJobsInIsolation({
      failingJob: async () => {
        throw new Error("boom");
      },
      laterJob,
    }),
  ).rejects.toThrow("Failed jobs: failingJob");

  expect(laterJob).toHaveBeenCalledOnce();
});
