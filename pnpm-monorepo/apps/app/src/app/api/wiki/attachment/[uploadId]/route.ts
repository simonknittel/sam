import { getApplicationContext, toActor } from "@/modules/application";
import { requireAuthenticationApi } from "@/modules/auth/server";
import apiErrorHandler from "@/modules/common/utils/apiErrorHandler";
import {
  createWikiAttachmentDownloadUrl,
  createWikiAttachmentDownloadUrlInputSchema,
  idSchema,
  NotFoundError,
} from "@sam-monorepo/application";
import { NextResponse } from "next/server";
import * as z from "zod";

const paramsSchema = z.object({ uploadId: idSchema });

/**
 * Downloads an attachment of a wiki page for a user who can see a page with
 * the upload. The route redirects to a presigned URL with a short lifetime
 * (see `createWikiAttachmentDownloadUrl()`). The check does not protect the
 * object itself: the bucket is public, and only the id of the upload is hard
 * to guess.
 */
export async function GET(
  _request: Request,
  context: RouteContext<"/api/wiki/attachment/[uploadId]">,
) {
  try {
    const authentication = await requireAuthenticationApi(
      "/api/wiki/attachment/[uploadId]",
      "GET",
    );

    const paramsData = paramsSchema.parse(await context.params);

    const { url } = await createWikiAttachmentDownloadUrl(
      getApplicationContext(),
      await toActor(authentication.session),
      createWikiAttachmentDownloadUrlInputSchema.parse({
        upload_id: paramsData.uploadId,
      }),
    );

    return NextResponse.redirect(url, 307);
  } catch (error) {
    // A page that the user cannot see and an upload outside the wiki give
    // 404, not 403: the answer must not show that they exist. Without a
    // bucket, the route answers 500.
    if (error instanceof NotFoundError)
      return NextResponse.json({ error: "Not Found" }, { status: 404 });

    return apiErrorHandler(error);
  }
}
