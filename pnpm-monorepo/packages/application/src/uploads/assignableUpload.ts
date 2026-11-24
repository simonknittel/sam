import type { Prisma } from "@sam-monorepo/database/client";
import type { ActorCitizen } from "../actor.js";
import type { ApplicationContext } from "../context.js";
import { ForbiddenError, ValidationError } from "../errors.js";
import { UploadErrorMessage } from "./uploadErrors.js";

const ASSIGNABLE_UPLOAD_SELECT = {
  id: true,
  createdById: true,
  mimeType: true,
} satisfies Prisma.UploadSelect;

/** The upload, or null for no id (the input removes the image) */
export const findAssignableUpload = (
  context: Pick<ApplicationContext, "prisma">,
  uploadId: string | null,
) =>
  uploadId
    ? context.prisma.upload.findUnique({
        where: { id: uploadId },
        select: ASSIGNABLE_UPLOAD_SELECT,
      })
    : Promise.resolve(null);

interface OwnedUpload {
  readonly createdById: string | null;
  readonly mimeType: string;
}

export const isImageUpload = (upload: Pick<OwnedUpload, "mimeType">) =>
  upload.mimeType.startsWith("image/");

const isOwnUpload = (upload: OwnedUpload, citizenId: string) =>
  upload.createdById === citizenId;

/**
 * The rule of the images that a citizen assigns (an icon, a cover image): an
 * image that the citizen uploaded. Nobody can assign the upload of a
 * different citizen.
 */
export const isOwnImageUpload = (upload: OwnedUpload, citizenId: string) =>
  isOwnUpload(upload, citizenId) && isImageUpload(upload);

export const requireOwnImageUpload = (
  upload: OwnedUpload,
  citizen: ActorCitizen,
) => {
  if (!isOwnUpload(upload, citizen.id))
    throw new ForbiddenError(UploadErrorMessage.NotOwnUpload);

  if (!isImageUpload(upload))
    throw new ValidationError(UploadErrorMessage.NotAnImage);
};
