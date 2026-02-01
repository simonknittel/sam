import { Button2, Button2Variant } from "@/modules/common/components/Button2";
import { Link } from "@/modules/common/components/Link";
import type { Event } from "@prisma/client";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import clsx from "clsx";
import { FaDownload, FaExternalLinkAlt } from "react-icons/fa";
import { LuCalendarArrowDown } from "react-icons/lu";
import { getGoogleCalendarUrl } from "../utils/getGoogleCalendarUrl";
import { getIcsFile } from "../utils/getIcsFile";
import { getOutlookUrl } from "../utils/getOutlookUrl";

interface Props {
  readonly className?: string;
  readonly event: Event;
}

export const DownloadEventButton = ({ className, event }: Props) => {
  const googleCalendarUrl = getGoogleCalendarUrl(event);
  const microsoftOutlookUrl = getOutlookUrl(event);
  const icsFile = getIcsFile(event);

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <Button2 variant={Button2Variant.Secondary} className={clsx(className)}>
          <LuCalendarArrowDown />
          Zum eigenen Kalender hinzufügen
        </Button2>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          className="bg-neutral-800 rounded-secondary py-2"
          side="top"
          sideOffset={4}
        >
          <DropdownMenu.Item asChild>
            <Link
              href={googleCalendarUrl}
              className="text-brand-red-500 hover:underline px-3 py-1 flex gap-2 items-center"
              rel="noreferrer"
            >
              <FaExternalLinkAlt className="text-xs" />
              Google Calender
            </Link>
          </DropdownMenu.Item>

          <DropdownMenu.Item asChild>
            <Link
              href={microsoftOutlookUrl}
              className="text-brand-red-500 hover:underline px-3 py-1 flex gap-2 items-center"
              rel="noreferrer"
            >
              <FaExternalLinkAlt className="text-xs" />
              Microsoft Outlook
            </Link>
          </DropdownMenu.Item>

          <DropdownMenu.Item asChild>
            <Link
              href={icsFile}
              className="text-brand-red-500 hover:underline px-3 py-1 flex gap-2 items-center"
              rel="noreferrer"
            >
              <FaDownload className="text-xs" />
              ICS-Datei herunterladen
            </Link>
          </DropdownMenu.Item>

          <DropdownMenu.Arrow className="fill-neutral-800" />
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
};
