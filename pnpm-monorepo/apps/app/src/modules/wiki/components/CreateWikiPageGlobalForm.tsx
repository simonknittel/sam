"use client";

import { useAuthentication } from "@/modules/auth/hooks/useAuthentication";
import { usePathname } from "next/navigation";
import { CreateWikiPageForm } from "./CreateWikiPageForm";
import { WikiPageTargetsLoader } from "./WikiPageTargetsLoader";

interface Props {
  readonly onSuccess?: () => void;
}

/**
 * The create menu of the top bar is outside of each wiki scope, thus the
 * loader uses the global wiki.
 */
export const CreateWikiPageGlobalForm = ({ onSuccess }: Props) => {
  const pathname = usePathname();
  const authentication = useAuthentication();

  const allowTopLevel = Boolean(
    authentication && authentication.authorize("wiki", "create"),
  );
  const activePageId = pathname.startsWith("/app/wiki/")
    ? pathname.split("/")[3]
    : undefined;

  return (
    <WikiPageTargetsLoader>
      {(targets) => (
        <CreateWikiPageForm
          targets={targets}
          allowTopLevel={allowTopLevel}
          defaultParentId={activePageId}
          onSuccess={onSuccess}
        />
      )}
    </WikiPageTargetsLoader>
  );
};
