import { getPublicUploadUrl } from "@/modules/common/utils/getPublicUploadUrl";
import type { Manufacturer, Upload } from "@sam-monorepo/database/client";
import clsx from "clsx";
import Image from "next/image";

export interface ManufacturerLogoManufacturer extends Pick<
  Manufacturer,
  "name"
> {
  readonly image?: Pick<Upload, "id" | "mimeType"> | null;
}

interface Props {
  readonly manufacturer: ManufacturerLogoManufacturer;
  /** See VariantWithLogo's `logo` */
  readonly logo?: { readonly src: string; readonly mimeType: string } | null;
  /** See VariantWithLogo's `size` */
  readonly size: 32 | 48 | 80 | "inline";
}

export const ManufacturerLogo = ({ manufacturer, logo, size }: Props) => {
  const isInline = size === "inline";

  const resolvedLogo =
    logo ??
    (manufacturer.image
      ? {
          src: getPublicUploadUrl(manufacturer.image.id),
          mimeType: manufacturer.image.mimeType,
        }
      : null);

  if (!resolvedLogo)
    return (
      /* Keeps variants aligned when their manufacturer has no logo */
      <span
        className={clsx(
          isInline
            ? "mr-1 inline-block h-[1em] w-[3em] align-[-0.15em]"
            : "block flex-none",
          {
            "size-8": size === 32,
            "size-12": size === 48,
            "size-20": size === 80,
          },
        )}
      ></span>
    );

  return (
    <Image
      src={resolvedLogo.src}
      /** Decorative inline: the ship's name sits right next to the logo */
      alt={isInline ? "" : `Logo of ${manufacturer.name}`}
      width={isInline ? 16 : size}
      height={isInline ? 16 : size}
      className={clsx(
        "object-contain object-center",
        isInline
          ? /* Fixed width so stacked links align, see wikiEditor.css */
            "mr-1 inline-block h-[1em] w-[3em] align-[-0.15em]"
          : "flex-none",
        {
          "size-8": size === 32,
          "size-12": size === 48,
          "size-20": size === 80,
        },
      )}
      title={`Logo of ${manufacturer.name}`}
      unoptimized={["image/svg+xml", "image/gif"].includes(
        resolvedLogo.mimeType,
      )}
      loading="lazy"
    />
  );
};
