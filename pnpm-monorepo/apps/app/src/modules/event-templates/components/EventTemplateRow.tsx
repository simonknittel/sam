"use client";

import { CitizenLink } from "@/modules/common/components/CitizenLink";
import { Link } from "@/modules/common/components/Link";
import { SmallBadge } from "@/modules/common/components/SmallBadge";
import { TRow } from "@/modules/common/components/Table";
import { formatDate } from "@/modules/common/utils/formatDate";
import type { EventTemplateListEntry } from "../queries/getEventTemplates";
import { getEventTemplatePath } from "../utils/eventTemplateConstraints";
import { DuplicateEventTemplateButton } from "./DuplicateEventTemplateButton";
import { RestoreEventTemplateButton } from "./RestoreEventTemplateButton";
import { UseEventTemplateButton } from "./UseEventTemplateButton";

interface Props {
  readonly entry: EventTemplateListEntry;
  /** The owner column only exists for viewers who see foreign templates */
  readonly showOwner: boolean;
  /** Using and duplicating both end in a create the viewer may not do */
  readonly canCreate: boolean;
}

export const EventTemplateRow = ({ entry, showOwner, canCreate }: Props) => {
  const { template, permissions } = entry;
  const isShared = template.roleAccess.length > 0;

  return (
    <TRow className="py-2">
      {/* Stretched so the link's `after` below covers the cell's full height */}
      <td className="relative flex min-w-0 flex-col justify-center self-stretch">
        <Link
          href={getEventTemplatePath(template.id)}
          title={template.name}
          /* `after` turns the whole cell — deletion note and padding included — into the hit target */
          className="block truncate text-interaction-500 after:absolute after:inset-0 hover:underline focus-visible:underline active:text-interaction-300"
        >
          {template.name}
        </Link>

        {template.deletedAt && (
          <span className="text-xs text-neutral-500">
            Gelöscht am {formatDate(template.deletedAt)}
          </span>
        )}
      </td>

      {showOwner && (
        <td className="min-w-0 text-sm">
          <CitizenLink citizen={template.ownedBy} className="truncate" />
        </td>
      )}

      <td className="min-w-0 text-sm">
        <SmallBadge value={isShared ? "Geteilt" : "Persönlich"} />
      </td>

      <td className="min-w-0 text-sm">
        <span className="block">{formatDate(template.updatedAt)}</span>
        <CitizenLink citizen={template.updatedBy} className="truncate" />
      </td>

      <td className="flex items-center gap-1">
        {template.deletedAt
          ? permissions.canManage && (
              <RestoreEventTemplateButton
                templateId={template.id}
                name={template.name}
              />
            )
          : canCreate && (
              <>
                <UseEventTemplateButton templateId={template.id} />

                <DuplicateEventTemplateButton
                  templateId={template.id}
                  name={template.name}
                />
              </>
            )}
      </td>
    </TRow>
  );
};
