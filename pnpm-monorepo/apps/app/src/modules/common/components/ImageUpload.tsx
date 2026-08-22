"use client";

import { toastWarning } from "@/modules/actions/utils/toastWarning";
import { AsciiSpinner } from "@/modules/common/components/AsciiSpinner";
import { getPublicUploadUrl } from "@/modules/common/utils/getPublicUploadUrl";
import clsx from "clsx";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ChangeEventHandler } from "react";
import toast from "react-hot-toast";
import { z } from "zod";
import useUpload from "../utils/useUpload";

const assignResponseSchema = z.object({ warning: z.string().optional() });

const readAssignWarning = async (response: Response) => {
  try {
    const body: unknown = await response.json();
    return assignResponseSchema.safeParse(body).data?.warning ?? null;
  } catch {
    return null;
  }
};

interface Props {
  readonly className?: string;
  readonly imageClassName?: string;
  readonly pendingClassName?: string;
  readonly resourceType: string;
  readonly resourceId: string;
  readonly resourceAttribute: string;
  readonly imageId?: string | null;
  readonly imageMimeType?: string;
  readonly width: number;
  readonly height: number;
}

export const ImageUpload = ({
  className,
  imageClassName,
  pendingClassName,
  resourceType,
  resourceId,
  resourceAttribute,
  imageId,
  imageMimeType,
  width,
  height,
}: Props) => {
  const { setFile, upload, setUpload } = useUpload();
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);

  useEffect(() => {
    if (!upload) return;

    fetch(`/api/upload/assign`, {
      method: "PATCH",
      body: JSON.stringify({
        resourceType,
        resourceId,
        resourceAttribute,
        imageId: upload,
      }),
      signal: AbortSignal.timeout(10_000),
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("Assigning the upload failed");

        /**
         * The image is assigned by now; a warning only reports follow-up
         * work the route could not finish (e.g. updating a published Discord
         * event). An unreadable body must therefore never turn the finished
         * upload into an error.
         */
        const warning = await readAssignWarning(response);

        router.refresh();
        toast.success("Erfolgreich hochgeladen");
        if (warning) toastWarning(warning);
      })
      .catch((error) => {
        console.error(error);
        toast.error("Beim Upload ist ein Fehler aufgetreten.");
      })
      .finally(() => {
        setUpload(null);
        setIsPending(false);
      });
  }, [upload, setUpload, resourceType, resourceId, resourceAttribute, router]);

  const changeHandler: ChangeEventHandler<HTMLInputElement> = (e) => {
    if (e.target.files && e.target.files.length > 0 && e.target.files[0]) {
      if (setFile(e.target.files[0])) setIsPending(true);
    }
  };

  return (
    <div className={clsx(className, "relative")}>
      {imageId && !isPending && (
        <Image
          src={getPublicUploadUrl(imageId)}
          alt=""
          width={width}
          height={height}
          className={clsx(imageClassName, "object-contain object-center")}
          unoptimized={
            imageMimeType
              ? ["image/svg+xml", "image/gif"].includes(imageMimeType)
              : true
          }
        />
      )}

      {isPending && (
        <div
          className={clsx(pendingClassName, "flex items-center justify-center")}
        >
          <AsciiSpinner className="text-brand-red-500" />
        </div>
      )}

      <input
        type="file"
        onChange={changeHandler}
        accept="image/*"
        disabled={isPending}
        className="absolute inset-0 cursor-pointer opacity-0 text-[0]"
      />
    </div>
  );
};
