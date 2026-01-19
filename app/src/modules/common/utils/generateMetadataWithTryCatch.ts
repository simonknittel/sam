import { log } from "@/modules/logging";
import type { Metadata } from "next";
import { unstable_rethrow } from "next/navigation";
import { serializeError } from "serialize-error";

export const generateMetadataWithTryCatch = <T>(
  fn: (props: T) => Promise<Metadata>,
) => {
  return async (props: T) => {
    try {
      return await fn(props);
    } catch (error) {
      unstable_rethrow(error);

      if (error instanceof Error && error.message === "Unauthorized") {
        log.info("Unauthorized while generating metadata", {
          error: serializeError(error),
        });
      } else {
        log.error("Error while generating metadata", {
          error: serializeError(error),
        });
      }

      return {
        title: `Error`,
      };
    }
  };
};
