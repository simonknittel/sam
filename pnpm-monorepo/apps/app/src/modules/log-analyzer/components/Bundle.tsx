import type { ComponentProps } from "react";
import { LogAnalyzer } from "./LogAnalyzer";
import { LogAnalyzerContext } from "./LogAnalyzerContext";
import { OverlayProvider } from "./OverlayContext";

interface Props extends ComponentProps<typeof LogAnalyzer> {
  /** False when the kill switch flag turned the sharing off. */
  readonly isSharingAvailable: boolean;
}

export const Bundle = ({ isSharingAvailable, ...logAnalyzerProps }: Props) => {
  return (
    <LogAnalyzerContext isSharingAvailable={isSharingAvailable}>
      <OverlayProvider>
        <LogAnalyzer {...logAnalyzerProps} />
      </OverlayProvider>
    </LogAnalyzerContext>
  );
};
