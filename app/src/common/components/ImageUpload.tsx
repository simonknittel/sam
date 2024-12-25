"use client";

import { env } from "@/env";
import clsx from "clsx";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ChangeEventHandler } from "react";
import toast from "react-hot-toast";
import { FaSpinner } from "react-icons/fa";
import useUpload from "../utils/useUpload";

type Props = Readonly<{
  className?: string;
  imageClassName?: string;
  pendingClassName?: string;
  resourceType: string;
  resource: {
    id: string;
    name: string;
    imageId?: string | null;
  };
  width: number;
  height: number;
}>;

export const ImageUpload = ({
  className,
  imageClassName,
  pendingClassName,
  resourceType,
  resource,
  width,
  height,
}: Props) => {
  const { setFile, upload, setUpload } = useUpload();
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);

  useEffect(() => {
    if (!upload) return;

    fetch(`/api/${resourceType}/${resource.id}`, {
      method: "PATCH",
      body: JSON.stringify({
        imageId: upload,
      }),
    })
      .then((response) => response.json())
      .then(() => {
        router.refresh();
        toast.success("Erfolgreich hochgeladen");
      })
      .catch((error) => {
        console.error(error);
        toast.error("Beim Upload ist ein Fehler aufgetreten.");
      })
      .finally(() => {
        setUpload(null);
        setIsPending(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [upload]);

  const changeHandler: ChangeEventHandler<HTMLInputElement> = (e) => {
    if (e.target.files && e.target.files.length > 0 && e.target.files[0]) {
      setIsPending(true);
      setFile(e.target.files[0]);
    }
  };

  return (
    <div className={clsx(className, "relative")}>
      {resource.imageId && !isPending && (
        <Image
          src={`https://${env.NEXT_PUBLIC_R2_PUBLIC_URL}/${resource.imageId}`}
          alt={`Logo of ${resource.name}`}
          width={width}
          height={height}
          className={clsx(imageClassName, "object-contain object-center")}
        />
      )}

      {isPending && (
        <div
          className={clsx(pendingClassName, "flex items-center justify-center")}
        >
          <FaSpinner className="animate-spin text-sinister-red-500" />
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
