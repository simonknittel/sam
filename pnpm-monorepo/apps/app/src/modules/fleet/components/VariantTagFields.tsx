"use client";

import Button from "@/modules/common/components/Button";
import { createId } from "@paralleldrive/cuid2";
import { useState } from "react";
import { FaPlus, FaTrash } from "react-icons/fa";

interface TagFields {
  id: string;
  key: string;
  value: string;
}

interface Props {
  readonly initialTags?: TagFields[];
}

/**
 * The editable tag rows shared by the create and update variant modals.
 * Submits through the surrounding form via the `tagKeys[]`/`tagValues[]`
 * fields.
 */
export const VariantTagFields = ({ initialTags }: Props) => {
  const [tags, setTags] = useState<TagFields[]>(initialTags ?? []);

  return (
    <>
      <p className="mt-6">
        Tags <small className="text-white/40">optional</small>
      </p>
      <div className="flex flex-col gap-2 mt-2">
        {tags.map((tag) => (
          <div key={tag.id} className="flex gap-1 items-stretch">
            <input
              type="text"
              className="p-2 rounded-secondary bg-neutral-900 flex-1 min-w-0"
              name="tagKeys[]"
              placeholder="Key"
              defaultValue={tag.key}
              autoFocus={Boolean(!tag.key)}
            />
            <input
              type="text"
              className="p-2 rounded-secondary bg-neutral-900 flex-1 min-w-0"
              name="tagValues[]"
              placeholder="Value"
              defaultValue={tag.value}
            />
            <Button
              onClick={() =>
                setTags((prev) => prev.filter(({ id }) => id !== tag.id))
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
          setTags((prev) => [...prev, { id: createId(), key: "", value: "" }])
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
