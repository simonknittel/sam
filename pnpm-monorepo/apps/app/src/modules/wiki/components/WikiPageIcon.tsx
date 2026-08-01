import { env } from "@/env";
import clsx from "clsx";
import Image from "next/image";

interface Props {
  /** Must contain a size-* class matching the `size` prop */
  readonly className?: string;
  readonly iconId: string;
  /** Rendered size in px */
  readonly size?: number;
}

/**
 * A wiki page's icon, rendered next to its title. Icon uploads are public
 * by URL like all wiki images.
 */
export const WikiPageIcon = ({
  className = "size-4",
  iconId,
  size = 16,
}: Props) => {
  return (
    <Image
      src={`https://${env.NEXT_PUBLIC_S3_PUBLIC_URL}/${iconId}`}
      alt=""
      width={size}
      height={size}
      className={clsx("flex-none rounded-xs object-cover", className)}
      unoptimized
    />
  );
};
