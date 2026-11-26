"use client";

import { AsciiSpinner } from "@/modules/common/components/AsciiSpinner";
import {
  Button2,
  Button2ColorSchema,
  Button2Variant,
} from "@/modules/common/components/Button2";
import { ConfirmActionButton } from "@/modules/common/components/ConfirmActionButton";
import { formatDate } from "@/modules/common/utils/formatDate";
import { formatUserAgent } from "@/modules/common/utils/formatUserAgent";
import type { DesktopCompanionSignIn } from "@sam-monorepo/application";
import { FaRightFromBracket } from "react-icons/fa6";
import { revokeDesktopCompanionSignIn } from "../../actions/revokeDesktopCompanionSignIn";
import { useSharingPopoverAction } from "./useSharingPopoverQuery";

interface Props {
  readonly signIn: DesktopCompanionSignIn;
}

/**
 * One sign-in of the desktop companion. The browser of the consent tells the
 * device, for example "Chrome 141 · Windows 10".
 */
export const DesktopCompanionSignInListItem = ({ signIn }: Props) => {
  const device =
    formatUserAgent(signIn.userAgent) ??
    signIn.userAgent ??
    "Unbekanntes Gerät";

  return (
    <li className="flex items-start gap-3 py-2">
      <div className="flex min-w-0 flex-1 flex-col gap-0.5 text-sm">
        <span className="truncate" title={signIn.userAgent ?? undefined}>
          {device}
        </span>

        <p className="text-xs text-neutral-500">
          Angemeldet am {formatDate(signIn.createdAt)} ·{" "}
          {signIn.lastUsedAt
            ? `zuletzt verwendet am ${formatDate(signIn.lastUsedAt)}`
            : "noch nicht verwendet"}
        </p>
      </div>

      <SignOutButton signIn={signIn} device={device} />
    </li>
  );
};

interface SignOutButtonProps {
  readonly signIn: DesktopCompanionSignIn;
  readonly device: string;
}

const SignOutButton = ({ signIn, device }: SignOutButtonProps) => {
  const revoke = useSharingPopoverAction(revokeDesktopCompanionSignIn);

  return (
    <ConfirmActionButton
      className="flex-none"
      action={revoke}
      hiddenFields={[{ name: "grant_id", value: signIn.id }]}
      title="Desktop Companion abmelden?"
      description={`Der Desktop Companion auf „${device}“ trennt seine Verbindung innerhalb von etwa zwei Minuten. Danach musst du dich im Programm neu anmelden.`}
      confirmLabel="Abmelden"
      trigger={(isPending) => (
        <Button2
          type="submit"
          variant={Button2Variant.Secondary}
          colorSchema={Button2ColorSchema.InteractionMuted}
          disabled={isPending}
        >
          {isPending ? <AsciiSpinner /> : <FaRightFromBracket />}
          Abmelden
        </Button2>
      )}
    />
  );
};
