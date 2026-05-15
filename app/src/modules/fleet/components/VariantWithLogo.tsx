import { env } from "@/env";
import type { Manufacturer, Upload, Variant } from "@/generated/prisma/client";
import clsx from "clsx";
import Image from "next/image";

interface Props {
  readonly className?: string;
  readonly variantNameClassName?: string;
  readonly variant: Variant;
  readonly manufacturer: Manufacturer & {
    image: Upload | null;
  };
  readonly size?: 32 | 48 | 80;
}

export const VariantWithLogo = ({
  className,
  variantNameClassName,
  variant,
  manufacturer,
  size = 48,
}: Props) => {
  return (
    <div className={clsx("flex items-center gap-2", className)}>
      {manufacturer.image ? (
        <Image
          src={`https://${env.NEXT_PUBLIC_S3_PUBLIC_URL}/${manufacturer.image.id}`}
          alt={`Logo of ${manufacturer.name}`}
          width={size}
          height={size}
          className={clsx("flex-none object-contain object-center", {
            "size-8": size === 32,
            "size-12": size === 48,
            "size-20": size === 80,
          })}
          title={`Logo of ${manufacturer.name}`}
          unoptimized={["image/svg+xml", "image/gif"].includes(
            manufacturer.image.mimeType,
          )}
          loading="lazy"
        />
      ) : (
        <div
          className={clsx("flex-none", {
            "size-8": size === 32,
            "size-12": size === 48,
            "size-20": size === 80,
          })}
        ></div>
      )}

      <div
        className={clsx("truncate", variantNameClassName)}
        title={variant.name}
      >
        {variant.name}
      </div>
    </div>
  );
};
