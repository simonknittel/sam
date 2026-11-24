"use client";

import { AsciiSpinner } from "@/modules/common/components/AsciiSpinner";
import { Button2, Button2Variant } from "@/modules/common/components/Button2";
import { Tile } from "@/modules/common/components/Tile";
import { OnboardingTargetId } from "@/modules/onboarding/utils/targets";
import { type ReactNode } from "react";
import {
  FaBan,
  FaBellSlash,
  FaCheckCircle,
  FaExclamationTriangle,
} from "react-icons/fa";
import {
  useWebPushBrowser,
  WebPushBrowserStatus,
} from "./WebPushBrowserProvider";

interface StatusPresentation {
  readonly icon: ReactNode;
  readonly label: string;
  readonly description?: string;
}

const STATUS_PRESENTATIONS: Record<WebPushBrowserStatus, StatusPresentation> = {
  [WebPushBrowserStatus.Checking]: {
    icon: <AsciiSpinner className="text-neutral-500" />,
    label: "Wird geprüft …",
  },
  [WebPushBrowserStatus.Unsupported]: {
    icon: <FaExclamationTriangle className="text-yellow-500" />,
    label: "Nicht unterstützt",
    description:
      "Dieser Browser unterstützt keine Benachrichtigungen. Auf iOS-Geräten musst du das SAM zuerst zu deinem Home-Bildschirm hinzufügen und von dort öffnen.",
  },
  [WebPushBrowserStatus.Unavailable]: {
    icon: <FaExclamationTriangle className="text-yellow-500" />,
    label: "Nicht verfügbar",
    description:
      "Die Benachrichtigungen können derzeit nicht aktiviert werden. Bitte probiere es später erneut.",
  },
  [WebPushBrowserStatus.Blocked]: {
    icon: <FaBan className="text-brand-red-500" />,
    label: "Blockiert",
    description:
      "Du hast die Benachrichtigungen in diesem Browser blockiert. Erlaube sie in den Website-Einstellungen deines Browsers, um sie zu aktivieren.",
  },
  [WebPushBrowserStatus.PermissionRequired]: {
    icon: <FaBellSlash className="text-neutral-500" />,
    label: "Nicht aktiviert",
    description:
      "Um Benachrichtigungen über diesen Browser zu erhalten, musst du dies erst genehmigen.",
  },
  [WebPushBrowserStatus.Inactive]: {
    icon: <FaBellSlash className="text-neutral-500" />,
    label: "Nicht aktiviert",
    description:
      "Die Genehmigung liegt vor, aber dieser Browser erhält keine Benachrichtigungen.",
  },
  [WebPushBrowserStatus.Active]: {
    icon: <FaCheckCircle className="text-green-500" />,
    label: "Aktiviert",
    description: "Dieser Browser erhält Benachrichtigungen.",
  },
};

interface Props {
  readonly className?: string;
}

export const WebPushSubscriberClient = ({ className }: Props) => {
  const { status } = useWebPushBrowser();
  const presentation = STATUS_PRESENTATIONS[status];

  return (
    <Tile heading="Browser-Benachrichtigungen" className={className}>
      <div className="max-w-prose">
        <div data-onboarding-target={OnboardingTargetId.NotificationsEnable}>
          <p className="flex items-center gap-2 font-bold" role="status">
            {presentation.icon}
            {presentation.label}
          </p>

          {presentation.description && (
            <p className="mt-1">{presentation.description}</p>
          )}

          <StatusAction status={status} />
        </div>

        <p className="mt-4 text-sm text-neutral-500">
          Die Genehmigung muss pro Browser und Gerät angefordert werden.
        </p>
      </div>
    </Tile>
  );
};

interface StatusActionProps {
  readonly status: WebPushBrowserStatus;
}

const StatusAction = ({ status }: StatusActionProps) => {
  const { isPending, subscribe, unsubscribe } = useWebPushBrowser();

  switch (status) {
    case WebPushBrowserStatus.Checking:
    case WebPushBrowserStatus.Unsupported:
    case WebPushBrowserStatus.Unavailable:
    case WebPushBrowserStatus.Blocked:
      return null;

    case WebPushBrowserStatus.PermissionRequired:
    case WebPushBrowserStatus.Inactive:
      return (
        <Button2
          type="button"
          onClick={() => void subscribe()}
          disabled={isPending}
          variant={Button2Variant.Secondary}
          className="mt-2"
        >
          {isPending && <AsciiSpinner />}
          {status === WebPushBrowserStatus.PermissionRequired
            ? "Genehmigung anfordern"
            : "Aktivieren"}
        </Button2>
      );

    case WebPushBrowserStatus.Active:
      return (
        <>
          <Button2
            type="button"
            onClick={() => void unsubscribe()}
            disabled={isPending}
            variant={Button2Variant.Secondary}
            className="mt-2"
          >
            {isPending && <AsciiSpinner />}
            In diesem Browser deaktivieren
          </Button2>

          <p className="mt-2 text-sm text-neutral-500">
            Die Genehmigung im Browser bleibt bestehen und kann nur über dessen
            Einstellungen entzogen werden.
          </p>
        </>
      );

    default:
      throw new Error(`Unknown status: ${status satisfies never}`);
  }
};
