"use client";

import Button from "@/modules/common/components/Button";
import { createId } from "@paralleldrive/cuid2";
import { type VariantExternalLink } from "@sam-monorepo/database/browser";
import { useState } from "react";
import { FaPlus, FaTrash } from "react-icons/fa";
import { ExternalService, ExternalServiceDisplayNames } from "../types";

type ExternalLinkFields = Pick<
  VariantExternalLink,
  "id" | "serviceName" | "url"
>;

interface Props {
  readonly initialLinks?: ExternalLinkFields[];
}

/**
 * The editable external-link rows shared by the create and update variant
 * modals. Submits through the surrounding form via the
 * `linkServiceNames[]`/`linkUrls[]` fields.
 */
export const VariantExternalLinkFields = ({ initialLinks }: Props) => {
  const [externalLinks, setExternalLinks] = useState<ExternalLinkFields[]>(
    initialLinks ?? [],
  );

  return (
    <>
      <p className="mt-6">
        Externe Links <small className="text-white/40">optional</small>
      </p>
      <div className="flex flex-col gap-2 mt-2">
        {externalLinks.map((link) => (
          <div key={link.id} className="flex gap-1 items-stretch">
            <select
              className="p-2 rounded-secondary bg-neutral-900 flex-none min-w-0"
              name="linkServiceNames[]"
              defaultValue={link.serviceName}
            >
              {Object.entries(ExternalServiceDisplayNames).map(
                ([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ),
              )}
            </select>
            <input
              type="url"
              className="p-2 rounded-secondary bg-neutral-900 flex-1 min-w-0"
              name="linkUrls[]"
              placeholder="https://..."
              defaultValue={link.url}
            />
            <Button
              onClick={() =>
                setExternalLinks((prev) =>
                  prev.filter(({ id }) => id !== link.id),
                )
              }
              type="button"
              variant="tertiary"
              title="Löschen"
              iconOnly
              className="h-auto flex-none w-6"
            >
              <FaTrash />
            </Button>
          </div>
        ))}
      </div>
      <Button
        onClick={() =>
          setExternalLinks((prev) => [
            ...prev,
            {
              id: createId(),
              serviceName: ExternalService.SPVIEWER,
              url: "",
            },
          ])
        }
        type="button"
        variant="tertiary"
        className="mx-auto"
      >
        <FaPlus />
        Hinzufügen
      </Button>
    </>
  );
};
