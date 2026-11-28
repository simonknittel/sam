import { Button2Variant } from "@/modules/common/components/Button2";
import {
  getSharingPopoverLocationLabel,
  SharingPopoverRuntimeTab,
  SharingPopoverTab,
} from "@/modules/remote-control-program/components/sharing-popover/SharingPopoverTab";
import { FaCheck, FaTimes } from "react-icons/fa";
import { approveAuthorization } from "../actions/approveAuthorization";
import { denyAuthorization } from "../actions/denyAuthorization";
import { ConsentDecisionForm } from "./ConsentDecisionForm";

interface Props {
  readonly parameters: Readonly<Record<string, string>>;
}

/**
 * The consent of the desktop companion: what the program can do. It has no
 * name and no tools, unlike the consent of an MCP client.
 */
export const DesktopCompanionConsentDecision = ({ parameters }: Props) => (
  <>
    <div className="flex flex-col gap-2 rounded-secondary bg-neutral-800/50 p-3 text-sm">
      <p>Mit deiner Erlaubnis kann der Desktop Companion:</p>

      <ul className="flex list-disc flex-col gap-1 pl-5">
        <li>sich als Runtime mit dem Remote Control Program verbinden</li>
        <li>Daten hochladen, die du im SAM Desktop Companion einschaltest</li>
      </ul>

      <p className="text-neutral-500">
        Die Anmeldung kannst du jederzeit im Remote Control Program unter{" "}
        {getSharingPopoverLocationLabel({
          tab: SharingPopoverTab.Runtimes,
          runtimeTab: SharingPopoverRuntimeTab.DesktopCompanion,
        })}{" "}
        beenden.
      </p>
    </div>

    <div className="flex flex-wrap justify-end gap-2">
      <ConsentDecisionForm
        action={denyAuthorization}
        fields={parameters}
        variant={Button2Variant.Secondary}
        icon={<FaTimes />}
      >
        Ablehnen
      </ConsentDecisionForm>

      <ConsentDecisionForm
        action={approveAuthorization}
        fields={parameters}
        icon={<FaCheck />}
      >
        Erlauben
      </ConsentDecisionForm>
    </div>
  </>
);
