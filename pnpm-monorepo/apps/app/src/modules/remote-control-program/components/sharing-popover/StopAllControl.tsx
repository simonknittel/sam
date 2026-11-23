"use client";

import { useAction } from "@/modules/actions/utils/useAction";
import { AsciiSpinner } from "@/modules/common/components/AsciiSpinner";
import {
  Button2,
  Button2ColorSchema,
  Button2Variant,
} from "@/modules/common/components/Button2";
import { ConfirmActionButton } from "@/modules/common/components/ConfirmActionButton";
import Note from "@/modules/common/components/Note";
import { SubmitButton } from "@/modules/common/components/SubmitButton";
import { formatDate } from "@/modules/common/utils/formatDate";
import { FaCirclePlay, FaCircleStop } from "react-icons/fa6";
import { startOwnRuntimes } from "../../actions/startOwnRuntimes";
import { stopOwnRuntimes } from "../../actions/stopOwnRuntimes";
import { useSharingPopoverAction } from "./useSharingPopoverQuery";

interface Props {
  /** The start of the "Stop all" of the owner, or null */
  readonly stoppedAt: Date | null;
}

/** "Stop all" and "Start all" for all runtimes of the owner */
export const StopAllControl = ({ stoppedAt }: Props) => {
  if (stoppedAt) return <StartAll stoppedAt={stoppedAt} />;

  return <StopAll />;
};

const StopAll = () => {
  const stopAll = useSharingPopoverAction(stopOwnRuntimes);

  return (
    <ConfirmActionButton
      action={stopAll}
      title="Alles stoppen?"
      description="Alle deine Laufzeiten hören sofort auf, Daten hochzuladen, auch in anderen Browsern und auf anderen Geräten. Die Einträge aus der Zeit des Stopps bleiben auf deinem Rechner und werden auch nach dem Start nicht automatisch hochgeladen. Deine Freigaben bleiben bestehen: Was du schon hochgeladen hast, bleibt für sie sichtbar."
      confirmLabel="Alles stoppen"
      trigger={(isPending) => (
        <Button2
          type="submit"
          variant={Button2Variant.Secondary}
          colorSchema={Button2ColorSchema.InteractionMuted}
          disabled={isPending}
          className="w-full"
        >
          {isPending ? <AsciiSpinner /> : <FaCircleStop />}
          Alles stoppen
        </Button2>
      )}
    />
  );
};

interface StartAllProps {
  readonly stoppedAt: Date;
}

const StartAll = ({ stoppedAt }: StartAllProps) => {
  const startAll = useSharingPopoverAction(startOwnRuntimes);
  const { formAction } = useAction(startAll);

  return (
    <div className="flex flex-col gap-2">
      <Note
        type="warning"
        message={`Alles gestoppt seit ${formatDate(stoppedAt)}. Deine Laufzeiten laden nichts hoch.`}
      />

      <form action={formAction}>
        <SubmitButton icon={<FaCirclePlay />} className="w-full">
          Alles starten
        </SubmitButton>
      </form>

      <p className="text-xs text-neutral-500">
        Nach dem Start laden deine Laufzeiten nur die Einträge hoch, die sie ab
        dann live lesen.
      </p>
    </div>
  );
};
