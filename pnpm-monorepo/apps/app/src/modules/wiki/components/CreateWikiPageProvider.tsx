"use client";

import Modal from "@/modules/common/components/Modal";
import type { EventContainer } from "@/modules/events/utils/eventContainer";
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
import {
  parseWikiClipboardCookie,
  serializeWikiClipboardClearCookie,
  type WikiClipboardEntry,
} from "../utils/wikiClipboardCookie";
import { getActiveWikiPageId } from "../utils/wikiPageHref";
import { CreateWikiPageForm } from "./CreateWikiPageForm";
import { PasteWikiPagesSection } from "./PasteWikiPagesSection";
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

interface OpenState {
  readonly parentId?: string;
  /** Clipboard cookie at open time; null renders the plain create form */
  readonly clipboard: WikiClipboardEntry | null;
}

interface Props {
  readonly children: ReactNode;
  readonly targets: WikiPageTargetOption[];
  readonly allowTopLevel: boolean;
  /** Set inside a briefing — scopes the form's "copy from" options */
  readonly container?: EventContainer;
}

export const CreateWikiPageProvider = ({
  children,
  targets,
  allowTopLevel,
  container,
}: Props) => {
  const pathname = usePathname();
  const hrefMode = useWikiPageHrefMode();
  const [openState, setOpenState] = useState<OpenState | null>(null);

  const openCreateWikiPageModal = useCallback(
    (parentId?: string) => {
      const activePageId = getActiveWikiPageId(hrefMode, pathname);
      setOpenState({
        parentId: parentId ?? activePageId,
        clipboard: parseWikiClipboardCookie(document.cookie),
      });
    },
    [pathname, hrefMode],
  );

  const value = useMemo(
    () => ({ openCreateWikiPageModal }),
    [openCreateWikiPageModal],
  );

  const discardClipboard = () => {
    document.cookie = serializeWikiClipboardClearCookie();
    setOpenState((state) => (state ? { ...state, clipboard: null } : state));
  };

  return (
    <CreateWikiPageContext.Provider value={value}>
      {children}

      <Modal
        isOpen={openState !== null}
        onRequestClose={() => setOpenState(null)}
        className="w-120"
        heading={<h2>Neue Seite</h2>}
      >
        {openState?.clipboard && (
          <>
            <PasteWikiPagesSection
              clipboard={openState.clipboard}
              targets={targets}
              allowTopLevel={allowTopLevel}
              defaultParentId={openState.parentId}
              onDiscard={discardClipboard}
              onSuccess={() => setOpenState(null)}
            />

            <div
              className="my-4 flex items-center gap-4 text-sm text-neutral-500"
              aria-hidden
            >
              <hr className="flex-1 border-white/5" />
              oder neue Seite erstellen
              <hr className="flex-1 border-white/5" />
            </div>
          </>
        )}

        <CreateWikiPageForm
          targets={targets}
          allowTopLevel={allowTopLevel}
          defaultParentId={openState?.parentId}
          container={container}
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
