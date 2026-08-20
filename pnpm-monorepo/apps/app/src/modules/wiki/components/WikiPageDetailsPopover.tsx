"use client";

import { AsciiSpinner } from "@/modules/common/components/AsciiSpinner";
import { CitizenLink } from "@/modules/common/components/CitizenLink";
import { Link } from "@/modules/common/components/Link";
import { PopoverBaseUI } from "@/modules/common/components/PopoverBaseUI";
import { formatDate } from "@/modules/common/utils/formatDate";
import { api } from "@/trpc/react";
import type { WikiPage } from "@sam-monorepo/database/browser";
import { useCallback, useState, type ReactNode } from "react";
import { BsExclamationOctagonFill } from "react-icons/bs";
import { FaInfoCircle } from "react-icons/fa";

interface DetailRowProps {
  readonly label: string;
  readonly children: ReactNode;
}

const DetailRow = ({ label, children }: DetailRowProps) => {
  return (
    <>
      <dt className="font-mono uppercase text-xs text-white/40">{label}</dt>
      <dd className="text-sm break-words">{children}</dd>
    </>
  );
};

interface Props {
  readonly pageId: WikiPage["id"];
}

/**
 * Details of the page shown in the header, next to the condensed metadata
 * line. Everything is fetched on open so the wiki context — which loads all
 * pages for the tree — doesn't have to carry it.
 */
export const WikiPageDetailsPopover = ({ pageId }: Props) => {
  const [isEnabled, setIsEnabled] = useState(false);
  const { isPending, data, error } = api.wiki.getPageDetails.useQuery(
    { pageId },
    {
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      enabled: isEnabled,
    },
  );

  const handleOpenChange = useCallback((open: boolean) => {
    if (open) setIsEnabled(true);
  }, []);

  return (
    <PopoverBaseUI
      title="Seitendetails"
      trigger={
        <span
          aria-label="Details anzeigen"
          className="cursor-pointer text-white/20 transition-colors hover:text-white/60 active:text-white/80 motion-reduce:transition-none"
        >
          <FaInfoCircle className="align-[-0.125em]" />
        </span>
      }
      onOpenChange={handleOpenChange}
      childrenClassName="w-[400px]"
      side="bottom"
      align="start"
    >
      {isPending && (
        <p className="font-mono uppercase flex gap-2 justify-center items-center animate-pulse">
          <AsciiSpinner />
          Details werden geladen...
        </p>
      )}

      {error && (
        <p className="font-mono uppercase flex gap-2 justify-center items-center text-red-500">
          <BsExclamationOctagonFill className="text-red-800" />
          Fehler beim Laden der Details
        </p>
      )}

      {data && (
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 items-baseline">
          <DetailRow label="Titel">{data.title}</DetailRow>

          {data.owner && (
            <DetailRow label="Besitzer">
              <CitizenLink citizen={data.owner} />

              {data.ownerInheritedFrom && (
                <span className="text-white/40">
                  {" ("}
                  geerbt von{" "}
                  <Link
                    href={`/app/wiki/${data.ownerInheritedFrom.id}/${data.ownerInheritedFrom.slug}`}
                    className="text-interaction-500 hover:underline focus-visible:underline"
                    prefetch={false}
                  >
                    {data.ownerInheritedFrom.title}
                  </Link>
                  {")"}
                </span>
              )}
            </DetailRow>
          )}

          {data.createdBy && (
            <DetailRow label="Erstellt von">
              <CitizenLink citizen={data.createdBy} />
            </DetailRow>
          )}

          <DetailRow label="Erstellt am">
            {formatDate(data.createdAt)}
          </DetailRow>

          {data.updatedBy && (
            <DetailRow label="Geändert von">
              <CitizenLink citizen={data.updatedBy} />
            </DetailRow>
          )}

          <DetailRow label="Geändert am">
            {formatDate(data.updatedAt)}
          </DetailRow>
        </dl>
      )}
    </PopoverBaseUI>
  );
};
