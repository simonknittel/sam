"use client";

import {
  Button2,
  Button2ColorSchema,
  Button2Variant,
} from "@/modules/common/components/Button2";
import Note from "@/modules/common/components/Note";
import { formatDate } from "@/modules/common/utils/formatDate";
import { CapabilityId } from "@sam-monorepo/domain";
import { FaCirclePlay, FaCircleStop } from "react-icons/fa6";
import type { BrowserRuntimeHandle } from "../../runtime/types";
import { getSensitivityWarning } from "./catalogTexts";
import { LogEntryTypeSettings } from "./LogEntryTypeSettings";

interface Props {
  readonly runtime: BrowserRuntimeHandle;
}

/**
 * The local access layer of this browser: what leaves the machine, and the
 * "Stop all" of this browser (see "Local access layer" of
 * `docs/remote-control-program/README.md`)
 */
export const LocalAccessControl = ({ runtime }: Props) => {
  const { state, commands } = runtime;
  const { stoppedAt, logEntryTypes } = state.localAccess;
  const sensitivityWarning = getSensitivityWarning(CapabilityId.LogEntries);

  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-sm font-bold">Was dieser Browser hochlädt</h3>

      <p className="text-sm text-neutral-400">
        Automatisch geht nur hoch, was die Laufzeit live liest, und nur von den
        Typen, die an sind. Ein Typ, den du einschaltest, lädt erst ab dann
        hoch.
      </p>

      {sensitivityWarning && (
        <Note type="warning" message={sensitivityWarning} />
      )}

      {/* The button keeps its place, thus the focus stays on it after a click */}
      {stoppedAt && (
        <Note
          type="warning"
          message={`In diesem Browser ist seit ${formatDate(stoppedAt)} alles gestoppt. Er liest weiter, lädt aber nichts hoch.`}
        />
      )}

      <Button2
        type="button"
        variant={Button2Variant.Secondary}
        colorSchema={
          stoppedAt
            ? Button2ColorSchema.Interaction
            : Button2ColorSchema.InteractionMuted
        }
        onClick={stoppedAt ? commands.startAll : commands.stopAll}
        className="w-full"
      >
        {stoppedAt ? <FaCirclePlay /> : <FaCircleStop />}
        {stoppedAt
          ? "In diesem Browser alles starten"
          : "In diesem Browser alles stoppen"}
      </Button2>

      {stoppedAt && (
        <p className="text-xs text-neutral-500">
          Nach dem Start lädt dieser Browser nur hoch, was er ab dann live
          liest.
        </p>
      )}

      <LogEntryTypeSettings
        logEntryTypes={logEntryTypes}
        onChange={commands.setLogEntryTypes}
      />
    </div>
  );
};
