import {
  Button2,
  Button2ColorSchema,
  Button2Variant,
} from "@/modules/common/components/Button2";
import type { ReactNode } from "react";

interface Props {
  readonly onCancel: () => void;
  /** The confirm button */
  readonly children?: ReactNode;
}

/** The cancel button comes first, thus the first focus is not the upload */
export const OlderEntriesRequestFooter = ({ onCancel, children }: Props) => {
  return (
    <div className="flex flex-wrap justify-end gap-2">
      <Button2
        type="button"
        variant={Button2Variant.Secondary}
        colorSchema={Button2ColorSchema.InteractionMuted}
        onClick={onCancel}
      >
        Abbrechen
      </Button2>

      {children}
    </div>
  );
};
