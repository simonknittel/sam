import { env } from "@/env";
import type { Manufacturer, Upload, Variant } from "@prisma/client";
import clsx from "clsx";
import Image from "next/image";

interface Props {
  readonly className?: string;
  readonly variant: Variant;
  readonly manufacturer: Manufacturer & {
    image: Upload | null;
  };
  readonly size?: 32 | 48;
}

export const VariantWithLogo = ({
  className,
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
            "size-[32px]": size === 32,
            "size-[48px]": size === 48,
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
            "size-[32px]": size === 32,
            "size-[48px]": size === 48,
          })}
        ></div>
      )}

      <div className="truncate" title={variant.name}>
        {variant.name}
      </div>
    </div>
  );
};
