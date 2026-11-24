import {
  getApplicationContext,
  isApplicationError,
  mapApplicationErrorToRouteResponse,
  toActor,
} from "@/modules/application";
import { requireAuthenticationApi } from "@/modules/auth/server";
import apiErrorHandler from "@/modules/common/utils/apiErrorHandler";
import {
  createUpload,
  createUploadInputSchema,
} from "@sam-monorepo/application";
import { NextResponse } from "next/server";
import * as z from "zod";

/** The wire contract of the clients (`useUpload`, `uploadWikiPageFile`) */
const postBodySchema = z.object({
  category: z.string().optional(),
  fileName: z.string(),
  mimeType: z.string(),
  size: z.number(),
});

export async function POST(request: Request) {
  try {
    const authentication = await requireAuthenticationApi(
      "/api/upload",
      "POST",
    );

    const body = postBodySchema.parse(await request.json());
    const input = createUploadInputSchema.parse({
      category: body.category,
      file_name: body.fileName,
      mime_type: body.mimeType,
      size: body.size,
    });

    const result = await createUpload(
      getApplicationContext(),
      await toActor(authentication.session),
      input,
    );

    return NextResponse.json({
      item: {
        id: result.upload.id,
        fileName: result.upload.file_name,
        mimeType: result.upload.mime_type,
        size: result.upload.size,
      },
      presignedUploadUrl: result.presigned_upload_url,
    });
  } catch (error) {
    if (isApplicationError(error))
      return mapApplicationErrorToRouteResponse(error);

    return apiErrorHandler(error);
  }
}
