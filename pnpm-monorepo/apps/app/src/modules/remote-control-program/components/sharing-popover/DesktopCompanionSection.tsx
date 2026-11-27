"use client";

import { Button2, Button2Variant } from "@/modules/common/components/Button2";
import type {
  DesktopCompanionSignIn,
  OwnRuntime,
} from "@sam-monorepo/application";
import { DESKTOP_COMPANION_OPEN_URL } from "@sam-monorepo/domain";
import type { ReactNode } from "react";
import { FaUpRightFromSquare } from "react-icons/fa6";
import { ConnectedDesktopCompanionListItem } from "./ConnectedDesktopCompanionListItem";
import { DesktopCompanionSignInListItem } from "./DesktopCompanionSignInListItem";
import {
  SharingPopoverSection,
  SharingPopoverSubsection,
} from "./SharingPopoverSection";
import {
  SHARING_POPOVER_RUNTIME_TAB_LABELS,
  SharingPopoverRuntimeTab,
} from "./SharingPopoverTab";

interface Props {
  /** The state of the read of the data of the server */
  readonly serverState: ReactNode;
  /**
   * The connected desktop companions of the owner. Undefined while the data
   * of the server loads. The most recent connections first.
   */
  readonly runtimes: readonly OwnRuntime[] | undefined;
  /** Undefined while the data of the server loads. The newest first. */
  readonly signIns: readonly DesktopCompanionSignIn[] | undefined;
}

/**
 * The desktop companion comes later (step 5 of the migration). SAM has no
 * settings of it (decision 23), only the connected programs and the
 * sign-ins, for example of a test build. Each list shows only when it is not
 * empty. A browser cannot tell whether the program is on this computer, thus
 * the link that opens it (decision 37) shows only when the owner has a
 * sign-in.
 */
export const DesktopCompanionSection = ({
  serverState,
  runtimes,
  signIns,
}: Props) => {
  return (
    <SharingPopoverSection
      heading={
        SHARING_POPOVER_RUNTIME_TAB_LABELS[
          SharingPopoverRuntimeTab.DesktopCompanion
        ]
      }
    >
      <p className="text-sm text-neutral-400">
        Geplant ist die Entwicklung einer Desktop-App, die direkt auf deinem
        Rechner läuft anstatt im Browser. Dies ist technisch notwendig, um die
        neue Schnittstelle vom Star-Citizen-Game-Client mit dem SAM verbinden zu
        können. Zudem wird hierüber nun ermöglicht, die Game Logs für jene
        auszuwerten, die die Funktion im SAM bisher nicht nutzen konnten.
      </p>

      {signIns && signIns.length > 0 && <OpenDesktopCompanionLink />}

      {serverState}

      {runtimes && runtimes.length > 0 && (
        <SharingPopoverSubsection heading="Verbunden">
          <ul className="flex flex-col divide-y divide-white/10">
            {runtimes.map((runtime) => (
              <ConnectedDesktopCompanionListItem
                key={runtime.runtimeId}
                runtime={runtime}
              />
            ))}
          </ul>
        </SharingPopoverSubsection>
      )}

      {signIns && signIns.length > 0 && (
        <SharingPopoverSubsection heading="Anmeldungen">
          <ul className="flex flex-col divide-y divide-white/10">
            {signIns.map((signIn) => (
              <DesktopCompanionSignInListItem key={signIn.id} signIn={signIn} />
            ))}
          </ul>
        </SharingPopoverSubsection>
      )}
    </SharingPopoverSection>
  );
};

/** The program starts, or the copy that runs opens its window */
const OpenDesktopCompanionLink = () => (
  <div className="flex flex-col gap-1">
    <Button2
      as="a"
      href={DESKTOP_COMPANION_OPEN_URL}
      variant={Button2Variant.Secondary}
      className="self-start"
    >
      <FaUpRightFromSquare aria-hidden />
      Desktop Companion öffnen
    </Button2>
    <p className="text-xs text-neutral-500">
      Öffnet den SAM Desktop Companion auf diesem Rechner. Dein Browser fragt
      beim ersten Mal, ob er es öffnen darf.
    </p>
  </div>
);
