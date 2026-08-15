import { Link } from "@/modules/common/components/Link";
import { getPublicUploadUrl } from "@/modules/common/utils/getPublicUploadUrl";
import type {
  Manufacturer,
  Upload,
  Variant,
} from "@sam-monorepo/database/client";
import clsx from "clsx";
import Image from "next/image";

interface Props {
  readonly className?: string;
  readonly variantNameClassName?: string;
  readonly variant: Pick<Variant, "id" | "name">;
  readonly manufacturer: Pick<Manufacturer, "name"> & {
    image?: Pick<Upload, "id" | "mimeType"> | null;
  };
  /**
   * Logo of an already-resolved URL, for callers that don't hold the
   * manufacturer's upload row (the wiki resolves it when rendering a
   * variant link). Takes precedence over `manufacturer.image`.
   */
  readonly logo?: { readonly src: string; readonly mimeType: string } | null;
  /**
   * "inline" renders the variant inside a line of text, with the logo
   * scaled to the surrounding font size (the wiki's variant links).
   */
  readonly size?: 32 | 48 | 80 | "inline";
  readonly disableLink?: boolean;
}

export const VariantWithLogo = ({
  className,
  variantNameClassName,
  variant,
  manufacturer,
  logo,
  size = 48,
  disableLink = false,
}: Props) => {
  const isInline = size === "inline";

  const resolvedLogo =
    logo ??
    (manufacturer.image
      ? {
          src: getPublicUploadUrl(manufacturer.image.id),
          mimeType: manufacturer.image.mimeType,
        }
      : null);

  const logoElement = resolvedLogo ? (
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
  ) : (
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

  const name = isInline ? (
    <span className={variantNameClassName}>{variant.name}</span>
  ) : (
    <span
      className={clsx("block truncate", variantNameClassName)}
      title={variant.name}
    >
      {variant.name}
    </span>
  );

  if (disableLink)
    return isInline ? (
      <span className={className}>
        {logoElement}
        {name}
      </span>
    ) : (
      <div className={clsx("flex items-center gap-2", className)}>
        {logoElement}
        {name}
      </div>
    );

  return (
    <Link
      href={`/app/fleet/variant/${variant.id}`}
      className={
        isInline
          ? className
          : clsx(
              "flex items-center gap-2 hover:bg-white/10 focus-visible:bg-white/10 rounded-secondary p-1",
              className,
            )
      }
      prefetch={false}
    >
      {logoElement}
      {name}
    </Link>
  );
};
