import { getPublicUploadUrl } from "@/modules/common/utils/getPublicUploadUrl";
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
      src={getPublicUploadUrl(iconId)}
      alt=""
      width={size}
      height={size}
      className={clsx("flex-none rounded-xs object-cover", className)}
      unoptimized
    />
  );
};
