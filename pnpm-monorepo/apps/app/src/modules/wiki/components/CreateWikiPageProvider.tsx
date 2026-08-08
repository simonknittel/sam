"use client";

import Modal from "@/modules/common/components/Modal";
import { usePathname } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { WikiPageTargetOption } from "../utils/getWikiPageTargets";
import { getActiveWikiPageId } from "../utils/wikiPageHref";
import { CreateWikiPageForm } from "./CreateWikiPageForm";
import { useWikiPageHrefMode } from "./WikiPageHrefModeProvider";

interface CreateWikiPageContext {
  /**
   * Opens the "Neue Seite" modal. Without a parentId the currently open
   * page is preselected as parent.
   */
  readonly openCreateWikiPageModal: (parentId?: string) => void;
}

const CreateWikiPageContext = createContext<CreateWikiPageContext | undefined>(
  undefined,
);

interface Props {
  readonly children: ReactNode;
  readonly targets: WikiPageTargetOption[];
  readonly allowTopLevel: boolean;
}

export const CreateWikiPageProvider = ({
  children,
  targets,
  allowTopLevel,
}: Props) => {
  const pathname = usePathname();
  const hrefMode = useWikiPageHrefMode();
  const [openState, setOpenState] = useState<{ parentId?: string } | null>(
    null,
  );

  const openCreateWikiPageModal = useCallback(
    (parentId?: string) => {
      const activePageId = getActiveWikiPageId(hrefMode, pathname);
      setOpenState({ parentId: parentId ?? activePageId });
    },
    [pathname, hrefMode],
  );

  const value = useMemo(
    () => ({ openCreateWikiPageModal }),
    [openCreateWikiPageModal],
  );

  return (
    <CreateWikiPageContext.Provider value={value}>
      {children}

      <Modal
        isOpen={openState !== null}
        onRequestClose={() => setOpenState(null)}
        className="w-120"
        heading={<h2>Neue Seite</h2>}
      >
        <CreateWikiPageForm
          targets={targets}
          allowTopLevel={allowTopLevel}
          defaultParentId={openState?.parentId}
          onSuccess={() => setOpenState(null)}
        />
      </Modal>
    </CreateWikiPageContext.Provider>
  );
};

/**
 * Check for undefined since the defaultValue of the context is undefined. If
 * it's still undefined, the provider component is missing.
 */
export const useCreateWikiPage = () => {
  const context = useContext(CreateWikiPageContext);
  if (!context) throw new Error("[CreateWikiPageContext] Provider is missing!");
  return context;
};
