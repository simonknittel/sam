import { prisma } from "@/db";
import { env } from "@/env";
import { AuditEventType } from "@/modules/audit/utils/AuditEventTypes";
import { createAuditEvents } from "@/modules/audit/utils/createAuditEvent";
import { requireAuthenticationApi } from "@/modules/auth/server";
import apiErrorHandler from "@/modules/common/utils/apiErrorHandler";
import { createS3Client } from "@/modules/common/utils/createS3Client";
import {
  isAttachmentMimeType,
  MAX_ATTACHMENT_SIZE_BYTES,
  MAX_IMAGE_SIZE_BYTES,
} from "@/modules/common/utils/uploadConstraints";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { NextResponse } from "next/server";
import { z } from "zod";

const postBodySchema = z.union([
  /**
   * Existing callers upload images without a category — they keep the
   * image-only restriction.
   */
  z.object({
    category: z.literal("image").optional(),
    fileName: z.string().trim().min(1).max(255),
    mimeType: z.string().trim().startsWith("image/").max(255),
    size: z.number().int().min(0).max(MAX_IMAGE_SIZE_BYTES),
  }),
  /**
   * Non-image file attachments (e.g. of wiki pages). The declared size is
   * a client statement — the presigned PUT cannot enforce it — but it is
   * validated here and enforced client-side before uploading.
   */
  z.object({
    category: z.literal("attachment"),
    fileName: z.string().trim().min(1).max(255),
    mimeType: z.string().trim().max(255).refine(isAttachmentMimeType, {
      message: "Unsupported mime type",
    }),
    size: z.number().int().min(0).max(MAX_ATTACHMENT_SIZE_BYTES),
  }),
]);

export async function POST(request: Request) {
  try {
    /**
     * Authenticate and authorize the request
     */
    const authentication = await requireAuthenticationApi(
      "/api/upload",
      "POST",
    );

    /**
     * Validate the request body
     */
    const body: unknown = await request.json();
    const data = postBodySchema.parse(body);

    /**
     * Do the thing
     */
    const item = await prisma.upload.create({
      data: {
        fileName: data.fileName,
        mimeType: data.mimeType,
        size: data.size,
        createdBy: {
          connect: {
            id: authentication.session.user.id,
          },
        },
      },
    });

    await createAuditEvents([
      {
        type: AuditEventType.UPLOAD_CREATED,
        data: {
          uploadId: item.id,
          fileName: item.fileName,
          mimeType: item.mimeType,
        },
        createdById: authentication.session.user.id,
      },
    ]);

    const presignedUploadUrl = await getPresignedUploadUrl(item.id);

    /**
     * Respond with the result
     */
    return NextResponse.json({ item, presignedUploadUrl });
  } catch (error) {
    /**
     * Respond with an error
     */
    return apiErrorHandler(error);
  }
}

async function getPresignedUploadUrl(key: string) {
  return await getSignedUrl(
    createS3Client(),
    new PutObjectCommand({ Bucket: env.S3_BUCKET_NAME, Key: key }),
    {
      expiresIn: 60 * 60, // 1 hour
    },
  );
}
