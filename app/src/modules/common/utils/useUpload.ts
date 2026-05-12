"use client";

import { type Upload } from "@/generated/prisma/browser";
import { useEffect, useState } from "react";
import { toast } from "react-hot-toast";

export default function useUpload() {
  const [file, setFile] = useState<File | null>(null);
  const [upload, setUpload] = useState<string | null>(null);

  useEffect(() => {
    if (!file) return;

    fetch("/api/upload", {
      method: "POST",
      body: JSON.stringify({
        fileName: encodeURIComponent(file.name),
        mimeType: file.type,
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
    setFile,
    upload,
    setUpload,
  };
}
