"use client";

import type { LogAnalyzerPattern } from "@/generated/prisma/client";
import { useAction } from "@/modules/actions/utils/useAction";
import { Button2 } from "@/modules/common/components/Button2";
import { Textarea } from "@/modules/common/components/form/Textarea";
import { TextInput } from "@/modules/common/components/form/TextInput";
import { YesNoCheckbox } from "@/modules/common/components/form/YesNoCheckbox";
import { Note } from "@/modules/common/components/Note";
import clsx from "clsx";
import { useRouter } from "next/navigation";
import { useId } from "react";
import { FaSave, FaSpinner } from "react-icons/fa";
import { toggleLogAnalyzerPattern } from "../actions/toggleLogAnalyzerPattern";
import { updateLogAnalyzerPattern } from "../actions/updateLogAnalyzerPattern";

interface Props {
  readonly className?: string;
  readonly pattern: LogAnalyzerPattern;
}

export const LogAnalyzerPatternForm = ({ className, pattern }: Props) => {
  const router = useRouter();

  const {
    state: updateState,
    formAction: updateFormAction,
    isPending: updateIsPending,
  } = useAction(updateLogAnalyzerPattern, {
    onSuccess: () => router.refresh(),
  });

  const toggleFormId = useId();
  const {
    state: toggleState,
    formAction: toggleFormAction,
    isPending: toggleIsPending,
  } = useAction(toggleLogAnalyzerPattern, {
    onSuccess: () => router.refresh(),
  });

  return (
    <div className={clsx("flex flex-col gap-4", className)}>
      <form
        action={updateFormAction}
        className={clsx("bg-secondary rounded-primary p-4", className)}
      >
        <input type="hidden" name="id" value={pattern.id} />

        <TextInput
          label="Titel"
          name="title"
          defaultValue={pattern.title}
          required
        />

        <Textarea
          label="RegExp"
          name="regExp"
          defaultValue={pattern.regExp}
          required
          className="mt-4"
          classNameTextarea="font-mono"
          hint="Der regul&#x444;re Ausdruck zum Erkennen des Musters im Log"
        />

        <Textarea
          label="Nachrichtenvorlage"
          name="messageTemplate"
          defaultValue={pattern.messageTemplate}
          required
          className="mt-4"
          hint="Die Vorlage f&#xFC;r die angezeigte Nachricht. Verwende {{match}} f&#xFC;r den gefundenen Text."
        />

        <Button2
          type="submit"
          disabled={updateIsPending}
          className="ml-auto mt-4"
        >
          {updateIsPending ? (
            <FaSpinner className="animate-spin" />
          ) : (
            <FaSave />
          )}
          Speichern
        </Button2>

        {updateState && "error" in updateState && (
          <Note
            type="error"
            message={updateState.error}
            className={clsx("mt-4", {
              "animate-pulse": updateIsPending,
            })}
          />
        )}
      </form>

      <form
        action={toggleFormAction}
        id={toggleFormId}
        className={clsx("bg-secondary rounded-primary p-4", className)}
      >
        <input type="hidden" name="id" value={pattern.id} />

        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold">Deaktiviert</h3>
            <p className="text-sm text-white/60 mt-1">
              Ein deaktiviertes Muster wird nicht f&#xFC;r die Analyse
              verwendet.
            </p>
          </div>

          <YesNoCheckbox
            name="disabled"
            defaultChecked={pattern.disabledAt !== null}
            disabled={toggleIsPending}
            onChange={() => {
              (
                document.getElementById(toggleFormId) as HTMLFormElement
              )?.requestSubmit();
            }}
          />
        </div>

        {toggleState && "error" in toggleState && (
          <Note
            type="error"
            message={toggleState.error}
            className={clsx("mt-4", {
              "animate-pulse": toggleIsPending,
            })}
          />
        )}
      </form>
    </div>
  );
};
