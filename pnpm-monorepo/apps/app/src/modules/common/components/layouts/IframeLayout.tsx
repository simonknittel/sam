import { AsciiSpinner } from "@/modules/common/components/AsciiSpinner";
import type { ComponentProps } from "react";

interface Props {
  readonly src: string;
  readonly iframeProps?: ComponentProps<"iframe">;
}

export const IframeLayout = ({ src, iframeProps }: Props) => {
  return (
    <div className="relative">
      <iframe
        src={src}
        className="relative z-10 h-[calc(100dvh-64px-48px)] w-full lg:h-[calc(100dvh-112px)]"
        title="Formular für eine SILO-Anfrage"
        {...iframeProps}
      />

      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
        <AsciiSpinner className="text-5xl text-neutral-500" />
      </div>
    </div>
  );
};
