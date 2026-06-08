import type { ComponentProps } from "react";
import { LogAnalyzer } from "./LogAnalyzer";
import { LogAnalyzerContext } from "./LogAnalyzerContext";
import { OverlayProvider } from "./OverlayContext";

type Props = ComponentProps<typeof LogAnalyzer>;

export const Bundle = (props: Props) => {
  return (
    <LogAnalyzerContext>
      <OverlayProvider>
        <LogAnalyzer {...props} />
      </OverlayProvider>
    </LogAnalyzerContext>
  );
};
