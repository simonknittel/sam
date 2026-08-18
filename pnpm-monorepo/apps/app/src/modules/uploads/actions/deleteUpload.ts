"use server";

import { prisma } from "@/db";
import { env } from "@/env";
import { createAuthenticatedAction } from "@/modules/actions/utils/createAction";
import { AuditEventType } from "@/modules/audit/utils/AuditEventTypes";
import { createAuditEvents } from "@/modules/audit/utils/createAuditEvent";
import { createS3Client } from "@/modules/common/utils/createS3Client";
import { log } from "@/modules/logging";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { revalidatePath } from "next/cache";
import { serializeError } from "serialize-error";
import { z } from "zod";
import { USAGE_SELECT } from "../queries/getUploads";
import { decodeUploadFileName } from "../utils/decodeUploadFileName";
import {
  getUploadUsages,
  UPLOAD_USAGE_TYPE_LABELS,
} from "../utils/uploadUsage";

/**
 * Locations kept in the audit payload. An upload embedded in hundreds of
 * wiki pages would otherwise write a huge entry; the count stays exact
 * either way.
 */
const MAX_AUDITED_LOCATIONS = 20;

const schema = z.object({
  id: z.cuid(),
});

export const deleteUpload = createAuthenticatedAction(
  "deleteUpload",
  schema,
  async (formData, authentication, data, t) => {
    if (!(await authentication.authorize("upload", "manage")))
      return {
        error: t("Common.forbidden"),
        requestPayload: formData,
      };

    const upload = await prisma.upload.findUnique({
      where: { id: data.id },
      select: {
        id: true,
        fileName: true,
        mimeType: true,
        createdById: true,
        ...USAGE_SELECT,
      },
    });
    if (!upload)
      return {
        error: t("Common.notFound"),
        requestPayload: formData,
      };

    const usages = getUploadUsages(upload);
    const locations = usages
      .slice(0, MAX_AUDITED_LOCATIONS)
      .map(
        (usage) => `${UPLOAD_USAGE_TYPE_LABELS[usage.type]}: ${usage.label}`,
      );
    if (usages.length > locations.length)
      locations.push(`… und ${usages.length - locations.length} weitere`);

    /**
     * The row goes first: its foreign keys are `SetNull` and its join rows
     * disappear with it, so the references are gone either way. Should the
     * object deletion below fail, the nightly bucket sweep collects the
     * orphaned object — which is why the failure is only logged.
     */
    await prisma.upload.delete({ where: { id: upload.id } });

    try {
      await createS3Client().send(
        new DeleteObjectCommand({
          Bucket: env.S3_BUCKET_NAME,
          Key: upload.id,
        }),
      );
    } catch (error) {
      log.warn("Failed to delete an upload's object from the bucket", {
        uploadId: upload.id,
        error: serializeError(error),
      });
    }

    await createAuditEvents([
      {
        type: AuditEventType.UPLOAD_DELETED,
        data: {
          uploadId: upload.id,
          fileName: decodeUploadFileName(upload.fileName),
          mimeType: upload.mimeType,
          uploadedById: upload.createdById,
          locations,
        },
        createdById: authentication.session.user.id,
      },
    ]);

    revalidatePath("/app/uploads");

    return {
      success: t("Common.successfullyDeleted"),
    };
  },
);
