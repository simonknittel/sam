"use client";

import { AsciiSpinner } from "@/modules/common/components/AsciiSpinner";
import {
  Button2,
  Button2ColorSchema,
  Button2Variant,
} from "@/modules/common/components/Button2";
import { CitizenLink } from "@/modules/common/components/CitizenLink";
import { ConfirmActionButton } from "@/modules/common/components/ConfirmActionButton";
import { RelativeDate } from "@/modules/common/components/RelativeDate";
import { formatDate } from "@/modules/common/utils/formatDate";
import type {
  OwnShareGrant,
  ShareGrantGrantee,
} from "@sam-monorepo/application";
import { DELETED_CITIZEN_LABEL, GranteeKind } from "@sam-monorepo/domain";
import { FaBan, FaGlobe, FaUsers } from "react-icons/fa";
import { revokeShareGrant } from "../../actions/revokeShareGrant";
import { formatCapabilityLabels } from "./catalogTexts";
import { useSharingPopoverAction } from "./useSharingPopoverQuery";

interface Props {
  readonly grant: OwnShareGrant;
  /** One clock for all grants of the list */
  readonly now: Date;
}

/** An active grant of the owner */
export const ShareGrantListItem = ({ grant, now }: Props) => {
  return (
    <li className="flex items-start gap-3 py-2">
      <div className="flex min-w-0 flex-1 flex-col gap-0.5 text-sm">
        <GranteeLabel grantee={grant.grantee} />

        <p className="text-neutral-400">
          {formatCapabilityLabels(grant.capabilityIds) || "Keine Daten"}
        </p>

        <p className="text-xs text-neutral-500">
          <ValidityText grant={grant} now={now} />
        </p>
      </div>

      <RevokeShareGrantButton grant={grant} />
    </li>
  );
};

interface GranteeLabelProps {
  readonly grantee: ShareGrantGrantee;
}

const GranteeLabel = ({ grantee }: GranteeLabelProps) => {
  switch (grantee.kind) {
    case GranteeKind.citizen:
      return grantee.citizen ? (
        <span className="break-words">
          <CitizenLink citizen={grantee.citizen} />
        </span>
      ) : (
        <span className="text-neutral-500">{DELETED_CITIZEN_LABEL}</span>
      );

    case GranteeKind.role: {
      const label = `Rolle ${grantee.role.name}`;

      return (
        <span className="flex min-w-0 items-center gap-1.5">
          <FaUsers aria-hidden className="flex-none text-neutral-500" />
          <span className="truncate" title={label}>
            {label}
          </span>
        </span>
      );
    }

    case GranteeKind.everyone:
      return (
        <span className="flex items-center gap-1.5">
          <FaGlobe aria-hidden className="flex-none text-neutral-500" />
          Alle
        </span>
      );

    default:
      throw new Error(`Unknown grantee kind: ${grantee satisfies never}`);
  }
};

interface ValidityTextProps {
  readonly grant: OwnShareGrant;
  readonly now: Date;
}

const ValidityText = ({ grant, now }: ValidityTextProps) => {
  if (grant.startsAt > now)
    return grant.endsAt
      ? `Startet am ${formatDate(grant.startsAt)} · endet am ${formatDate(grant.endsAt)}`
      : `Startet am ${formatDate(grant.startsAt)} · ohne Ende`;

  if (!grant.endsAt) return `Seit ${formatDate(grant.startsAt)} · ohne Ende`;

  // The list shows the active grants of its last read
  if (grant.endsAt <= now) return "Abgelaufen";

  return (
    <>
      Seit {formatDate(grant.startsAt)} · endet{" "}
      <RelativeDate date={grant.endsAt} now={now} />
    </>
  );
};

interface RevokeShareGrantButtonProps {
  readonly grant: OwnShareGrant;
}

const RevokeShareGrantButton = ({ grant }: RevokeShareGrantButtonProps) => {
  const revoke = useSharingPopoverAction(revokeShareGrant);

  return (
    <ConfirmActionButton
      className="flex-none"
      action={revoke}
      hiddenFields={[{ name: "grant_id", value: grant.id }]}
      title="Freigabe widerrufen?"
      confirmLabel="Widerrufen"
      trigger={(isPending) => (
        <Button2
          type="submit"
          variant={Button2Variant.Secondary}
          colorSchema={Button2ColorSchema.InteractionMuted}
          disabled={isPending}
        >
          {isPending ? <AsciiSpinner /> : <FaBan />}
          Widerrufen
        </Button2>
      )}
    />
  );
};
