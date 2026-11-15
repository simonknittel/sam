import { Button2, Button2Variant } from "@/modules/common/components/Button2";
import { FaDownload } from "react-icons/fa";

interface Props {
  readonly href: string;
  readonly fileName: string;
}

export const DownloadLink = ({ href, fileName }: Props) => {
  return (
    <Button2
      as="a"
      href={href}
      download={fileName}
      variant={Button2Variant.Secondary}
      className="w-fit"
    >
      <FaDownload />
      {fileName}
    </Button2>
  );
};
