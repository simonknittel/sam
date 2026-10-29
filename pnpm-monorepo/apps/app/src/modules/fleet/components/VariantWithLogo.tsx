import { Link } from "@/modules/common/components/Link";
import type { Variant } from "@sam-monorepo/database/client";
import clsx from "clsx";
import {
  ManufacturerLogo,
  type ManufacturerLogoManufacturer,
} from "./ManufacturerLogo";

interface Props {
  readonly className?: string;
  readonly variantNameClassName?: string;
  readonly variant: Pick<Variant, "id" | "name">;
  readonly manufacturer: ManufacturerLogoManufacturer;
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

  const logoElement = (
    <ManufacturerLogo manufacturer={manufacturer} logo={logo} size={size} />
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
              "flex items-center gap-2 rounded-secondary p-1 hover:bg-white/10 focus-visible:bg-white/10",
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
