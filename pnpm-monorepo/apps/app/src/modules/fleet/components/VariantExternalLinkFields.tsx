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
      <div className="mt-2 flex flex-col gap-2">
        {externalLinks.map((link) => (
          <div key={link.id} className="flex items-stretch gap-1">
            <select
              className="min-w-0 flex-none rounded-secondary bg-neutral-900 p-2"
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
              className="min-w-0 flex-1 rounded-secondary bg-neutral-900 p-2"
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
              className="h-auto w-6 flex-none"
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
