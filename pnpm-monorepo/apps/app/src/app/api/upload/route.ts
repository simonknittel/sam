import { prisma } from "@/db";
import { env } from "@/env";
import { AuditEventType } from "@/modules/audit/utils/AuditEventTypes";
import { createAuditEvents } from "@/modules/audit/utils/createAuditEvent";
import { requireAuthenticationApi } from "@/modules/auth/server";
import apiErrorHandler from "@/modules/common/utils/apiErrorHandler";
import {
  ATTACHMENT_MIME_TYPES,
  MAX_ATTACHMENT_SIZE_BYTES,
} from "@/modules/common/utils/uploadConstraints";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
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
    size: z.number().int().min(0).optional(),
  }),
  /**
   * Non-image file attachments (e.g. of wiki pages). The declared size is
   * a client statement — the presigned PUT cannot enforce it — but it is
   * validated here and enforced client-side before uploading.
   */
  z.object({
    category: z.literal("attachment"),
    fileName: z.string().trim().min(1).max(255),
    mimeType: z
      .string()
      .trim()
      .refine((mimeType) => ATTACHMENT_MIME_TYPES.includes(mimeType), {
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
        size: data.size ?? null,
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
  const S3 = new S3Client({
    region: "auto",
    endpoint: `https://${env.S3_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: env.S3_ACCESS_KEY_ID,
      secretAccessKey: env.S3_SECRET_ACCESS_KEY,
    },
  });

  return await getSignedUrl(
    S3,
    new PutObjectCommand({ Bucket: env.S3_BUCKET_NAME, Key: key }),
    {
      expiresIn: 60 * 60, // 1 hour
    },
  );
}
