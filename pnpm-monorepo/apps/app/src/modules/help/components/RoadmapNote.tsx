import { Note } from "@/modules/common/components/Note";
import { RichText } from "@/modules/common/components/RichText";
import clsx from "clsx";
import type { ReactNode } from "react";

interface Props {
  readonly className?: string;
  readonly children?: ReactNode;
}

export const RoadmapNote = ({ className, children }: Props) => {
  return (
    <Note
      type="info"
      message={
        <RichText>
          <p className="mb-0">
            <strong>Roadmap</strong>
          </p>

          <p className="mt-0">{children}</p>
        </RichText>
      }
      className={clsx(className)}
    />
  );
};
