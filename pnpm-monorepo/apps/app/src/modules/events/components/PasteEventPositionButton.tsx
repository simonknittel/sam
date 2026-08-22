"use client";

import { useAction } from "@/modules/actions/utils/useAction";
import { AsciiSpinner } from "@/modules/common/components/AsciiSpinner";
import Button from "@/modules/common/components/Button";
import { Popover, usePopover } from "@/modules/common/components/Popover";
import type { EventPosition } from "@sam-monorepo/database/browser";
import clsx from "clsx";
import { FaPaste } from "react-icons/fa";
import { pasteEventPosition } from "../actions/pasteEventPosition";
import { EventContainerKind } from "../utils/eventContainer";
import { canPasteSubtree, MAX_LINEUP_DEPTH } from "../utils/positionTree";
import {
  useLineupClipboard,
  type LineupClipboardEntry,
} from "./LineupClipboardContext";
import { useLineupOrder } from "./LineupOrderContext/Context";

interface Props {
  readonly className?: string;
  readonly position: EventPosition;
  readonly groupLevel: number;
}

export const PasteEventPositionButton = ({
  className,
  position,
  groupLevel,
}: Props) => {
  const { clipboard } = useLineupClipboard();

  if (!clipboard) return null;

  const label = `„${clipboard.positionName}“ einfügen`;

  return (
    /**
     * The popover opens on hover and already names the copied position, so this
     * button gets no additional tooltip.
     */
    <Popover
      enableHover
      trigger={
        <Button
          type="button"
          variant="tertiary"
          className={clsx("px-2 w-auto", className)}
          aria-label={label}
          iconOnly
        >
          <FaPaste className="text-lg" />
        </Button>
      }
      childrenClassName="w-64"
    >
      <PasteMenu
        clipboard={clipboard}
        position={position}
        groupLevel={groupLevel}
      />
    </Popover>
  );
};

interface PasteMenuProps {
  readonly clipboard: LineupClipboardEntry;
  readonly position: EventPosition;
  readonly groupLevel: number;
}

const TOO_DEEP_TITLE = "Der Posten würde zu tief verschachtelt werden.";

/** Names where a copied position came from when that isn't the lineup at hand */
const getOriginHint = (
  source: LineupClipboardEntry["container"],
  target: LineupClipboardEntry["container"],
) => {
  if (source.kind === target.kind && source.id === target.id) return null;

  return source.kind === EventContainerKind.Template
    ? "Aus einer Vorlage kopiert. "
    : "Aus einem anderen Event kopiert. ";
};

const PasteMenu = ({ clipboard, position, groupLevel }: PasteMenuProps) => {
  const { clear } = useLineupClipboard();
  const { container } = useLineupOrder();
  const { closePopover } = usePopover();
  const { isPending, formAction } = useAction(pasteEventPosition, {
    onSuccess: closePopover,
  });

  const canPasteAfter = canPasteSubtree(groupLevel - 1, clipboard.subtreeDepth);
  const canPasteInside = canPasteSubtree(groupLevel, clipboard.subtreeDepth);

  const handleClear = () => {
    clear();
    closePopover();
  };

  return (
    <form action={formAction} className="flex flex-col gap-2">
      <input
        type="hidden"
        name="sourcePositionId"
        value={clipboard.positionId}
      />
      <input type="hidden" name="targetPositionId" value={position.id} />

      <h3 className="text-white/40 font-mono uppercase text-xs">
        Zwischenablage
      </h3>

      <p className="font-bold truncate" title={clipboard.positionName}>
        {clipboard.positionName}
      </p>

      <p className="text-neutral-500 text-sm">
        {getOriginHint(clipboard.container, container)}
        Zugewiesene Citizen und Bewerbungen werden nicht mitkopiert.
      </p>

      <Button
        type="submit"
        name="placement"
        value="after"
        variant="tertiary"
        disabled={isPending || !canPasteAfter}
        title={canPasteAfter ? undefined : TOO_DEEP_TITLE}
        className="mt-2 justify-start"
      >
        {isPending ? <AsciiSpinner /> : <FaPaste />}
        Danach einfügen
      </Button>

      <Button
        type="submit"
        name="placement"
        value="inside"
        variant="tertiary"
        disabled={isPending || !canPasteInside}
        title={canPasteInside ? undefined : TOO_DEEP_TITLE}
        className="justify-start"
      >
        {isPending ? <AsciiSpinner /> : <FaPaste />}
        In diese Gruppe einfügen
      </Button>

      {(!canPasteAfter || !canPasteInside) && (
        <p className="text-sm">
          Ausgegraute Optionen: Es sind maximal {MAX_LINEUP_DEPTH} Ebenen
          erlaubt.
        </p>
      )}

      <button
        type="button"
        onClick={handleClear}
        className="text-brand-red-500 hover:text-brand-red-300 focus-visible:text-brand-red-300 hover:underline focus-visible:underline hover:cursor-pointer text-sm self-start mt-2"
      >
        Zwischenablage leeren
      </button>
    </form>
  );
};
