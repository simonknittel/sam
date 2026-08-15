import { prisma } from "@/db";
import { env } from "@/env";
import { requireAuthenticationApi } from "@/modules/auth/server";
import apiErrorHandler from "@/modules/common/utils/apiErrorHandler";
import { createS3Client } from "@/modules/common/utils/createS3Client";
import type { WikiSharedContextPage } from "@/modules/wiki/queries/getWikiContext";
import { getWikiPageScopedContext } from "@/modules/wiki/queries/getWikiPageScopedContext";
import { getAccessibleWikiPage } from "@/modules/wiki/utils/getAccessibleWikiPage";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { NextResponse } from "next/server";
import { z } from "zod";

type Params = Promise<{
  uploadId: string;
}>;

const paramsSchema = z.object({ uploadId: z.cuid() });

const PRESIGNED_GET_EXPIRY_SECONDS = 5 * 60;

/**
 * Permission-checked download of a wiki page attachment. Unlike images
 * (public by unguessable URL), attachments are only served to users who can
 * see a page containing the upload — via a redirect to a short-lived
 * presigned URL.
 *
 * Uploads can be linked to multiple pages (Upload.wikiPages, e.g. after a
 * page duplication or a cross-page copy-paste); any readable linked page
 * grants the download.
 */
export async function GET(_request: Request, props: { params: Params }) {
  try {
    await requireAuthenticationApi("/api/wiki/attachment/[uploadId]", "GET");

    const paramsData = paramsSchema.parse(await props.params);

    const upload = await prisma.upload.findUnique({
      where: { id: paramsData.uploadId },
      select: {
        id: true,
        fileName: true,
        mimeType: true,
        wikiPages: { select: { id: true } },
      },
    });

    /**
     * Invisible pages (and uploads outside the wiki) 404 instead of 403 to
     * avoid leaking their existence.
     */
    if (!upload)
      return NextResponse.json({ error: "Not Found" }, { status: 404 });

    /**
     * The linked pages can span scopes (global wiki and event pages), so
     * each check loads the page's own context — request-cached, and uploads
     * rarely link more than one page.
     */
    let allowed = false;
    for (const linked of upload.wikiPages) {
      const scoped = await getWikiPageScopedContext(linked.id);
      if (
        scoped &&
        getAccessibleWikiPage<WikiSharedContextPage>(
          scoped.context,
          linked.id,
          "read",
        ) !== null
      ) {
        allowed = true;
        break;
      }
    }
    if (!allowed)
      return NextResponse.json({ error: "Not Found" }, { status: 404 });

    const presignedUrl = await getPresignedDownloadUrl(upload);

    return NextResponse.redirect(presignedUrl, 307);
  } catch (error) {
    return apiErrorHandler(error);
  }
}

async function getPresignedDownloadUrl(upload: {
  id: string;
  fileName: string;
  mimeType: string;
}) {
  /**
   * The stored file name is already URI-encoded (see useUpload/the wiki
   * upload helper), matching the RFC 5987 `filename*` percent-encoding —
   * except for the apostrophe, which encodeURIComponent leaves as-is but
   * RFC 5987 uses as a delimiter.
   */
  const encodedFileName = upload.fileName.replaceAll("'", "%27");

  return await getSignedUrl(
    createS3Client(),
    new GetObjectCommand({
      Bucket: env.S3_BUCKET_NAME,
      Key: upload.id,
      ResponseContentType: upload.mimeType,
      ResponseContentDisposition: `attachment; filename*=UTF-8''${encodedFileName}`,
    }),
    {
      expiresIn: PRESIGNED_GET_EXPIRY_SECONDS,
    },
  );
}
