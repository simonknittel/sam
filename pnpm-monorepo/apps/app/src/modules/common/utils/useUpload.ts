"use client";

import { createUploadResponseSchema } from "@/modules/common/utils/createUploadResponseSchema";
import { MAX_IMAGE_SIZE_BYTES } from "@/modules/common/utils/uploadConstraints";
import { useState } from "react";
import { toast } from "react-hot-toast";

export default function useUpload() {
  const [upload, setUpload] = useState<string | null>(null);

  const startUpload = async (file: File) => {
    const createResponse = await fetch("/api/upload", {
      method: "POST",
      body: JSON.stringify({
        fileName: encodeURIComponent(file.name),
        mimeType: file.type,
        size: file.size,
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!createResponse.ok)
      throw new Error("Creating the upload record failed");
    const created = createUploadResponseSchema.parse(
      await createResponse.json(),
    );

    const putResponse = await fetch(created.presignedUploadUrl, {
      method: "PUT",
      body: file,
      // The presigned URL signs the Content-Type — it must match exactly
      headers: { "Content-Type": file.type },
      // Generous timeout — uploads may be large on slow uplinks
      signal: AbortSignal.timeout(5 * 60_000),
    });
    if (!putResponse.ok) throw new Error("Uploading the file failed");

    setUpload(created.item.id);
  };

  /**
   * Returns whether the file was accepted, so callers tracking their own
   * pending state don't get stuck waiting for an upload that never starts.
   */
  const setFile = (newFile: File | null): boolean => {
    if (!newFile) return false;

    if (newFile.size > MAX_IMAGE_SIZE_BYTES) {
      toast.error(
        `Die Datei ist zu groß (maximal ${MAX_IMAGE_SIZE_BYTES / 1024 / 1024} MB).`,
      );
      return false;
    }

    startUpload(newFile).catch((error: unknown) => {
      console.error(error);
      toast.error("Beim Upload ist ein Fehler aufgetreten.");
    });

    return true;
  };

  return {
    setFile,
    upload,
    setUpload,
  };
}
