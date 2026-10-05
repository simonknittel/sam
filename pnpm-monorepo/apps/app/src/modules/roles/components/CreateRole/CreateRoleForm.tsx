import { ActionErrorNote } from "@/modules/actions/components/ActionErrorNote";
import { useAction } from "@/modules/actions/utils/useAction";
import { AsciiSpinner } from "@/modules/common/components/AsciiSpinner";
import { Button2 } from "@/modules/common/components/Button2";
import { TextInput } from "@/modules/common/components/form/TextInput";
import clsx from "clsx";
import { useState } from "react";
import { FaSave } from "react-icons/fa";
import { createRole } from "../../actions/createRole";
import { Suggestions } from "../Suggestions";

interface Props {
  readonly className?: string;
  readonly onSuccess?: () => void;
}

export const CreateRoleForm = ({ className, onSuccess }: Props) => {
  /** Controlled, because a click on a suggestion sets the name */
  const [name, setName] = useState("");
  const { state, isPending, submitWithoutReset } = useAction(createRole, {
    errorToast: false,
    onSuccess,
  });


  return (
    <form onSubmit={submitWithoutReset} className={clsx(className)}>
      <TextInput
        name="name"
        label="Name"
        className="mt-2"
        value={name}
        onChange={(event) => setName(event.target.value)}
        required
        autoFocus
      />

      <Suggestions className="mt-4" onClick={setName} />

      <ActionErrorNote className="mt-4" state={state} />

      <div className="mt-8 flex justify-end">
        <Button2 type="submit" disabled={isPending}>
          {isPending ? <AsciiSpinner /> : <FaSave />}
          Speichern
        </Button2>
      </div>
    </form>
  );
};
