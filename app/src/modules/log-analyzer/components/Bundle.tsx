import type { ComponentProps } from "react";
import { LogAnalyzer } from "./LogAnalyzer";
import { LogAnalyzerContext } from "./LogAnalyzerContext";

type Props = ComponentProps<typeof LogAnalyzer>;

export const Bundle = (props: Props) => {
  return (
    <LogAnalyzerContext>
      <LogAnalyzer {...props} />
    </LogAnalyzerContext>
  );
};
