"use client";

import { useAction } from "@/modules/actions/utils/useAction";
import { AsciiSpinner } from "@/modules/common/components/AsciiSpinner";
import Button from "@/modules/common/components/Button";
import { api } from "@/trpc/react";
import type { GenericCitizenLogType } from "@/types";
import { type Citizen } from "@sam-monorepo/database/browser";
import { FaSave } from "react-icons/fa";
import { createCitizenLog } from "../../actions/createCitizenLog";

interface Props {
  readonly type: GenericCitizenLogType;
  readonly entity: Pick<Citizen, "id">;
}

export const Create = ({ type, entity }: Props) => {
  const utils = api.useUtils();
  const { formAction, isPending, getDefaultValueWithFallback } = useAction(
    createCitizenLog,
    {
      /** The history in the modal is a client query, which the refresh skips */
      onSuccess: () =>
        void utils.citizenLog.getHistory.invalidate({
          type,
          citizenId: entity.id,
        }),
    },
  );

  return (
    <form action={formAction} className="flex">
      <input type="hidden" name="citizenId" value={entity.id} />
      <input type="hidden" name="type" value={type} />

      <input
        className="flex-1 rounded-l bg-neutral-900 p-2"
        name="content"
        aria-label="Neuer Eintrag"
        defaultValue={getDefaultValueWithFallback("content", "")}
        required
        autoFocus
        placeholder="Neuer Eintrag ..."
      />

      <Button
        type="submit"
        disabled={isPending}
        className="rounded-l-none"
        title="Speichern"
      >
        {isPending ? <AsciiSpinner /> : <FaSave />}
      </Button>
    </form>
  );
};
