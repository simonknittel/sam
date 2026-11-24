import {
  AuditEventType,
  isAllowedImageMimeType,
  isAttachmentMimeType,
  MAXIMUM_ATTACHMENT_SIZE_BYTES,
  MAXIMUM_IMAGE_SIZE_BYTES,
  UploadCategory,
} from "@sam-monorepo/domain";
import * as z from "zod";
import { requireCitizen, type Actor } from "../actor.js";
import type { ApplicationContext } from "../context.js";
import { ConflictError } from "../errors.js";
import { withSpan } from "../withSpan.js";
import { UploadErrorMessage } from "./uploadErrors.js";

/** The longest file name of an upload. The client sends it URI-encoded. */
export const MAXIMUM_UPLOAD_FILE_NAME_LENGTH = 255;

/** RFC 6838 permits at most 127 characters for the type and the subtype */
const MAXIMUM_MIME_TYPE_LENGTH = 255;

/** The time that the client has to start the upload of the file */
const UPLOAD_URL_EXPIRY_SECONDS = 60 * 60;

const getCategoryRule = (category: UploadCategory) => {
  switch (category) {
    case UploadCategory.Image:
      return {
        isAllowedMimeType: isAllowedImageMimeType,
        maximumSizeBytes: MAXIMUM_IMAGE_SIZE_BYTES,
      };

    case UploadCategory.Attachment:
      return {
        isAllowedMimeType: isAttachmentMimeType,
        maximumSizeBytes: MAXIMUM_ATTACHMENT_SIZE_BYTES,
      };

    default:
      throw new Error(`Unknown upload category: ${category satisfies never}`);
  }
};

export const createUploadInputSchema = z
  .object({
    /** The image uploads outside the wiki editor send no category */
    category: z.enum(UploadCategory).default(UploadCategory.Image),
    file_name: z.string().trim().min(1).max(MAXIMUM_UPLOAD_FILE_NAME_LENGTH),
    mime_type: z.string().trim().max(MAXIMUM_MIME_TYPE_LENGTH),
    /**
     * The size in bytes. It is a statement of the client: the presigned PUT
     * URL cannot enforce it. The client checks the limit before the upload
     * starts, and the image probe replaces the size with the real size.
     */
    size: z.int().min(0),
  })
  .superRefine((input, context) => {
    const rule = getCategoryRule(input.category);

    if (!rule.isAllowedMimeType(input.mime_type))
      context.addIssue({
        code: "custom",
        path: ["mime_type"],
        message: "Unsupported mime type",
      });

    if (input.size > rule.maximumSizeBytes)
      context.addIssue({
        code: "custom",
        path: ["size"],
        message: `The file is larger than ${rule.maximumSizeBytes} bytes`,
      });
  });

export type CreateUploadInput = z.output<typeof createUploadInputSchema>;

export interface CreateUploadOutput {
  readonly upload: {
    readonly id: string;
    readonly file_name: string;
    readonly mime_type: string;
    readonly size: number;
  };
  /** The client sends the file to this URL with `PUT` */
  readonly presigned_upload_url: string;
}

/**
 * Creates the row of an upload that the acting citizen is the author of, and
 * gives the URL that takes the file. The key of the object is the id of the
 * row. The client assigns the upload to its target after the upload.
 *
 * @throws ForbiddenError when the user has no citizen
 * @throws ConflictError `UploadErrorMessage.StorageNotConfigured`
 */
export const createUpload = (
  context: ApplicationContext,
  actor: Actor,
  input: CreateUploadInput,
): Promise<CreateUploadOutput> =>
  withSpan(context, "createUpload", async () => {
    const citizen = requireCitizen(actor);

    const { storage } = context;
    if (!storage)
      throw new ConflictError(UploadErrorMessage.StorageNotConfigured);

    const upload = await context.prisma.upload.create({
      data: {
        fileName: input.file_name,
        mimeType: input.mime_type,
        size: input.size,
        createdById: citizen.id,
      },
      select: { id: true, fileName: true, mimeType: true },
    });

    await context.audit.create([
      {
        type: AuditEventType.UPLOAD_CREATED,
        data: {
          uploadId: upload.id,
          fileName: upload.fileName,
          mimeType: upload.mimeType,
        },
        createdById: actor.userId,
      },
    ]);

    /**
     * The content type is part of the signature, thus the PUT must send
     * exactly the MIME type that the schema accepted. The stored (and later
     * served) `Content-Type` cannot be different from it.
     */
    const presignedUploadUrl = await storage.createUploadUrl({
      key: upload.id,
      contentType: upload.mimeType,
      expiresInSeconds: UPLOAD_URL_EXPIRY_SECONDS,
    });

    return {
      upload: {
        id: upload.id,
        file_name: upload.fileName,
        mime_type: upload.mimeType,
        size: input.size,
      },
      presigned_upload_url: presignedUploadUrl,
    };
  });
