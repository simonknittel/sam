"use client";

import { useAuthentication } from "@/modules/auth/hooks/useAuthentication";
import { AsciiSpinner } from "@/modules/common/components/AsciiSpinner";
import { api } from "@/modules/common/utils/api";
import { usePathname } from "next/navigation";
import { CreateWikiPageForm } from "./CreateWikiPageForm";

interface Props {
  readonly onSuccess?: () => void;
}

/**
 * Self-sufficient variant of the create-page form for the global create
 * menu (top bar "Neu"): fetches the eligible parent pages itself.
 */
export const CreateWikiPageGlobalForm = ({ onSuccess }: Props) => {
  const pathname = usePathname();
  const authentication = useAuthentication();

  const { isPending, data } = api.wiki.getPageTargets.useQuery(undefined, {
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  if (isPending || !data)
    return (
      <div className="flex justify-center items-center p-8">
        <AsciiSpinner className="text-5xl text-neutral-500" />
      </div>
    );

  const allowTopLevel = Boolean(
    authentication && authentication.authorize("wiki", "create"),
  );
  const activePageId = pathname.startsWith("/app/wiki/")
    ? pathname.split("/")[3]
    : undefined;

  return (
    <CreateWikiPageForm
      targets={data}
      allowTopLevel={allowTopLevel}
      defaultParentId={activePageId}
      onSuccess={onSuccess}
    />
  );
};
