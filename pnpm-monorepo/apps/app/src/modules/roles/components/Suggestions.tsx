"use client";

import Button from "@/modules/common/components/Button";
import { Tooltip } from "@/modules/common/components/Tooltip";
import clsx from "clsx";
import { FaInfoCircle } from "react-icons/fa";
import { FiRefreshCcw } from "react-icons/fi";
import { RiBardFill } from "react-icons/ri";
import { api } from "../../../trpc/react";

interface Props {
  readonly className?: string;
  readonly onClick?: (roleName: string) => void;
}

export const Suggestions = ({ className, onClick }: Props) => {
  const suggestions = api.ai.getRoleNameSuggestions.useQuery(undefined, {
    retry: 2,
  });

  return (
    <>
      <div className={clsx(className, "flex items-center gap-2")}>
        <p className="flex items-center gap-2 font-bold">
          <RiBardFill /> Vorschläge
        </p>

        {suggestions.data?.prompt && (
          <div className="relative z-10 flex items-center">
            <Tooltip
              triggerChildren={<FaInfoCircle />}
              contentClassName="max-w-160"
            >
              <p>
                Diese Vorschläge wurden mit Hilfe von GPT-4 basierend auf
                folgenden Prompts generiert:
              </p>

              <p className="mt-2">
                <span className="font-bold">System:</span>{" "}
                {suggestions.data.prompt.system}
              </p>

              <p className="mt-2">
                <span className="font-bold">User:</span>{" "}
                {suggestions.data.prompt.user}
              </p>
            </Tooltip>
          </div>
        )}
      </div>

      <div className="mt-2 flex flex-wrap gap-2">
        {suggestions.data ? (
          <>
            {suggestions.data.roleNames.map((roleName) => (
              <button
                key={roleName}
                className={clsx(
                  "flex items-center gap-2 rounded-secondary bg-neutral-700 px-2 py-1 whitespace-nowrap transition-colors enabled:hover:bg-neutral-600",
                  {
                    "animate-pulse": suggestions.isFetching,
                  },
                )}
                disabled={suggestions.isFetching}
                onClick={() => onClick?.(roleName)}
              >
                {roleName}
              </button>
            ))}

            <Button
              variant="tertiary"
              onClick={() => suggestions.refetch()}
              disabled={suggestions.isFetching}
            >
              <FiRefreshCcw
                className={clsx({
                  "animate-spin": suggestions.isFetching,
                })}
              />
              Weitere generieren
            </Button>
          </>
        ) : (
          <>
            <div className="h-8 w-32 animate-pulse rounded-secondary bg-neutral-700" />
            <div className="h-8 w-48 animate-pulse rounded-secondary bg-neutral-700" />
            <div className="h-8 w-24 animate-pulse rounded-secondary bg-neutral-700" />
            <div className="h-8 w-24 animate-pulse rounded-secondary bg-neutral-700" />
            <div className="h-8 w-32 animate-pulse rounded-secondary bg-neutral-700" />
          </>
        )}
      </div>
    </>
  );
};
