"use client";

import { AsciiSpinner } from "@/modules/common/components/AsciiSpinner";
import { Button2, Button2Variant } from "@/modules/common/components/Button2";
import { ImageUpload } from "@/modules/common/components/ImageUpload";
import Modal from "@/modules/common/components/Modal";
import clsx from "clsx";
import { useRouter } from "next/navigation";
import { useState } from "react";
import toast from "react-hot-toast";
import { FaRegImage, FaTrash } from "react-icons/fa";
import { WikiPageIcon } from "./WikiPageIcon";

interface Props {
  readonly pageId: string;
  readonly iconId: string | null;
  readonly canAdmin: boolean;
}

/**
 * The page icon next to the title. Page admins get a button opening a modal
 * to upload, replace or remove the icon; everyone else just sees the image
 * (or nothing).
 */
export const WikiPageIconButton = ({ pageId, iconId, canAdmin }: Props) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const router = useRouter();

  if (!canAdmin)
    return iconId ? (
      <WikiPageIcon iconId={iconId} size={28} className="size-7" />
    ) : null;

  const removeHandler = () => {
    setIsRemoving(true);

    fetch("/api/upload/assign", {
      method: "PATCH",
      body: JSON.stringify({
        resourceType: "wikiPage",
        resourceAttribute: "iconId",
        resourceId: pageId,
        imageId: null,
      }),
    })
      .then((response) => {
        if (!response.ok) throw new Error(response.statusText);
        router.refresh();
        toast.success("Erfolgreich entfernt");
        setIsOpen(false);
      })
      .catch((error) => {
        console.error(error);
        toast.error("Beim Entfernen ist ein Fehler aufgetreten.");
      })
      .finally(() => {
        setIsRemoving(false);
      });
  };

  return (
    <>
      <Button2
        type="button"
        onClick={() => setIsOpen(true)}
        variant={Button2Variant.IconOnly}
        tooltip={iconId ? "Icon bearbeiten" : "Icon hinzufügen"}
      >
        {iconId ? (
          <WikiPageIcon iconId={iconId} size={28} className="size-7" />
        ) : (
          <FaRegImage />
        )}
      </Button2>

      <Modal
        isOpen={isOpen}
        onRequestClose={() => setIsOpen(false)}
        className="w-96"
        heading={<h2>Icon bearbeiten</h2>}
      >
        <ImageUpload
          resourceType="wikiPage"
          resourceId={pageId}
          resourceAttribute="iconId"
          imageId={iconId}
          width={128}
          height={128}
          className={clsx(
            "size-32 border border-neutral-700 hover:border-neutral-500 text-neutral-500 hover:text-neutral-300 transition-colors rounded-secondary",
            {
              "after:content-['Bild_hochladen'] flex items-center justify-center":
                !iconId,
            },
          )}
          imageClassName="size-32"
          pendingClassName="size-32"
        />

        <p className="mt-1 text-sm text-neutral-500">
          nur 1:1, wird in Listen auf 16&thinsp;px verkleinert
        </p>

        {iconId && (
          <Button2
            type="button"
            onClick={removeHandler}
            disabled={isRemoving}
            variant={Button2Variant.Secondary}
            className="mt-4"
          >
            {isRemoving ? <AsciiSpinner /> : <FaTrash />}
            Entfernen
          </Button2>
        )}
      </Modal>
    </>
  );
};
