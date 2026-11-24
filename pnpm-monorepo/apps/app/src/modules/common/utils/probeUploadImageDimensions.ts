import "server-only";

import { getApplicationContext } from "@/modules/application";
import { probeUploadImageDimensions as probeUploadImageDimensionsUseCase } from "@sam-monorepo/application";
import { after } from "next/server";

export const probeUploadImageDimensions = (uploadId: string) => {
  after(() =>
    probeUploadImageDimensionsUseCase(getApplicationContext(), { uploadId }),
  );
};
