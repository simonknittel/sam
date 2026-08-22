"use client";

import { AsciiSpinner } from "@/modules/common/components/AsciiSpinner";
import { Button2, Button2Variant } from "@/modules/common/components/Button2";
import { getPublicUploadUrl } from "@/modules/common/utils/getPublicUploadUrl";
import useUpload from "@/modules/common/utils/useUpload";
import clsx from "clsx";
import Image from "next/image";
import { useState, type ChangeEventHandler } from "react";
import { FaTrash } from "react-icons/fa";

interface Props {
  readonly className?: string;
  /** Name of the hidden input carrying the uploaded image's id */
  readonly name: string;
  /** The cover the form starts with, for editing an existing record */
  readonly defaultUploadId?: string | null;
  /**
   * Submitted when the field is empty, so an update action can tell "no
   * cover" apart from "field not part of this form". Omitted on create
   * forms, where an absent field simply means no cover.
   */
  readonly emptyValue?: string;
}

/**
 * Cover image picker: uploads the chosen file right away and submits the
 * resulting upload id through a hidden input, so the record can reference it
 * when the form is saved. Existing events replace their cover through
 * `ImageUpload` on the overview instead; event templates use this field with
 * a `defaultUploadId`.
 */
export const EventCoverImageField = ({
  className,
  name,
  defaultUploadId,
  emptyValue,
}: Props) => {
  const { setFile, upload, setUpload } = useUpload();
  const [isPending, setIsPending] = useState(false);
  /**
   * Cleared alongside the upload state so removing the initial cover sticks
   * — `useUpload` only knows about uploads made in this session.
   */
  const [initialUploadId, setInitialUploadId] = useState(
    defaultUploadId ?? null,
  );
  const currentUpload = upload ?? initialUploadId;

  const changeHandler: ChangeEventHandler<HTMLInputElement> = (changeEvent) => {
    const file = changeEvent.target.files?.[0];
    if (file && setFile(file)) setIsPending(true);
  };

  const removeUpload = () => {
    setUpload(null);
    setInitialUploadId(null);
    setIsPending(false);
  };

  return (
    <div className={clsx(className)}>
      <p>Titelbild</p>
      <p className="text-xs mt-1 text-white/40">
        optional, empfohlen 800x320 Pixel
      </p>

      {currentUpload ? (
        <div className="mt-2 flex flex-col gap-2">
          <input type="hidden" name={name} value={currentUpload} />

          <Image
            src={getPublicUploadUrl(currentUpload)}
            alt=""
            width={800}
            height={320}
            className="rounded-secondary object-cover"
            unoptimized
          />

          <Button2
            type="button"
            variant={Button2Variant.Secondary}
            onClick={removeUpload}
            className="self-start"
          >
            <FaTrash />
            Titelbild entfernen
          </Button2>
        </div>
      ) : isPending ? (
        <div className="mt-2 flex h-20 flex-col items-center justify-center gap-2 rounded-secondary border border-neutral-800">
          <AsciiSpinner className="text-brand-red-500" />

          {/* The upload surfaces failures only as a toast — this resets the
              field so a failed upload doesn't leave it spinning forever */}
          <button
            type="button"
            onClick={removeUpload}
            className="text-xs text-neutral-500 hover:text-neutral-300 cursor-pointer"
          >
            Abbrechen
          </button>
        </div>
      ) : (
        <>
          {emptyValue !== undefined && (
            <input type="hidden" name={name} value={emptyValue} />
          )}

          <input
            type="file"
            onChange={changeHandler}
            accept="image/*"
            className="mt-2 block w-full cursor-pointer rounded-secondary border border-neutral-800 bg-neutral-900 p-2 text-sm file:mr-2 file:cursor-pointer"
          />
        </>
      )}
    </div>
  );
};
