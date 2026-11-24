import type { ApplicationContext } from "@sam-monorepo/application";
import { log } from "./logger";
import { captureAsyncFunc } from "./xray";

export const createJobFactory =
  (context: ApplicationContext) =>
  (automation: (context: ApplicationContext) => Promise<object>) =>
  (name: string) =>
    captureAsyncFunc(name, async () => {
      const output = await automation(context);
      log.info("Job finished", { job: name, ...output });
    });
