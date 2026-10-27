import { getPublicUploadUrl } from "@/modules/common/utils/getPublicUploadUrl";
import Image from "next/image";

/** The width and the height in pixels */
export enum UploadedIconSize {
  Small = 16,
  Medium = 24,
  Large = 48,
}

interface Props {
  readonly upload: { readonly id: string; readonly mimeType: string };
  readonly size: UploadedIconSize;
}

/** An uploaded image as an icon, for example of a role or of a tag */
export const UploadedIcon = ({ upload, size }: Props) => {
  return (
    <Image
      src={getPublicUploadUrl(upload.id)}
      alt=""
      width={size}
      height={size}
      className="max-h-full max-w-full"
      unoptimized={["image/svg+xml", "image/gif"].includes(upload.mimeType)}
      loading="lazy"
    />
  );
};
