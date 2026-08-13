"use client";

import { MAX_IMAGE_SIZE_BYTES } from "@/modules/common/utils/uploadConstraints";
import { type Upload } from "@sam-monorepo/database/browser";
import { useEffect, useState } from "react";
import { toast } from "react-hot-toast";

export default function useUpload() {
  const [file, setFile] = useState<File | null>(null);
  const [upload, setUpload] = useState<string | null>(null);

  /**
   * Returns whether the file was accepted, so callers tracking their own
   * pending state don't get stuck waiting for an upload that never starts.
   */
  const setFileWithSizeCheck = (newFile: File | null): boolean => {
    if (newFile && newFile.size > MAX_IMAGE_SIZE_BYTES) {
      toast.error(
        `Die Datei ist zu groß (maximal ${MAX_IMAGE_SIZE_BYTES / 1024 / 1024} MB).`,
      );
      return false;
    }
    setFile(newFile);
    return true;
  };

  useEffect(() => {
    // eslint-disable-next-line react-you-might-not-need-an-effect/no-event-handler -- The upload chain is deliberately effect-driven; restructuring is planned together with the upload validation hardening (maintenance plan phase 7).
    if (!file) return;

    fetch("/api/upload", {
      method: "POST",
      body: JSON.stringify({
        fileName: encodeURIComponent(file.name),
        mimeType: file.type,
        size: file.size,
      }),
    })
      .then((response) => response.json())
      .then((response: { item: Upload; presignedUploadUrl: string }) => {
        return fetch(response.presignedUploadUrl, {
          method: "PUT",
          body: file,
        }).then(() => {
          setUpload(response.item.id);
        });
      })
      .catch((error) => {
        console.error(error);
        toast.error("Beim Upload ist ein Fehler aufgetreten.");
      })
      .finally(() => {
        setFile(null);
      });
  }, [file]);

  return {
    setFile: setFileWithSizeCheck,
    upload,
    setUpload,
  };
}
