"use client";

import { Button2, Button2Variant } from "@/modules/common/components/Button2";
import type { Variant } from "@sam-monorepo/database/browser";
import clsx from "clsx";
import { useId, useState } from "react";
import { FaBookOpen, FaLink, FaPlus } from "react-icons/fa";
import { CreateVariantWikiPageModal } from "./CreateVariantWikiPageModal";
import { LinkVariantWikiPageModal } from "./LinkVariantWikiPageModal";

enum PromptModal {
  Link = "link",
  Create = "create",
}

interface Props {
  readonly className?: string;
  readonly variant: Pick<Variant, "id" | "name">;
  /** Whether the actor can create a page at the top of the global wiki */
  readonly allowTopLevel: boolean;
}

/**
 * Asks a manager of the ship catalog to link a wiki page to a variant that
 * has none: an existing page, or a new page
 */
export const VariantWikiPagePrompt = ({
  className,
  variant,
  allowTopLevel,
}: Props) => {
  const headingId = useId();
  const [openModal, setOpenModal] = useState<PromptModal | null>(null);
  const closeModal = () => setOpenModal(null);

  return (
    <section
      aria-labelledby={headingId}
      className={clsx(
        className,
        "flex flex-col gap-4 rounded-primary bg-secondary p-4 sm:flex-row sm:items-center",
      )}
    >
      <FaBookOpen className="hidden shrink-0 text-2xl text-neutral-500 sm:block" />

      <div className="flex-1">
        <h2 id={headingId} className="font-bold">
          Diese Variante hat noch keine Wiki-Seite
        </h2>
        <p className="text-sm text-neutral-400">
          Verknüpfe eine bestehende Seite oder erstelle eine neue. Die Seite
          erscheint dann mit ihren Unterseiten hier auf der Variantenseite.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button2
          type="button"
          variant={Button2Variant.Secondary}
          onClick={() => setOpenModal(PromptModal.Link)}
        >
          <FaLink />
          Seite verknüpfen
        </Button2>

        <Button2 type="button" onClick={() => setOpenModal(PromptModal.Create)}>
          <FaPlus />
          Neue Seite
        </Button2>
      </div>

      {openModal === PromptModal.Link && (
        <LinkVariantWikiPageModal
          variantId={variant.id}
          onRequestClose={closeModal}
        />
      )}

      {openModal === PromptModal.Create && (
        <CreateVariantWikiPageModal
          variant={variant}
          allowTopLevel={allowTopLevel}
          onRequestClose={closeModal}
        />
      )}
    </section>
  );
};
