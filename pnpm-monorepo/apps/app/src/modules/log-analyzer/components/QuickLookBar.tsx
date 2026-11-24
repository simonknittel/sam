"use client";

import {
  Button2,
  Button2ColorSchema,
  Button2Variant,
} from "@/modules/common/components/Button2";
import type { LogAnalyzerEntryType } from "@sam-monorepo/domain";
import clsx from "clsx";
import { useId } from "react";
import { FaXmark } from "react-icons/fa6";
import { PATTERNS } from "../utils/PATTERNS";
import { useQuickLook } from "./QuickLookContext";

interface TypeButtonProps {
  readonly type: LogAnalyzerEntryType;
}

const TypeButton = ({ type }: TypeButtonProps) => {
  const { setQuickLookTypes } = useQuickLook();
  const { title, icon: Icon } = PATTERNS[type];

  return (
    <Button2
      type="button"
      variant={Button2Variant.Secondary}
      tooltip="Aus der Schnellansicht entfernen"
      onClick={() =>
        setQuickLookTypes((previous) =>
          previous.filter((quickLookType) => quickLookType !== type),
        )
      }
    >
      <Icon />
      {title}
      <FaXmark />
    </Button2>
  );
};

interface Props {
  readonly className?: string;
}

export const QuickLookBar = ({ className }: Props) => {
  const { quickLookTypes, setQuickLookTypes } = useQuickLook();
  const headingId = useId();

  if (quickLookTypes.length <= 0) return null;

  return (
    <section
      aria-labelledby={headingId}
      className={clsx(
        "flex flex-wrap items-center gap-2 rounded-primary bg-secondary p-2",
        className,
      )}
    >
      {/* The style of the heading of the Live-Status */}
      <h2
        id={headingId}
        className="mr-2 font-mono text-sm text-white/40 uppercase"
      >
        Schnellansicht
      </h2>

      {quickLookTypes.map((type) => (
        <TypeButton key={type} type={type} />
      ))}

      <Button2
        type="button"
        variant={Button2Variant.Secondary}
        colorSchema={Button2ColorSchema.InteractionMuted}
        onClick={() => setQuickLookTypes([])}
        className="ml-auto"
      >
        Beenden
      </Button2>
    </section>
  );
};
