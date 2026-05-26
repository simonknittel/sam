"use client";

import { useAction } from "@/modules/actions/utils/useAction";
import { Button2, Button2Variant } from "@/modules/common/components/Button2";
import { Textarea } from "@/modules/common/components/form/Textarea";
import { TextInput } from "@/modules/common/components/form/TextInput";
import Modal from "@/modules/common/components/Modal";
import { Note } from "@/modules/common/components/Note";
import { useRouter } from "next/navigation";
import { FaSave, FaSpinner } from "react-icons/fa";
import { createLogAnalyzerPattern } from "../actions/createLogAnalyzerPattern";

interface Props {
  readonly onRequestClose: () => void;
}

export const CreateLogAnalyzerPatternModal = ({ onRequestClose }: Props) => {
  const router = useRouter();
  const { state, formAction, isPending } = useAction(createLogAnalyzerPattern, {
    onSuccess: () => {
      router.refresh();
      onRequestClose();
    },
  });

  return (
    <Modal
      isOpen={true}
      onRequestClose={onRequestClose}
      className="w-140"
      heading={<h2>Neues Muster</h2>}
    >
      <form action={formAction}>
        <TextInput
          label="Titel"
          name="title"
          required
          autoFocus
          hint="Ein eindeutiger Name für dieses Muster"
        />

        <Textarea
          label="RegExp"
          name="regExp"
          required
          className="mt-4"
          classNameTextarea="font-mono"
          hint="Die Regular Expression zum Erkennen des Musters im Log"
          placeholder="z.B. \[ERROR\].*OutOfMemory"
        />

        <Textarea
          label="Nachrichtenvorlage"
          name="messageTemplate"
          required
          className="mt-4"
          hint="Die Vorlage für die angezeigte Nachricht. Verwende {{match}} für den gefundenen Text."
          placeholder="z.B. Fehler erkannt: {{match}}"
        />

        <div className="flex justify-end mt-8 gap-2">
          <Button2
            type="button"
            variant={Button2Variant.Secondary}
            onClick={onRequestClose}
            disabled={isPending}
          >
            Abbrechen
          </Button2>

          <Button2 type="submit" disabled={isPending}>
            {isPending ? <FaSpinner className="animate-spin" /> : <FaSave />}
            Speichern
          </Button2>
        </div>

        {state && "error" in state && (
          <Note type="error" message={state.error} className="mt-4" />
        )}
      </form>
    </Modal>
  );
};
