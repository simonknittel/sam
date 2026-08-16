"use client";

import { AsciiSpinner } from "@/modules/common/components/AsciiSpinner";
import { Button2, Button2Variant } from "@/modules/common/components/Button2";
import { getPublicUploadUrl } from "@/modules/common/utils/getPublicUploadUrl";
import useUpload from "@/modules/common/utils/useUpload";
import clsx from "clsx";
import Image from "next/image";
import { useEffect, useState, type ChangeEventHandler } from "react";
import { FaTrash } from "react-icons/fa";

interface Props {
  readonly className?: string;
  /** Name of the hidden input carrying the uploaded image's id */
  readonly name: string;
}

/**
 * Cover image picker for the create form: uploads the chosen file right
 * away and submits the resulting upload id through a hidden input, so the
 * event can reference it at creation time. Existing events replace their
 * cover through `ImageUpload` on the settings page instead.
 */
export const EventCoverImageField = ({ className, name }: Props) => {
  const { setFile, upload, setUpload } = useUpload();
  const [isPending, setIsPending] = useState(false);
  const [uploadId, setUploadId] = useState<string | null>(null);

  useEffect(() => {
    if (!upload) return;
    setUploadId(upload);
    setUpload(null);
    setIsPending(false);
  }, [upload, setUpload]);

  const changeHandler: ChangeEventHandler<HTMLInputElement> = (changeEvent) => {
    const file = changeEvent.target.files?.[0];
    if (file && setFile(file)) setIsPending(true);
  };

  return (
    <div className={clsx(className)}>
      <p>Titelbild</p>
      <p className="text-xs mt-1 text-gray-400">
        optional, empfohlen 800x320 Pixel
      </p>

      {uploadId && !isPending && (
        <div className="mt-2 flex flex-col gap-2">
          <input type="hidden" name={name} value={uploadId} />

          <Image
            src={getPublicUploadUrl(uploadId)}
            alt=""
            width={800}
            height={320}
            className="rounded-secondary object-cover"
            unoptimized
          />

          <Button2
            type="button"
            variant={Button2Variant.Secondary}
            onClick={() => setUploadId(null)}
            className="self-start"
          >
            <FaTrash />
            Titelbild entfernen
          </Button2>
        </div>
      )}

      {isPending && (
        <div className="mt-2 flex h-20 items-center justify-center rounded-secondary border border-neutral-800">
          <AsciiSpinner className="text-brand-red-500" />
        </div>
      )}

      {!uploadId && !isPending && (
        <input
          type="file"
          onChange={changeHandler}
          accept="image/*"
          className="mt-2 block w-full cursor-pointer rounded-secondary border border-neutral-800 bg-neutral-900 p-2 text-sm file:mr-2 file:cursor-pointer"
        />
      )}
    </div>
  );
};
