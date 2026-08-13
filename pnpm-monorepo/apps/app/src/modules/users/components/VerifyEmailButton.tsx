"use client";

import { AsciiSpinner } from "@/modules/common/components/AsciiSpinner";
import { ConfirmActionButton } from "@/modules/common/components/ConfirmActionButton";
import { Link } from "@/modules/common/components/Link";
import { type User } from "@sam-monorepo/database/browser";
import { verifyEmailAction } from "../actions/verifyEmail";

interface Props {
  readonly className?: string;
  readonly userId: User["id"];
}

export const VerifyEmailButton = ({ className, userId }: Props) => {
  return (
    <ConfirmActionButton
      className={className}
      action={verifyEmailAction}
      hiddenFields={[{ name: "userId", value: userId }]}
      trigger={(isPending) => (
        <button
          disabled={isPending}
          className="py-2 text-brand-red-500 hover:underline flex gap-2 items-center"
          title="Datenschutzerklärung bestätigen"
        >
          {isPending && <AsciiSpinner />}
          Bestätigen
        </button>
      )}
      title="Datenschutzerklärung bestätigen?"
      description={
        <>
          Bitte stelle sicher, dass der Benutzer die{" "}
          <Link href="/privacy" className="text-brand-red-500 hover:underline">
            Datenschutzerklärung
          </Link>{" "}
          gelesen und akzeptiert hat.
        </>
      }
      confirmLabel="Bestätigen"
    />
  );
};
